import { Client, Databases, Query } from 'node-appwrite';

const PGN_COLLECTION_ID = process.env.APPWRITE_FUNCTION_PGN_COLLECTION_ID;
const DATABASE_ID = process.env.APPWRITE_FUNCTION_GAMES_DATABASE_ID;

// This Appwrite function will be executed every time your function is triggered
export default async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  // Use a dedicated server API key configured on the function. Do NOT rely on request headers.
  const apiKey = process.env.APPWRITE_API_KEY || '';

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

  // Paginate to work around any total caps; accumulate counts across all pages
  const getCountPaged = async (filters = []) => {
    const pageSize = 100; // conservative page size
    let offset = 0;
    let count = 0;
    let safety = 0;
    while (true) {
      const result = await databases.listDocuments(
        DATABASE_ID,
        PGN_COLLECTION_ID,
        [Query.limit(pageSize), Query.offset(offset), ...filters]
      );
      const len = Array.isArray(result?.documents) ? result.documents.length : 0;
      count += len;
      if (len < pageSize) break; // last page
      offset += len;
      safety += 1;
      if (safety > 100000) break; // hard stop safeguard
    }
    return count;
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
      getCountPaged(),
      getCountPaged([Query.greaterThanEqual('eval_mate_in', 1), Query.lessThanEqual('eval_mate_in', 3)]),
      getCountPaged([Query.greaterThanEqual('eval_mate_in', 4), Query.lessThanEqual('eval_mate_in', 6)]),
      getCountPaged([Query.greaterThanEqual('eval_mate_in', 7), Query.lessThanEqual('eval_mate_in', 9)]),
      getCountPaged([Query.greaterThanEqual('eval_mate_in', 10), Query.lessThanEqual('eval_mate_in', 12)]),
      getCountPaged([Query.greaterThanEqual('eval_mate_in', 13), Query.lessThanEqual('eval_mate_in', 15)]),
    ]);
    // If the service caps totals, recompute overall total as sum of buckets
    const computedTotal = m3 + m6 + m9 + m12 + m15;

    log(`Stats total(computed)=${computedTotal} m3=${m3} m6=${m6} m9=${m9} m12=${m12} m15=${m15}`);

    return res.json({ total: computedTotal, buckets: { m3, m6, m9, m12, m15 } });
  } catch (err) {
    error('Stats error: ' + (err?.message || String(err)));
    return res.json({ error: 'Failed to fetch stats', message: err?.message || String(err) }, 500);
  }
};
