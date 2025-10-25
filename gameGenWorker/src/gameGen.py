from stockfish import Stockfish
import chess
import chess.pgn
import random

# Initialize Stockfish for evaluation
stockfish = Stockfish("/usr/games/stockfish", depth=15, parameters={
    "Threads": 2, 
    "Minimum Thinking Time": 100
})

def get_eval():
    eval_info = stockfish.get_evaluation()
    return eval_info.get("value"), eval_info.get("type")


def find_mate_positions(total_games=10):
    """
    Play random games until a mate is found.
    Returns list of dicts for each game with:
        - start_pgn: PGN string before first mate-in-N found
        - player_to_mate: "white" or "black" (the player about to mate at first mate-in-N found)
        - mate_in: The number of moves (Stockfish line, start position)
        - fen: FEN string for the first position where mate was detected
        - eval_mate_in: The mate-in value as reported by Stockfish
    """
    results = []
    for game_num in range(1, total_games + 1):
        board = chess.Board()
        stockfish.set_fen_position(board.fen())
        game_moves = []
        mate_found = False
        mate_side = None  # "white" or "black"
        mate_fen = None
        eval_mate_in = None
        start_pgn = None
        # --- Play random moves until eval says "mate-in-n" ---
        for move_num in range(100):
            legal_moves = list(board.legal_moves)
            if not legal_moves:
                break
            move = random.choice(legal_moves)
            board.push(move)
            game_moves.append(move)
            stockfish.set_fen_position(board.fen())
            val, typ = get_eval()
            if typ == "mate":
                mate_found = True
                eval_mate_in = abs(val)
                mate_fen = board.fen()
                mate_side = "white" if board.turn else "black"
                # Build start_pgn string up to here
                pgn_game = chess.pgn.Game()
                node = pgn_game
                for m in game_moves:
                    node = node.add_variation(m)
                start_pgn = str(pgn_game).split("\n\n")[1] if "\n\n" in str(pgn_game) else str(pgn_game)
                break

        if not mate_found:
            print(f"Game {game_num}: No mates found")
            continue

        results.append({
            "start_pgn": start_pgn,
            "player_to_mate": mate_side,
            "fen": mate_fen,
            "eval_mate_in": eval_mate_in,
            "fen_hash" : hash(mate_fen)
        })
        print(f"Game {game_num}: Found mate-in-{eval_mate_in} ({mate_side})")

    return results


def test_find_mate_positions_logging():
    print("Testing mate position finder...")
    print("=" * 50)
    mate_results = find_mate_positions(total_games=10)
    print(f"Test run found {len(mate_results)} mate positions:")
    for i, result in enumerate(mate_results):
        print(f"\nMate position {i+1}:")
        print(f"  Start PGN: {result['start_pgn']}")
        print(f"  Player to mate: {result['player_to_mate']}")
        print(f"  FEN: {result['fen']}")
        print(f"  Eval mate in: {result['eval_mate_in']}")
        print(f"  FEN hash: {result['fen_hash']}")
# To run the tests:
# test_find_mate_positions_logging()