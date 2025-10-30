import { NextResponse } from 'next/server';
import { getAppwriteDatabases } from '@/lib/appwrite';
import { Query } from 'appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PGN_COLLECTION_ID;

export async function GET() {
  try {
    if (!DATABASE_ID || !COLLECTION_ID) {
      return NextResponse.json(
        { error: 'Missing database or collection configuration' },
        { status: 500 }
      );
    }

    const databases = getAppwriteDatabases();
    
    // Query for eval_mate_in between 1 and 3
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [
        Query.greaterThanEqual("eval_mate_in", 1),
        Query.lessThanEqual("eval_mate_in", 3)
      ]
    );

    if (response.documents.length === 0) {
      return NextResponse.json(
        { error: 'No FEN data found for eval_mate_in range 1-3' },
        { status: 404 }
      );
    }

    // Get random document from the results
    const randomIndex = Math.floor(Math.random() * response.documents.length);
    const randomDocument = response.documents[randomIndex];

    return NextResponse.json({
      $id: randomDocument.$id,
      eval_mate_in: randomDocument.eval_mate_in,
      start_pgn: randomDocument.start_pgn,
      player_to_mate: randomDocument.player_to_mate,
      fen: randomDocument.fen,
      fen_hash: randomDocument.fen_hash,
      $createdAt: randomDocument.$createdAt,
      $updatedAt: randomDocument.$updatedAt
    });
  } catch (error) {
    console.error('Error fetching FEN data (1-3):', error);
    return NextResponse.json(
      { error: 'Failed to fetch FEN data' },
      { status: 500 }
    );
  }
}
