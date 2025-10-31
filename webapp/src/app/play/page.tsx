import Link from 'next/link';

export default function PlayPage() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="w-full max-w-3xl mx-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl md:text-3xl font-semibold tracking-tight mb-6">Choose a play mode</h1>

        <div className="grid gap-8">
          {/* Practice box */}
          <section className="rounded-lg border border-slate-200 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-slate-900">Practice</h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">This is with stockfish assistance. No login required.</p>
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
          </section>

          {/* Rated box */}
          <section className="rounded-lg border border-slate-200 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-slate-900">Rated</h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">This is without stockfish assistance. Needs to be logged in to play.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/play/rated?matein=m3"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Mates in ≤3
              </Link>
              <Link
                href="/play/rated?matein=m6"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Mates in ≤6
              </Link>
              <Link
                href="/play/rated?matein=m9"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Mates in ≤9
              </Link>
              <Link
                href="/play/rated?matein=m12"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Mates in ≤12
              </Link>
              <Link
                href="/play/rated?matein=m15"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Mates in ≤15
              </Link>
            </div>
          </section>
        </div>
      </div>
      </div>
    </main>
  );
}
