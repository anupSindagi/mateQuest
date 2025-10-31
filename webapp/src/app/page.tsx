import { headers } from 'next/headers';
import { Crown } from 'lucide-react';
import FAQ from '@/components/FAQ';

export default async function Home() {
  // Fetch stats from secure server API
  let totalPuzzles = 0;
  let buckets: { m3?: number; m6?: number; m9?: number; m12?: number; m15?: number } = {};
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'http';
    const baseUrl = host ? `${proto}://${host}` : '';
    const res = await fetch(`${baseUrl}/api/stats`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      totalPuzzles = json?.total ?? 0;
      buckets = json?.buckets ?? {};
    }
  } catch {
    // ignore and keep defaults
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="w-full max-w-3xl mx-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Crown className="h-8 w-8 md:h-10 md:w-10 text-amber-600" aria-hidden />
          <span>mateQuest</span>
        </h1>
        <p className="text-slate-600 mb-6">
          Train your tactical vision with curated mate-in-N puzzles powered by a fast in-browser engine.
          Solve, learn, and climb the leaderboard.
        </p>
        <div className="grid gap-4 text-slate-800">
          <div className="text-lg">
            Solve over <span className="font-semibold">{totalPuzzles}</span> mate puzzles
          </div>
          <div className="text-sm text-slate-600">Adding over 1000 new puzzles every day. Updated every hour!</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded border border-slate-200 p-3 text-center">
              <div className="text-xs text-slate-500">M3</div>
              <div className="text-base font-semibold">{buckets.m3 ?? '-'}</div>
            </div>
            <div className="rounded border border-slate-200 p-3 text-center">
              <div className="text-xs text-slate-500">M6</div>
              <div className="text-base font-semibold">{buckets.m6 ?? '-'}</div>
            </div>
            <div className="rounded border border-slate-200 p-3 text-center">
              <div className="text-xs text-slate-500">M9</div>
              <div className="text-base font-semibold">{buckets.m9 ?? '-'}</div>
            </div>
            <div className="rounded border border-slate-200 p-3 text-center">
              <div className="text-xs text-slate-500">M12</div>
              <div className="text-base font-semibold">{buckets.m12 ?? '-'}</div>
            </div>
            <div className="rounded border border-slate-200 p-3 text-center">
              <div className="text-xs text-slate-500">M15</div>
              <div className="text-base font-semibold">{buckets.m15 ?? '-'}</div>
            </div>
          </div>
        </div>
      </div>
      <FAQ />
      </div>
    </main>
  );
}
