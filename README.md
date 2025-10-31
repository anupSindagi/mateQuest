# mateQuest
mateQuest is a chess tactics app focused on mate-in-N puzzles. The server continually simulates random chess games and pulls out positions where Stockfish finds forced mates, so there’s always a set of original puzzles to solve.

Some technical details:
- The backend runs random games every minute and uses Stockfish to check for mates; new puzzles get added automatically.
- Built using Next.js and React, with Tailwind CSS for styling and Lucide for icons.
- Handles logins and sessions through Appwrite.
- The browser runs Stockfish locally to validate your solutions right away.
- There's a  leaderboard to track solving progress.

The goal is just to provide steady, varied practice for mate-finding in chess.

## Folder Structure

- `webapp/`: The Next.js frontend application. Contains all React UI components, pages, and assets for the user interface.
- `gamegenworker/`: The service responsible for generating new chess puzzles by running simulations and using Stockfish to detect mating positions.
- `functions/`: Serverless backend functions, such as APIs for stats



