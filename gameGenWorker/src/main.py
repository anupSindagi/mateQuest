from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.exception import AppwriteException
from appwrite.query import Query
import os
import time
import logging
from dotenv import load_dotenv

# Import our chess functions
from gameGen import find_mate_positions

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()


def main():
    """
    Background worker that continuously generates mate positions and stores them in Appwrite database.
    This script runs perpetually and pushes unique FEN positions to the database.
    """
    
    # Appwrite configuration
    APPWRITE_ENDPOINT = os.environ.get("APPWRITE_ENDPOINT")
    APPWRITE_PROJECT_ID = os.environ.get("APPWRITE_PROJECT_ID")
    APPWRITE_API_KEY = os.environ.get("APPWRITE_API_KEY")
    DATABASE_GAMES_ID = os.environ.get("DATABASE_GAMES_ID")
    COLLECTION_PGN_ID = os.environ.get("COLLECTION_PGN_ID")
    
    # Initialize Appwrite client
    client = (
        Client()
        .set_endpoint(APPWRITE_ENDPOINT)
        .set_project(APPWRITE_PROJECT_ID)
        .set_key(APPWRITE_API_KEY)
    )
    
    databases = Databases(client)
    
    # Configuration
    BATCH_SIZE = 5  # Generate 5 mate positions per batch
    SLEEP_TIME = 30  # Wait 30 seconds between batches
    
    logger.info("Starting background mate position generator...")
    
    def fen_hash_exists_in_database(fen_hash):
        """Check if FEN hash already exists in the database by querying for that hash directly."""
        try:
            # Query for exact fen_hash in the collection using proper Appwrite query syntax
            documents = databases.list_documents(
                database_id=DATABASE_GAMES_ID,
                collection_id=COLLECTION_PGN_ID,
                queries=[
                    Query.equal("fen_hash", fen_hash)
                ]
            )
            return len(documents['documents']) > 0
        except AppwriteException as err:
            logger.error(f"Error checking FEN hash existence: {repr(err)}")
            return False  # Assume it doesn't exist if we can't check
    
    batch_num = 0
    while True:  # Run perpetually
        batch_num += 1
        try:
            logger.info(f"Batch {batch_num}: Generating {BATCH_SIZE} mate positions...")
            
            # Generate mate positions
            mate_results = find_mate_positions(total_games=BATCH_SIZE)
            
            # Store unique mate positions
            stored_count = 0
            skipped_count = 0
            
            for mate_data in mate_results:
                fen_hash = mate_data["fen_hash"]
                
                # Check if this FEN hash already exists in database
                if not fen_hash_exists_in_database(fen_hash):
                    try:
                        # Create document in "pgn" collection of "games" database
                        document = databases.create_document(
                            database_id=DATABASE_GAMES_ID,
                            collection_id=COLLECTION_PGN_ID,
                            document_id="unique()",  # Let Appwrite generate unique ID
                            data={
                                "start_pgn": mate_data["start_pgn"],
                                "player_to_mate": mate_data["player_to_mate"],
                                "fen": mate_data["fen"],
                                "fen_hash": mate_data["fen_hash"],
                                "eval_mate_in": mate_data["eval_mate_in"]
                            }
                        )
                        
                        stored_count += 1
                        logger.info(f"Stored new mate: {mate_data['player_to_mate']} mate-in-{mate_data['eval_mate_in']} (FEN hash: {fen_hash})")
                        
                    except AppwriteException as err:
                        logger.error(f"Failed to store mate position: {repr(err)}")
                        continue
                else:
                    skipped_count += 1
                    logger.info(f"Skipped existing FEN hash: {fen_hash}")
            
            logger.info(f"Batch {batch_num} complete: {stored_count} stored, {skipped_count} skipped")
            
            # Sleep before next batch
            logger.info(f"Sleeping for {SLEEP_TIME} seconds before next batch...")
            time.sleep(SLEEP_TIME)
            
        except Exception as e:
            logger.error(f"Error in batch {batch_num}: {str(e)}")
            logger.info("Continuing with next batch after error...")
            time.sleep(10)  # Short sleep on error
            continue

if __name__ == "__main__":
    main()
