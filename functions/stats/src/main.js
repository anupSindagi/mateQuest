import { Client, Databases, Query } from 'node-appwrite';

const PGN_COLLECTION_ID = process.env.APPWRITE_FUNCTION_PGN_COLLECTION_ID;
const DATABASE_ID = process.env.APPWRITE_FUNCTION_GAMES_DATABASE_ID;

// This Appwrite function will be executed every time your function is triggered
export default async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = req.headers['x-appwrite-key'] ?? '';

  if (!endpoint || !projectId || !apiKey || !DATABASE_ID || !PGN_COLLECTION_ID) {
    return res.json({
      error: 'Missing configuration',
      details: {
        endpoint: !!endpoint,
        projectId: !!projectId,
        apiKey: !!apiKey,
        databaseId: !!DATABASE_ID,
        collectionId: !!PGN_COLLECTION_ID,
      }
    }, 500);
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new Databases(client);

  const getCount = async (filters = []) => {
    const result = await databases.listDocuments(DATABASE_ID, PGN_COLLECTION_ID, [Query.limit(1), ...filters]);
    return typeof result?.total === 'number' ? result.total : Array.isArray(result?.documents) ? result.documents.length : 0;
  };

  try {
    const [
      total,
      m3,
      m6,
      m9,
      m12,
      m15,
    ] = await Promise.all([
      getCount(),
      getCount([Query.greaterThanEqual('eval_mate_in', 1), Query.lessThanEqual('eval_mate_in', 3)]),
      getCount([Query.greaterThanEqual('eval_mate_in', 4), Query.lessThanEqual('eval_mate_in', 6)]),
      getCount([Query.greaterThanEqual('eval_mate_in', 7), Query.lessThanEqual('eval_mate_in', 9)]),
      getCount([Query.greaterThanEqual('eval_mate_in', 10), Query.lessThanEqual('eval_mate_in', 12)]),
      getCount([Query.greaterThanEqual('eval_mate_in', 13), Query.lessThanEqual('eval_mate_in', 15)]),
    ]);

    log(`Stats total=${total} m3=${m3} m6=${m6} m9=${m9} m12=${m12} m15=${m15}`);

    return res.json({ total, buckets: { m3, m6, m9, m12, m15 } });
  } catch (err) {
    error('Stats error: ' + (err?.message || String(err)));
    return res.json({ error: 'Failed to fetch stats', message: err?.message || String(err) }, 500);
  }
};
