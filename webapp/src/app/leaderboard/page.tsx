'use client';

import { useState, useEffect } from 'react';
import { getAppwriteDatabases, getAppwriteAccount } from '@/lib/appwrite';
import { Query } from 'appwrite';

interface MateData {
  m3: number;
  m6: number;
  m9: number;
  m12: number;
  m15: number;
}

interface Profile {
  username: string;
  email: string;
  practice: MateData;
  rated: MateData;
  total: number;
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<'practice' | 'rated'>('practice');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [userRank, setUserRank] = useState<number>(0);
  const ITEMS_PER_PAGE = 25;

  useEffect(() => {
    checkAuthAndFetchUser();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchLeaderboard();
  }, [activeTab]);

  useEffect(() => {
    fetchLeaderboard();
  }, [currentPage, activeTab]);

  useEffect(() => {
    if (currentUsername) {
      fetchCurrentUserProfile(currentUsername);
    } else {
      setUserProfile(null);
      setUserRank(0);
    }
  }, [currentUsername, activeTab]);

  async function checkAuthAndFetchUser() {
    try {
      const account = getAppwriteAccount();
      const user = await account.get();
      setCurrentUsername(user.name || null);
    } catch {
      setCurrentUsername(null);
    }
  }

  async function fetchLeaderboard() {
    try {
      setLoading(true);
      setError(null);
      
      const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID as string;
      const profileCollectionId = 'profiles';
      
      if (!databaseId) {
        throw new Error('Missing Appwrite configuration');
      }

      const databases = getAppwriteDatabases();
      
      // Use Query with orderBy, limit, and offset for proper pagination
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const orderField = activeTab === 'rated' ? 'rated_total' : 'practice_total';
      const res: any = await databases.listDocuments(
        databaseId, 
        profileCollectionId,
        [
          Query.orderDesc(orderField),
          Query.limit(ITEMS_PER_PAGE),
          Query.offset(offset)
        ]
      );

      if (!res?.documents) {
        setProfiles([]);
        return;
      }

      // Parse data for each profile
      const parsedProfiles = res.documents.map((doc: any) => {
        const parseMateData = (raw: string | undefined): MateData => {
          let data = { m3: 0, m6: 0, m9: 0, m12: 0, m15: 0 };
          if (raw && typeof raw === 'string') {
            try {
              data = JSON.parse(raw);
            } catch {
              try {
                const fixed = raw.replace(/([,{]\s*)(m3|m6|m9|m12|m15)(\s*:)/g, '$1"$2"$3');
                data = JSON.parse(fixed);
              } catch {
                data = { m3: 0, m6: 0, m9: 0, m12: 0, m15: 0 };
              }
            }
          }
          return {
            m3: Number(data?.m3 ?? 0),
            m6: Number(data?.m6 ?? 0),
            m9: Number(data?.m9 ?? 0),
            m12: Number(data?.m12 ?? 0),
            m15: Number(data?.m15 ?? 0)
          };
        };

        return {
          username: doc.$id,
          email: doc.email || '',
          practice: parseMateData(doc.practice),
          rated: parseMateData(doc.rated),
          total: activeTab === 'rated' ? Number(doc.rated_total ?? 0) : Number(doc.practice_total ?? 0)
        };
      });

      setProfiles(parsedProfiles);
      
      // Set total from response
      if (typeof res.total === 'number') {
        setTotalProfiles(res.total);
      }
      
      // Re-fetch user profile after leaderboard loads to update it
      if (currentUsername) {
        fetchCurrentUserProfile(currentUsername);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCurrentUserProfile(username: string) {
    try {
      const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID as string;
      const profileCollectionId = 'profiles';
      const databases = getAppwriteDatabases();
      
      const userDoc: any = await databases.getDocument(databaseId, profileCollectionId, username);
      
      const parseMateData = (raw: string | undefined): MateData => {
        let data = { m3: 0, m6: 0, m9: 0, m12: 0, m15: 0 };
        if (raw && typeof raw === 'string') {
          try {
            data = JSON.parse(raw);
          } catch {
            try {
              const fixed = raw.replace(/([,{]\s*)(m3|m6|m9|m12|m15)(\s*:)/g, '$1"$2"$3');
              data = JSON.parse(fixed);
            } catch {
              data = { m3: 0, m6: 0, m9: 0, m12: 0, m15: 0 };
            }
          }
        }
        return {
          m3: Number(data?.m3 ?? 0),
          m6: Number(data?.m6 ?? 0),
          m9: Number(data?.m9 ?? 0),
          m12: Number(data?.m12 ?? 0),
          m15: Number(data?.m15 ?? 0)
        };
      };

      const userProfile: Profile = {
        username: userDoc.$id,
        email: userDoc.email || '',
        practice: parseMateData(userDoc.practice),
        rated: parseMateData(userDoc.rated),
        total: activeTab === 'rated' ? Number(userDoc.rated_total ?? 0) : Number(userDoc.practice_total ?? 0)
      };

      setUserProfile(userProfile);

      // Fetch rank by counting profiles with higher total
      const totalField = activeTab === 'rated' ? 'rated_total' : 'practice_total';
      const countRes: any = await databases.listDocuments(
        databaseId,
        profileCollectionId,
        [
          Query.greaterThan(totalField, userProfile.total),
          Query.limit(1) // Just need the total count, not the documents
        ]
      );
      // Use the total field from response which gives total count
      const profilesAboveUser = typeof countRes.total === 'number' ? countRes.total : 0;
      setUserRank(profilesAboveUser + 1);
    } catch {
      setUserProfile(null);
      setUserRank(0);
    }
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-6xl px-4">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Leaderboard</h1>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('practice')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'practice'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Practice
          </button>
          <button
            onClick={() => setActiveTab('rated')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'rated'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Rated
          </button>
        </div>
      </div>

      {/* Content */}
      <>
        {loading ? (
          <p className="text-gray-500">Loading leaderboard...</p>
        ) : error ? (
          <p className="text-red-500">Error: {error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    M3
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    M6
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    M9
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    M12
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    M15
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* User's highlighted row */}
                {userProfile && (
                  <tr className="bg-blue-100 border-2 border-blue-400">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900">
                      #{userRank}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900">
                      {userProfile.username} (You)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-800 text-center">
                      {activeTab === 'rated' ? (userProfile.rated.m3 || 0) : (userProfile.practice.m3 || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-800 text-center">
                      {activeTab === 'rated' ? (userProfile.rated.m6 || 0) : (userProfile.practice.m6 || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-800 text-center">
                      {activeTab === 'rated' ? (userProfile.rated.m9 || 0) : (userProfile.practice.m9 || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-800 text-center">
                      {activeTab === 'rated' ? (userProfile.rated.m12 || 0) : (userProfile.practice.m12 || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-800 text-center">
                      {activeTab === 'rated' ? (userProfile.rated.m15 || 0) : (userProfile.practice.m15 || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900 text-center">
                      {userProfile.total}
                    </td>
                  </tr>
                )}
                {profiles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                      No data available
                    </td>
                  </tr>
                ) : (
                  profiles.map((profile, index) => {
                    const data = activeTab === 'rated' ? profile.rated : profile.practice;
                    return (
                      <tr key={profile.username} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {profile.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {data.m3 || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {data.m6 || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {data.m9 || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {data.m12 || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {data.m15 || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                          {profile.total}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && !error && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-500">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalProfiles)} of {totalProfiles} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage * ITEMS_PER_PAGE >= totalProfiles}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </>
      </div>
    </main>
  );
}


