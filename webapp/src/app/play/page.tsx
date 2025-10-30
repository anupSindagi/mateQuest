import Link from 'next/link';

export default function PlayPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight mb-4">Play</h1>
      <p className="text-slate-700 mb-6">Choose a mode to begin.</p>
      <div className="flex items-center gap-3">
        <Link
          href="/play/practice"
          className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          Practice
        </Link>
        <Link
          href="/play/rated"
          className="inline-flex items-center justify-center rounded-md bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800"
        >
          Rated
        </Link>
      </div>
      <div className="mt-6">
        <p className="text-slate-700 mb-3">Practice difficulties</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/play/practice?matein=m3"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Mates in ≤3
          </Link>
          <Link
            href="/play/practice?matein=m6"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Mates in ≤6
          </Link>
          <Link
            href="/play/practice?matein=m9"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Mates in ≤9
          </Link>
          <Link
            href="/play/practice?matein=m12"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Mates in ≤12
          </Link>
          <Link
            href="/play/practice?matein=m15"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Mates in ≤15
          </Link>
        </div>
      </div>
    </main>
  );
}


