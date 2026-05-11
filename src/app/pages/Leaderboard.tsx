import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router';
import { leaderboardApi, type LeaderboardEntry, type Tier } from '@/app/services/api';
import { useAuth } from '@/app/store/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { ArrowLeft, Trophy, Star, Coins } from 'lucide-react';

// ── Tier chip ──────────────────────────────────────────────────────────────

const TIER_COLORS: Record<Tier, string> = {
  BRONZE:
    'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700',
  SILVER:
    'bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
  GOLD:
    'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-700',
  PLATINUM:
    'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-900/40 dark:text-cyan-200 dark:border-cyan-700',
};

function TierChip({ tier }: { tier: Tier }) {
  const label = tier.charAt(0) + tier.slice(1).toLowerCase();
  return (
    <span
      role="img"
      aria-label={`${label} tier`}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${TIER_COLORS[tier]}`}
    >
      {label}
    </span>
  );
}

// ── Skeleton rows ──────────────────────────────────────────────────────────

function LeaderboardSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-6" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-32" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-5 w-16 rounded-full" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-12" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-12" />
          </td>
        </tr>
      ))}
    </>
  );
}

function LeaderboardSkeletonCards() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-100 dark:border-gray-800 p-4 space-y-2"
        >
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function Leaderboard() {
  const { user, leaderboardPosition } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'done'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchLeaderboard = useCallback(async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await leaderboardApi.list();
      setEntries(res.data ?? []);
      setStatus('done');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load leaderboard.');
      setStatus('error');
    }
  }, []);

  // Initial fetch + refetch when tab becomes visible (weekly window may roll)
  useEffect(() => {
    fetchLeaderboard();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchLeaderboard();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchLeaderboard]);

  // Use position from AuthContext (populated by refreshGamification which fetches
  // the fresh profile.username before matching) instead of user.name which may be
  // a display name that does not match the leaderboard's username field.
  const myEntry =
    leaderboardPosition !== null
      ? (entries.find((e) => e.position === leaderboardPosition) ?? null)
      : null;
  const myUsername = myEntry?.username ?? user?.name ?? '';

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Top bar */}
        <div className="mb-6">
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Profile
          </Link>

          <div className="mt-3 flex items-center gap-3">
            <Trophy
              className="w-7 h-7 text-yellow-500 dark:text-yellow-400 shrink-0"
              aria-hidden="true"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                Leaderboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Top learners this week.
              </p>
            </div>
          </div>
        </div>

        {/* Current-user pinned card or "not on board" banner */}
        {status === 'done' && (
          myEntry ? (
            <Card className="mb-6 border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Your standing this week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                    #{myEntry.position ?? '—'}
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                    {myEntry.username}
                  </span>
                  <TierChip tier={myEntry.tier} />
                  <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                    <Star className="w-4 h-4 text-yellow-500" aria-hidden="true" />
                    {myEntry.total_stars} stars
                  </span>
                  <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                    <Coins className="w-4 h-4 text-amber-500" aria-hidden="true" />
                    {myEntry.reward_coin} coins
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : (
            entries.length > 0 && (
              <div className="mb-6 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50/70 dark:bg-yellow-950/30 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
                Complete a quiz this week to enter the leaderboard.
              </div>
            )
          )
        )}

        {/* States */}
        {status === 'error' && (
          <ErrorState
            description={errorMsg || undefined}
            onRetry={fetchLeaderboard}
          />
        )}

        {status === 'done' && entries.length === 0 && (
          <EmptyState
            title="Leaderboard is empty this week."
            description="Be the first to finish a quiz and claim the top spot."
          />
        )}

        {/* Table — desktop (sm+) */}
        {(status === 'loading' || (status === 'done' && entries.length > 0)) && (
          <Card className="hidden sm:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60">
                    <th
                      scope="col"
                      className="py-3 px-4 text-left font-semibold text-gray-600 dark:text-gray-400 w-12"
                    >
                      #
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-4 text-left font-semibold text-gray-600 dark:text-gray-400"
                    >
                      User
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-4 text-left font-semibold text-gray-600 dark:text-gray-400"
                    >
                      Tier
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-4 text-left font-semibold text-gray-600 dark:text-gray-400"
                    >
                      Stars
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-4 text-left font-semibold text-gray-600 dark:text-gray-400"
                    >
                      Coins
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {status === 'loading' ? (
                    <LeaderboardSkeletonRows />
                  ) : (
                    entries.map((entry) => {
                      const isMe = myUsername && entry.username === myUsername;
                      return (
                        <tr
                          key={`${entry.username}-${entry.position}`}
                          className={
                            isMe
                              ? 'bg-purple-50/50 dark:bg-purple-950/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors'
                          }
                        >
                          <td className="py-3 px-4 font-mono text-gray-500 dark:text-gray-400">
                            {entry.position ?? '—'}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                            {entry.username}
                            {isMe && (
                              <span className="ml-2 text-xs text-purple-600 dark:text-purple-400 font-normal">
                                (you)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <TierChip tier={entry.tier} />
                          </td>
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                            <span className="flex items-center gap-1">
                              <Star
                                className="w-3.5 h-3.5 text-yellow-500"
                                aria-hidden="true"
                              />
                              {entry.total_stars}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                            <span className="flex items-center gap-1">
                              <Coins
                                className="w-3.5 h-3.5 text-amber-500"
                                aria-hidden="true"
                              />
                              {entry.reward_coin}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Cards — mobile (< sm) */}
        {(status === 'loading' || (status === 'done' && entries.length > 0)) && (
          <div className="sm:hidden space-y-3">
            {status === 'loading' ? (
              <LeaderboardSkeletonCards />
            ) : (
              entries.map((entry) => {
                const isMe = myUsername && entry.username === myUsername;
                return (
                  <div
                    key={`${entry.username}-${entry.position}`}
                    className={`rounded-lg border p-4 ${
                      isMe
                        ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-400 dark:text-gray-500 text-sm w-6 shrink-0">
                          #{entry.position ?? '—'}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {entry.username}
                          {isMe && (
                            <span className="ml-1.5 text-xs text-purple-600 dark:text-purple-400 font-normal">
                              (you)
                            </span>
                          )}
                        </span>
                      </div>
                      <TierChip tier={entry.tier} />
                    </div>
                    <div className="flex gap-5 text-sm text-gray-600 dark:text-gray-300">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-500" aria-hidden="true" />
                        {entry.total_stars} stars
                      </span>
                      <span className="flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                        {entry.reward_coin} coins
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </main>
  );
}
