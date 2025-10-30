"use client";

import { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import Link from 'next/link';
import { getAppwriteAccount } from '@/lib/appwrite';

export default function Header() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const account = getAppwriteAccount();
        await account.get();
        if (mounted) setIsAuthed(true);
      } catch {
        if (mounted) setIsAuthed(false);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, []);

  const onLogout = async () => {
    const account = getAppwriteAccount();
    try {
      await account.deleteSession('current');
    } finally {
      window.location.href = '/';
    }
  };

  return (
    <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2" aria-label="Go to home">
            <Crown className="h-6 w-6 text-amber-600" aria-hidden />
            <span className="text-xl font-semibold tracking-tight">mateQuest</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/play" className="text-sm text-slate-700 hover:text-slate-900">
              play
            </Link>
            <Link href="/leaderboard" className="text-sm text-slate-700 hover:text-slate-900">
              leaderboard
            </Link>
            {isLoading ? null : (
              isAuthed ? (
                <button onClick={onLogout} className="text-sm text-slate-700 hover:text-slate-900">
                  logout
                </button>
              ) : (
                <Link href="/login" className="text-sm text-slate-700 hover:text-slate-900">
                  login
                </Link>
              )
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}


