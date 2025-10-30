// Appwrite Function (Node.js) - Stats Aggregation
// Expects the following environment variables to be configured in Appwrite:
// - APPWRITE_FUNCTION_ENDPOINT (preferred) or NEXT_PUBLIC_APPWRITE_ENDPOINT
// - APPWRITE_FUNCTION_PROJECT_ID (preferred) or NEXT_PUBLIC_APPWRITE_PROJECT
// - APPWRITE_API_KEY (server key with databases.read permission)
// - NEXT_PUBLIC_APPWRITE_DATABASE_ID
// - NEXT_PUBLIC_APPWRITE_PGN_COLLECTION_ID

const { Client, Databases, Query } = require('appwrite');

async function getCount(databases, databaseId, collectionId, filters = []) {
  const res = await databases.listDocuments(databaseId, collectionId, [Query.limit(1), ...filters]);
  return typeof res?.total === 'number' ? res.total : Array.isArray(res?.documents) ? res.documents.length : 0;
}

module.exports = async function (req, res) {
  try {
    const ENDPOINT = process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
    const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
    const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PGN_COLLECTION_ID;
    const API_KEY = process.env.APPWRITE_API_KEY;

    if (!ENDPOINT || !PROJECT_ID || !DATABASE_ID || !COLLECTION_ID || !API_KEY) {
      return res.json({
        error: 'Missing configuration',
        details: {
          ENDPOINT: !!ENDPOINT,
          PROJECT_ID: !!PROJECT_ID,
          DATABASE_ID: !!DATABASE_ID,
          COLLECTION_ID: !!COLLECTION_ID,
          API_KEY: !!API_KEY
        }
      }, 500);
    }

    const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
    // set server key
    client.setKey(API_KEY);
    const databases = new Databases(client);

    const [
      total,
      m3,
      m6,
      m9,
      m12,
      m15
    ] = await Promise.all([
      getCount(databases, DATABASE_ID, COLLECTION_ID),
      getCount(databases, DATABASE_ID, COLLECTION_ID, [Query.greaterThanEqual('eval_mate_in', 1), Query.lessThanEqual('eval_mate_in', 3)]),
      getCount(databases, DATABASE_ID, COLLECTION_ID, [Query.greaterThanEqual('eval_mate_in', 4), Query.lessThanEqual('eval_mate_in', 6)]),
      getCount(databases, DATABASE_ID, COLLECTION_ID, [Query.greaterThanEqual('eval_mate_in', 7), Query.lessThanEqual('eval_mate_in', 9)]),
      getCount(databases, DATABASE_ID, COLLECTION_ID, [Query.greaterThanEqual('eval_mate_in', 10), Query.lessThanEqual('eval_mate_in', 12)]),
      getCount(databases, DATABASE_ID, COLLECTION_ID, [Query.greaterThanEqual('eval_mate_in', 13), Query.lessThanEqual('eval_mate_in', 15)])
    ]);

    return res.json({
      total,
      buckets: { m3, m6, m9, m12, m15 }
    });
  } catch (error) {
    console.error('Stats function error:', error);
    return res.json({ error: 'Failed to fetch stats', message: error?.message || String(error) }, 500);
  }
};


