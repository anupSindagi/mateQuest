"use client";

import { useRef , useState, useMemo, useEffect} from 'react';
import { Chess , type Square} from 'chess.js';
import { Chessboard, type PieceDropHandlerArgs, type SquareHandlerArgs} from 'react-chessboard';
import Engine from '@/lib/engine';
import { getAppwriteAccount, getAppwriteDatabases } from '@/lib/appwrite';
import { Query } from 'appwrite';

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
// Explicit sides for clarity
const [humanColor, setHumanColor] = useState<'w' | 'b'>('w');
const [computerColor, setComputerColor] = useState<'w' | 'b'>('b');
// Refs to avoid stale state in engine callbacks
const currentMoveRef = useRef<'human' | 'computer'>('human');
const computerColorRef = useRef<'w' | 'b'>('b');
// Turn controller: whose move conceptually (independent of board turn color)
const [currentMove, setCurrentMove] = useState<'human' | 'computer'>('human');
// keep refs in sync with state
useEffect(() => { currentMoveRef.current = currentMove; }, [currentMove]);
useEffect(() => { computerColorRef.current = computerColor; }, [computerColor]);
// Estimated eval from API (e.g., mate in number)
const [estimatedEval, setEstimatedEval] = useState<string>('');
// Auth state (for Solved box display)
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [userEmail, setUserEmail] = useState<string>('');
const [solvedCount, setSolvedCount] = useState<number>(0);
const profileDocIdRef = useRef<string>('');
const practiceObjRef = useRef<Record<'m3' | 'm6' | 'm9' | 'm12' | 'm15', number>>({ m3: 0, m6: 0, m9: 0, m12: 0, m15: 0 });
const PROFILE_COLLECTION_ID = 'profiles';

