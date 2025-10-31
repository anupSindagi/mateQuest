'use client';

import { FormEvent, useCallback, useState } from 'react';
import Link from 'next/link';
import { getAppwriteAccount, getAppwriteDatabases } from '@/lib/appwrite';
import { ID } from 'appwrite';

export default function SignupPage() {
  const [username, setUsername] = useState('');
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
      const databases = getAppwriteDatabases();

      const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID as string | undefined;
      const profilesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION as string | undefined;
      if (!databaseId || !profilesCollectionId) {
        throw new Error('Missing Appwrite DB config. Set NEXT_PUBLIC_APPWRITE_DATABASE and NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION');
      }

      const trimmedUsername = username.trim();
      const trimmedEmail = email.trim();

      // Guard: create a username document with ID=username. If exists -> conflict.
      await databases.createDocument(databaseId, profilesCollectionId, trimmedUsername,{
        email: trimmedEmail,
      });

      try {
        const userId = ID.unique();
        await account.create(userId, trimmedEmail, password, trimmedUsername);
        await account.createEmailPasswordSession(trimmedEmail, password);
      } catch (err) {
        // Rollback reserved username on failure
        try {
          await databases.deleteDocument(databaseId, profilesCollectionId, trimmedUsername);
        } catch {}
        throw err;
      }

      window.location.href = '/';
    } catch (err: unknown) {
      let message = (err as Error)?.message || 'Sign up failed';
      // Basic conflict hint
      if (message.includes('409') || message.toLowerCase().includes('conflict')) {
        message = 'Username is already taken';
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [username, email, password]);

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-6xl px-4">
      <div className="w-full max-w-sm mx-auto border border-slate-200 rounded-lg p-6 shadow-sm bg-white">
        <h1 className="text-xl font-semibold mb-4">Create account</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="username" className="text-sm text-slate-700">Username</label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="yourname"
            />
          </div>
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
            {isLoading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </p>
      </div>
      </div>
    </main>
  );
}


