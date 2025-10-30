"use client";

import { useRef , useState, useMemo, useEffect} from 'react';
import { Chess , type Square} from 'chess.js';
import { Chessboard, type PieceDropHandlerArgs, type SquareHandlerArgs} from 'react-chessboard';
import Engine from '@/lib/engine';

export default function ChessboardComp({ matein }: { matein: 'm3' | 'm6' | 'm9' | 'm12' | 'm15' }) {

// initialise the engine
const engine = useMemo(() => new Engine(), []);
// create a chess game using a ref to always have access to the latest game state within closures and maintain the game state across renders
const chessGameRef = useRef(new Chess());
const chessGame = chessGameRef.current;

// track the current position of the chess game in state to trigger a re-render of the chessboard
const [chessPosition, setChessPosition] = useState(chessGame.fen());
const [moveFrom, setMoveFrom] = useState('');
const [optionSquares, setOptionSquares] = useState({});

// engine-related UI state
const [positionEvaluation, setPositionEvaluation] = useState(0);
const [bestLine, setBestLine] = useState('');
const [possibleMate, setPossibleMate] = useState('');
const [searchDepth, setSearchDepth] = useState(18);
const [playerToMate, setPlayerToMate] = useState<'white' | 'black' | ''>('');

// load a FEN based on the matein prop (m3, m6, m9, m12, m15)
useEffect(() => {
  let isCancelled = false;

  async function loadFenForMatein() {
    try {
      // stop any ongoing engine search before changing positions
      engine.stop();

      const response = await fetch(`/api/pgn/${matein}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const fenFromApi = data?.fen as string | undefined;
      const playerField = data?.player_to_mate as 'white' | 'black' | undefined;
      if (!fenFromApi) return;

      if (isCancelled) return;
      try {
        chessGame.load(fenFromApi);
        setChessPosition(chessGame.fen());
        // reset UI hints for new position
        setMoveFrom('');
        setOptionSquares({});
        setBestLine('');
        setPossibleMate('');
        if (playerField === 'white' || playerField === 'black') {
          setPlayerToMate(playerField);
        } else {
          setPlayerToMate('');
        }
      } catch {
        // ignore invalid FEN
      }
    } catch {
      // silently ignore fetch/load errors
    }
  }

  loadFenForMatein();
  return () => {
    isCancelled = true;
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [matein]);

// ask Stockfish for best move and play it
function makeBestMove() {
  if (chessGame.isGameOver() || chessGame.isDraw()) return;
  // Ensure we never move on behalf of the human (playerToMate)
  const humanColor = playerToMate === 'white' ? 'w' : playerToMate === 'black' ? 'b' : 'w';
  const engineColor = humanColor === 'w' ? 'b' : 'w';
  if (chessGame.turn() !== engineColor) return;
  // start/refresh evaluation for the current position
  try { engine.stop(); } catch {}
  engine.evaluatePosition(chessGame.fen(), searchDepth);
  engine.onMessage(({ bestMove, positionEvaluation: evalCp, pv, depth, possibleMate: mate }) => {
    // accept only reasonably deep lines
    if (depth && depth < 10) return;
    if (typeof evalCp !== 'undefined') {
      // store raw engine evaluation (from side-to-move perspective) in pawns
      setPositionEvaluation(Number(evalCp) / 100);
    }
    if (typeof mate !== 'undefined') setPossibleMate(mate);
    if (typeof pv !== 'undefined') setBestLine(pv);
    if (bestMove) {
      // Guard again: only execute move if it is STILL engine's turn
      const currentHumanColor = playerToMate === 'white' ? 'w' : playerToMate === 'black' ? 'b' : 'w';
      const currentEngineColor = currentHumanColor === 'w' ? 'b' : 'w';
      if (chessGame.turn() !== currentEngineColor) {
        return;
      }
      const from = bestMove.slice(0, 2) as Square;
      const to = bestMove.slice(2, 4) as Square;
      try {
        chessGame.move({ from, to, promotion: 'q' });
        setChessPosition(chessGame.fen());
        // once we play, stop current search session
        engine.stop();
      } catch {
        // ignore illegal bestmove (shouldn't happen)
      }
    }
  });
}

// keep engine suggesting best move whenever position changes and it's engine's turn
useEffect(() => {
  // if it's the engine's turn (after a player move), calculate and play
  // Human plays the side indicated by playerToMate; engine plays the opposite
  const humanColor = playerToMate === 'white' ? 'w' : playerToMate === 'black' ? 'b' : 'w';
  const engineColor = humanColor === 'w' ? 'b' : 'w';
  if (!chessGame.isGameOver() && !chessGame.isDraw() && chessGame.turn() === engineColor) {
    // slight delay for UX
    const id = setTimeout(makeBestMove, 300);
    return () => clearTimeout(id);
  }
}, [chessPosition, playerToMate]);

// Always update numeric evaluation for the current position (even when it's human's turn)
useEffect(() => {
  const humanColor = playerToMate === 'white' ? 'w' : playerToMate === 'black' ? 'b' : 'w';
  const engineColor = humanColor === 'w' ? 'b' : 'w';
  // When it's engine's turn, makeBestMove will already evaluate; avoid doubling
  if (chessGame.turn() === engineColor) return;

  try {
    engine.stop();
  } catch {}
  engine.evaluatePosition(chessGame.fen(), searchDepth);
  engine.onMessage(({ positionEvaluation: evalCp, depth, possibleMate: mate }) => {
    if (typeof evalCp !== 'undefined') {
      setPositionEvaluation(Number(evalCp) / 100);
    }
    if (typeof mate !== 'undefined') setPossibleMate(mate);
    if (depth && depth >= 10) {
      engine.stop();
    }
  });
}, [chessPosition, playerToMate]);

// get the move options for a square to show valid moves
function getMoveOptions(square: Square) {
  // get the moves for the square
  const moves = chessGame.moves({
    square,
    verbose: true
  });

  // if no moves, clear the option squares
  if (moves.length === 0) {
    setOptionSquares({});
    return false;
  }

  // create a new object to store the option squares
  const newSquares: Record<string, React.CSSProperties> = {};

  // loop through the moves and set the option squares
  for (const move of moves) {
    newSquares[move.to] = {
      background: chessGame.get(move.to) && chessGame.get(move.to)?.color !== chessGame.get(square)?.color ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)' // larger circle for capturing
      : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
      // smaller circle for moving
      borderRadius: '50%'
    };
  }

  // set the square clicked to move from to yellow
  newSquares[square] = {
    background: 'rgba(255, 255, 0, 0.4)'
  };

  // set the option squares
  setOptionSquares(newSquares);

  // return true to indicate that there are move options
  return true;
}
function onSquareClick({
  square,
  piece
}: SquareHandlerArgs) {
  // piece clicked to move
  if (!moveFrom && piece) {
    // get the move options for the square
    const hasMoveOptions = getMoveOptions(square as Square);

    // if move options, set the moveFrom to the square
    if (hasMoveOptions) {
      setMoveFrom(square);
    }

    // return early
    return;
  }

  // square clicked to move to, check if valid move
  const moves = chessGame.moves({
    square: moveFrom as Square,
    verbose: true
  });
  const foundMove = moves.find(m => m.from === moveFrom && m.to === square);

  // not a valid move
  if (!foundMove) {
    // check if clicked on new piece
    const hasMoveOptions = getMoveOptions(square as Square);

    // if new piece, setMoveFrom, otherwise clear moveFrom
    setMoveFrom(hasMoveOptions ? square : '');

    // return early
    return;
  }

  // is normal move
  try {
    chessGame.move({
      from: moveFrom,
      to: square,
      promotion: 'q'
    });
  } catch {
    // if invalid, setMoveFrom and getMoveOptions
    const hasMoveOptions = getMoveOptions(square as Square);

    // if new piece, setMoveFrom, otherwise clear moveFrom
    if (hasMoveOptions) {
      setMoveFrom(square);
    }

    // return early
    return;
  }

  // update the position state
  setChessPosition(chessGame.fen());

  // engine responds with best move shortly after player's move
  {
    const humanColor = playerToMate === 'white' ? 'w' : playerToMate === 'black' ? 'b' : 'w';
    const engineColor = humanColor === 'w' ? 'b' : 'w';
    if (chessGame.turn() === engineColor) setTimeout(makeBestMove, 150);
  }

  // clear moveFrom and optionSquares
  setMoveFrom('');
  setOptionSquares({});
}

// handle piece drop
function onPieceDrop({
  sourceSquare,
  targetSquare
}: PieceDropHandlerArgs) {
  // type narrow targetSquare potentially being null (e.g. if dropped off board)
  if (!targetSquare) {
    return false;
  }

  // try to make the move according to chess.js logic
  try {
    chessGame.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q' // always promote to a queen for example simplicity
    });

    // update the position state upon successful move to trigger a re-render of the chessboard
    setChessPosition(chessGame.fen());

    // clear moveFrom and optionSquares
    setMoveFrom('');
    setOptionSquares({});

    // engine responds with best move shortly after player's move
    {
      const humanColor = playerToMate === 'white' ? 'w' : playerToMate === 'black' ? 'b' : 'w';
      const engineColor = humanColor === 'w' ? 'b' : 'w';
      if (chessGame.turn() === engineColor) setTimeout(makeBestMove, 150);
    }

    // return true as the move was successful
    return true;
  } catch {
    // return false as the move was not successful
    return false;
  }
}

// set the chessboard options
const chessboardOptions = {
  onPieceDrop,
  onSquareClick,
  position: chessPosition,
  squareStyles: optionSquares,
  id: 'click-or-drag-to-move'
};

// render the chessboard centered with constrained size to avoid overflow
return (
  <div className="w-full flex items-center justify-center">
    <div className="w-[min(90vw,80vh,520px)]">
      <div className="mb-2 flex items-center justify-between">
        {playerToMate && (
          <div className="text-sm text-slate-700">
            {(playerToMate === 'white' ? 'White' : 'Black') + ' to move'}
          </div>
        )}
        {(() => {
          const whiteAdv = (chessGame.turn() === 'w' ? 1 : -1) * positionEvaluation;
          const label = possibleMate ? `M${possibleMate}` : `${whiteAdv >= 0 ? '+' : ''}${whiteAdv.toFixed(2)}`;
          return (
            <div className="text-sm font-medium text-slate-800" aria-label="position-evaluation">
              {label}
            </div>
          );
        })()}
      </div>
      <div className="aspect-square">
        <Chessboard options={chessboardOptions} />
      </div>
    </div>
  </div>
);
}


