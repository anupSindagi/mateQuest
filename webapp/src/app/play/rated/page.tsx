"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAppwriteAccount } from '@/lib/appwrite';
import ChessboardComp from '@/components/ChessboardComp';

function RatedPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  const matein = useMemo(() => {
    const raw = searchParams.get('matein') as 'm3' | 'm6' | 'm9' | 'm12' | 'm15' | null;
    return (raw ?? 'm3');
  }, [searchParams]);
  const mValue = useMemo(() => matein.replace('m', ''), [matein]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const account = getAppwriteAccount();
        await account.get();
        if (mounted) setIsAuthed(true);
      } catch {
        if (mounted) setIsAuthed(false);
        router.replace('/login');
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  if (isAuthed === null) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-4">Rated</h1>
        <p className="text-slate-700">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight mb-4">Rated</h1>
      <p className="text-slate-700 mb-6">Solve puzzles that mate in &le;{mValue} moves.</p>
      <ChessboardComp matein={matein} rated={true} />
    </main>
  );
}

export default function RatedPage() {
  return (
    <Suspense fallback={
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-4">Rated</h1>
        <p className="text-slate-700">Loading…</p>
      </main>
    }>
      <RatedPageContent />
    </Suspense>
  );
}