// auth + profile load
useEffect(() => {
  let isMounted = true;
  (async () => {
    try {
      const account = getAppwriteAccount();
      const me = await account.get();
      if (!isMounted) return;
      setIsAuthenticated(true);
      const email = (me as any)?.email ?? '';
      setUserEmail(email);

      // fetch profile doc
      try {
        const databases = getAppwriteDatabases();
        const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID as string;
        // Prefer server-side filtering if available in client SDK
        const res: any = await databases.listDocuments(dbId, PROFILE_COLLECTION_ID, [Query.equal('email', email), Query.limit(1)]);
        const doc = Array.isArray(res?.documents) && res.documents.length > 0 ? res.documents[0] : null;
        if (doc) {
          profileDocIdRef.current = doc.$id as string;
          // parse practice json string
          const raw = doc.practice as string | undefined;
          let parsed: any = { m3: 0, m6: 0, m9: 0, m12: 0, m15: 0 };
          if (raw && typeof raw === 'string') {
            try {
              parsed = JSON.parse(raw);
            } catch {
              try {
                const fixed = raw.replace(/([,{]\s*)(m3|m6|m9|m12|m15)(\s*:)/g, '$1"$2"$3');
                parsed = JSON.parse(fixed);
              } catch {
                parsed = { m3: 0, m6: 0, m9: 0, m12: 0, m15: 0 };
              }
            }
          }
          practiceObjRef.current = {
            m3: Number(parsed?.m3 ?? 0),
            m6: Number(parsed?.m6 ?? 0),
            m9: Number(parsed?.m9 ?? 0),
            m12: Number(parsed?.m12 ?? 0),
            m15: Number(parsed?.m15 ?? 0)
          };
          // set current solved count for this mate bucket
          setSolvedCount(practiceObjRef.current[matein]);
        }
      } catch {
        // ignore profile load errors
      }
    } catch {
      if (isMounted) setIsAuthenticated(false);
    }
  })();
  return () => { isMounted = false; };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// helper to persist increment when puzzle is solved by human
async function persistSolvedIncrement() {
  try {
    if (!isAuthenticated) return;
    if (!profileDocIdRef.current) return;
    const databases = getAppwriteDatabases();
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID as string;
    // increment in-memory
    const nextVal = (practiceObjRef.current[matein] ?? 0) + 1;
    practiceObjRef.current = { ...practiceObjRef.current, [matein]: nextVal } as typeof practiceObjRef.current;
    setSolvedCount(nextVal);
    const practiceString = JSON.stringify(practiceObjRef.current);
    const practiceTotal = Object.values(practiceObjRef.current).reduce((sum, val) => sum + val, 0);
    await databases.updateDocument(dbId, PROFILE_COLLECTION_ID, profileDocIdRef.current, { practice: practiceString, practice_total: practiceTotal });
  } catch {
    // ignore update errors for now
  }
}

// Keep track of the baseline position to support true resets without re-fetching
const initialPositionRef = useRef<{ fen: string; player: 'white' | 'black' | ''; estimated?: string }>({
  fen: chessGame.fen(),
  player: '',
  estimated: ''
});

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
      const evalMateIn = data?.eval_mate_in as number | undefined;
      const estimatedLabel = typeof evalMateIn === 'number' ? `M${evalMateIn}` : '';
      const fenFromApi = data?.fen as string | undefined;
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
        setEstimatedEval(estimatedLabel);
        // Always set human to FEN side-to-move
        const fenTurn = chessGame.turn(); // 'w' | 'b'
        setHumanColor(fenTurn);
        setComputerColor(fenTurn === 'w' ? 'b' : 'w');
        setPlayerToMate(fenTurn === 'w' ? 'white' : 'black');
        // Human always starts after load
        setCurrentMove('human');
        // set baseline for future resets
        initialPositionRef.current = { fen: chessGame.fen(), player: fenTurn === 'w' ? 'white' : 'black', estimated: estimatedLabel };
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
  // Only play when it's actually computer's turn on board and controller allows
  if (currentMoveRef.current !== 'computer') return;
  if (chessGame.turn() !== computerColorRef.current) return;
  try { engine.stop(); } catch {}
  const effectiveDepth = Math.max(15, searchDepth);
  engine.evaluatePosition(chessGame.fen(), effectiveDepth);
  engine.onMessage(({ bestMove, positionEvaluation: evalCp, pv, depth, possibleMate: mate }) => {
    if (depth && depth < 15) return;
    if (typeof evalCp !== 'undefined') setPositionEvaluation(Number(evalCp) / 100);
    if (typeof mate !== 'undefined') setPossibleMate(mate);
    if (typeof pv !== 'undefined') setBestLine(pv);
    if (bestMove) {
      // Guard against race
      if (currentMoveRef.current !== 'computer' || chessGame.turn() !== computerColorRef.current) return;
      const from = bestMove.slice(0, 2) as Square;
      const to = bestMove.slice(2, 4) as Square;
      // Extra safety: ensure the piece at 'from' belongs to the computer side
      const pieceAtFrom = chessGame.get(from);
      if (!pieceAtFrom || pieceAtFrom.color !== computerColorRef.current) return;
      try {
        chessGame.move({ from, to, promotion: 'q' });
        setChessPosition(chessGame.fen());
        try { engine.stop(); } catch {}
        // Hand turn back to human
        setCurrentMove('human');
        currentMoveRef.current = 'human';
      } catch {
        // ignore illegal bestmove
      }
    }
  });
}

// Always update numeric evaluation for the current position (even when it's human's turn)
useEffect(() => {
  try {
    engine.stop();
  } catch {}
  const effectiveDepth = Math.max(15, searchDepth);
  engine.evaluatePosition(chessGame.fen(), effectiveDepth);
  engine.onMessage(({ positionEvaluation: evalCp, depth, possibleMate: mate }) => {
    if (typeof evalCp !== 'undefined') setPositionEvaluation(Number(evalCp) / 100);
    if (typeof mate !== 'undefined') setPossibleMate(mate);
    if (depth && depth >= 10) {
      try { engine.stop(); } catch {}
    }
  });
}, [chessPosition]);

// Engine move trigger: only when controller says it's computer's move
useEffect(() => {
  if (!chessGame.isGameOver() && !chessGame.isDraw() && currentMove === 'computer' && chessGame.turn() === computerColor) {
    const id = setTimeout(makeBestMove, 200);
    return () => clearTimeout(id);
  }
}, [chessPosition, currentMove, computerColor]);

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

  // if human just delivered mate, persist increment
  if (chessGame.isCheckmate()) {
    void persistSolvedIncrement();
  }

  // user moved; now it's computer's turn according to controller
  setCurrentMove('computer');
  currentMoveRef.current = 'computer';

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

    // if human just delivered mate, persist increment
    if (chessGame.isCheckmate()) {
      void persistSolvedIncrement();
    }

    // user moved; now it's computer's turn according to controller
  setCurrentMove('computer');
  currentMoveRef.current = 'computer';

    // clear moveFrom and optionSquares
    setMoveFrom('');
    setOptionSquares({});

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
  id: 'click-or-drag-to-move',
  boardOrientation: (humanColor === 'w' ? 'white' : 'black') as 'white' | 'black'
};

// render the chessboard centered with constrained size to avoid overflow
return (
  <div className="w-full flex items-center justify-center">
    <div className="w-[min(90vw,80vh,520px)]">
      {/* Top section - empty, with mild border */}
      <div className="mb-2 border border-slate-200 rounded min-h-[36px] p-2 flex items-center justify-between">
        <button
          className="px-3 py-1 text-xs bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 transition-colors"
          onClick={async () => {
            try {
              engine.stop();
              // Reset to the baseline without calling the API
              const { fen, estimated } = initialPositionRef.current;
              chessGame.load(fen);
              setChessPosition(chessGame.fen());
              setMoveFrom('');
              setOptionSquares({});
              setBestLine('');
              setPossibleMate('');
              setEstimatedEval(estimated ?? '');
              // Human is always FEN side-to-move
              const fenTurn = chessGame.turn();
              setPlayerToMate(fenTurn === 'w' ? 'white' : 'black');
              setHumanColor(fenTurn);
              setComputerColor(fenTurn === 'w' ? 'b' : 'w');
              computerColorRef.current = (fenTurn === 'w' ? 'b' : 'w');
              // Controller: human starts after reset
              setCurrentMove('human');
              currentMoveRef.current = 'human';
            } catch {}
          }}
        >
          Reset
        </button>
        <div className="flex items-center justify-between ">
          {playerToMate && (
            <div className={`text-sm px-2 py-1 border border-slate-200 rounded ${playerToMate === 'white' ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
              {(playerToMate === 'white' ? 'White' : 'Black') + ' to move'}
            </div>
          )}
          
        </div>
        <button
          className="px-3 py-1 text-xs bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 transition-colors"
          onClick={async () => {
            try {
              engine.stop();
              const response = await fetch(`/api/pgn/${matein}`, { cache: 'no-store' });
              if (!response.ok) return;
              const data = await response.json();
              const evalMateIn = data?.eval_mate_in as number | undefined;
              const estimatedLabel = typeof evalMateIn === 'number' ? `M${evalMateIn}` : '';
              const fenFromApi = data?.fen as string | undefined;
              if (!fenFromApi) return;
              chessGame.load(fenFromApi);
              setChessPosition(chessGame.fen());
              setMoveFrom('');
              setOptionSquares({});
              setBestLine('');
              setPossibleMate('');
              setEstimatedEval(estimatedLabel);
              // Human is always FEN side-to-move
              const fenTurn = chessGame.turn();
              setPlayerToMate(fenTurn === 'w' ? 'white' : 'black');
              setHumanColor(fenTurn);
              setComputerColor(fenTurn === 'w' ? 'b' : 'w');
              computerColorRef.current = (fenTurn === 'w' ? 'b' : 'w');
              // Controller: human starts after next
              setCurrentMove('human');
              currentMoveRef.current = 'human';
              // update baseline to this newly fetched puzzle
              initialPositionRef.current = { fen: chessGame.fen(), player: fenTurn === 'w' ? 'white' : 'black', estimated: estimatedLabel };
            } catch {}
          }}
        >
          Next
        </button>
      </div>

      <div className="aspect-square">
        <Chessboard options={chessboardOptions} />
      </div>
      {/* Bottom section - empty, with mild border */}
      <div className="mt-2 border border-slate-200 rounded min-h-[36px] p-2">
        <div className="flex items-start justify-between gap-2">
          {(() => {
                const whiteAdv = (chessGame.turn() === 'w' ? 1 : -1) * positionEvaluation;
                const label = possibleMate ? `M${possibleMate}` : `${whiteAdv >= 0 ? '+' : ''}${whiteAdv.toFixed(2)}`;
                return (
                  <div className="text-sm font-medium text-slate-800 border border-slate-200 rounded p-2" aria-label="position-evaluation">
                    <div className="text-xs text-slate-500">Current Eval: {label}</div>
                    <div className="text-xs text-slate-500">Estimated Eval: {estimatedEval || '-'}</div>
                  </div>
                );
              })()}
          <div className={`text-sm font-medium rounded p-2 border ${isAuthenticated ? 'border-slate-200 text-slate-800' : 'border-slate-200 text-slate-400 opacity-50'}`} aria-label="solved-counter">
            <div>Solved: {isAuthenticated ? solvedCount : '-'}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}


