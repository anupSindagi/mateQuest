'use client';

import { FormEvent, useCallback, useState } from 'react';
import type { OAuthProvider } from 'appwrite';
import { getAppwriteAccount } from '@/lib/appwrite';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const account = getAppwriteAccount();
      await account.createEmailPasswordSession(email.trim(), password);
      window.location.href = '/';
    } catch (err: unknown) {
      const message = (err as Error)?.message || 'Login failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [email, password]);

  const onGoogle = useCallback(async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const success = `${origin}/`;
    const failure = `${origin}/login`;
    const account = getAppwriteAccount();
    await account.createOAuth2Session('google' as OAuthProvider, success, failure);
  }, []);

  return (
    <main className="min-h-[60vh] w-full flex items-center justify-center">
      <div className="w-full max-w-sm border border-slate-200 rounded-lg p-6 shadow-sm bg-white">
        <h1 className="text-xl font-semibold mb-4">Login</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm text-slate-700">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm text-slate-700">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-slate-900 text-white py-2 text-sm disabled:opacity-60"
            aria-busy={isLoading}
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-2">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-xs text-slate-500">or</span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        {/* <button
          onClick={onGoogle}
          className="w-full rounded-md border border-slate-300 bg-white py-2 text-sm hover:bg-slate-50"
        >
          Continue with Google
        </button> */}

        <Link
          href="/signup"
          className="w-full inline-flex items-center justify-center rounded-md border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          Create account
        </Link>

      </div>
    </main>
  );
}


