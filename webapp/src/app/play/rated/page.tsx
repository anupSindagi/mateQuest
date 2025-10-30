"use client";

import { useEffect, useState } from 'react';
import { getAppwriteAccount } from '@/lib/appwrite';
import { useRouter } from 'next/navigation';

export default function RatedPage() {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const account = getAppwriteAccount();
        await account.get();
        if (mounted) setIsAuthed(true);
      } catch {
        if (mounted) setIsAuthed(false);
        router.replace('/login');
      }
    };
    run();
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
      <p className="text-slate-700">Solve puzzles to impact your rating and climb the leaderboard.</p>
    </main>
  );
}


