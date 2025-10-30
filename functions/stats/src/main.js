import { Client, Databases, Query, ID } from 'node-appwrite';

const PGN_COLLECTION_ID = process.env.APPWRITE_FUNCTION_PGN_COLLECTION_ID;
const DATABASE_ID = process.env.APPWRITE_FUNCTION_GAMES_DATABASE_ID;
const STATS_COLLECTION_ID = 'stats'

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

  // Faster counting with smart strategy:
  // 1) Ask for total using limit(1). If < 5000, trust it.
  // 2) Otherwise, paginate using cursor + select([$id]) to minimize payload.
  const getCountSmart = async (filters = []) => {
    const head = await databases.listDocuments(
      DATABASE_ID,
      PGN_COLLECTION_ID,
      [Query.limit(1), ...filters]
    );
    const reportedTotal = typeof head?.total === 'number' ? head.total : undefined;
    if (typeof reportedTotal === 'number' && reportedTotal < 5000) {
      return reportedTotal;
    }

    const pageSize = 500; // balance between requests and payload
    let count = 0;
    let lastId = null;
    let safety = 0;

    while (true) {
      const query = [
        Query.limit(pageSize),
        Query.orderAsc('$id'),
        Query.select(['$id']),
        ...filters,
      ];
      if (lastId) query.push(Query.cursorAfter(lastId));

      const page = await databases.listDocuments(DATABASE_ID, PGN_COLLECTION_ID, query);
      const docs = Array.isArray(page?.documents) ? page.documents : [];
      count += docs.length;
      if (docs.length < pageSize) break;
      lastId = docs[docs.length - 1].$id;
      safety += 1;
      if (safety > 20000) break; // hard stop safeguard
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
      getCountSmart(),
      getCountSmart([Query.greaterThanEqual('eval_mate_in', 1), Query.lessThanEqual('eval_mate_in', 3)]),
      getCountSmart([Query.greaterThanEqual('eval_mate_in', 4), Query.lessThanEqual('eval_mate_in', 6)]),
      getCountSmart([Query.greaterThanEqual('eval_mate_in', 7), Query.lessThanEqual('eval_mate_in', 9)]),
      getCountSmart([Query.greaterThanEqual('eval_mate_in', 10), Query.lessThanEqual('eval_mate_in', 12)]),
      getCountSmart([Query.greaterThanEqual('eval_mate_in', 13), Query.lessThanEqual('eval_mate_in', 15)]),
    ]);
    // If the service caps totals, recompute overall total as sum of buckets
    const computedTotal = m3 + m6 + m9 + m12 + m15;

    log(`Stats total(computed)=${computedTotal} m3=${m3} m6=${m6} m9=${m9} m12=${m12} m15=${m15}`);

    // Persist to stats collection (single document)
    try {
      const statsList = await databases.listDocuments(DATABASE_ID, STATS_COLLECTION_ID, [Query.limit(1)]);
      const payload = { total: computedTotal, m3, m6, m9, m12, m15 };
      if (Array.isArray(statsList?.documents) && statsList.documents.length > 0) {
        const docId = statsList.documents[0].$id;
        await databases.updateDocument(DATABASE_ID, STATS_COLLECTION_ID, docId, payload);
      } else {
        await databases.createDocument(DATABASE_ID, STATS_COLLECTION_ID, ID.unique(), payload);
      }
    } catch (persistErr) {
      error('Failed to persist stats: ' + (persistErr?.message || String(persistErr)));
    }

    return res.json({ total: computedTotal, buckets: { m3, m6, m9, m12, m15 } });
  } catch (err) {
    error('Stats error: ' + (err?.message || String(err)));
    return res.json({ error: 'Failed to fetch stats', message: err?.message || String(err) }, 500);
  }
};
