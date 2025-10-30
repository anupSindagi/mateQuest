import { NextResponse } from 'next/server';
import { getAppwriteDatabases } from '@/lib/appwrite';
import { Query } from 'appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const STATS_COLLECTION_ID = 'stats';

export async function GET() {
  try {
    if (!DATABASE_ID) {
      return NextResponse.json(
        { error: 'Missing Appwrite configuration' },
        { status: 500 }
      );
    }

    const databases = getAppwriteDatabases();
    const res: any = await databases.listDocuments(
      DATABASE_ID,
      STATS_COLLECTION_ID,
      [Query.limit(1)]
    );

    if (!res?.documents?.length) {
      return NextResponse.json({ total: 0, buckets: { m3: 0, m6: 0, m9: 0, m12: 0, m15: 0 } });
    }

    const doc = res.documents[0] as any;
    const total = Number(doc.total ?? 0);
    const m3 = Number(doc.m3 ?? 0);
    const m6 = Number(doc.m6 ?? 0);
    const m9 = Number(doc.m9 ?? 0);
    const m12 = Number(doc.m12 ?? 0);
    const m15 = Number(doc.m15 ?? 0);

    return NextResponse.json({
      total,
      buckets: { m3, m6, m9, m12, m15 }
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch stats', message: error?.message ?? String(error) }, { status: 500 });
  }
}
