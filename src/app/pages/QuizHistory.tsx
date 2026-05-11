import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router';
import { quizResultApi, type QuizResultEntry } from '@/app/services/api';
import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { Button } from '@/app/components/ui/button';
import { ArrowLeft, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20;

// ── Skeleton rows ──────────────────────────────────────────────────────────

function QuizSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-40" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-16" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-14" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-10" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-10" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-14" />
          </td>
        </tr>
      ))}
    </>
  );
}

function QuizSkeletonCards() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-100 dark:border-gray-800 p-4 space-y-2"
        >
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </>
  );
}

// ── Status cell ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'PASSED' | 'FAILED' }) {
  if (status === 'PASSED') {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
        Passed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
      <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
      Failed
    </span>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

function Pagination({ page, totalPages, onPrev, onNext }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-4 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrev}
        disabled={page === 1}
        aria-label="Previous page"
        className="flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        Prev
      </Button>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={page === totalPages}
        aria-label="Next page"
        className="flex items-center gap-1"
      >
        Next
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function QuizHistory() {
  const [allEntries, setAllEntries] = useState<QuizResultEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'done'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [page, setPage] = useState(1);

  const fetchHistory = useCallback(async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await quizResultApi.list();
      setAllEntries(res.data ?? []);
      setPage(1);
      setStatus('done');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load quiz history.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const totalPages = Math.max(1, Math.ceil(allEntries.length / PAGE_SIZE));
  const pageEntries = allEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Top bar */}
        <div className="mb-6">
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Profile
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-50">
            Quiz History
          </h1>
        </div>

        {/* States */}
        {status === 'error' && (
          <ErrorState
            description={errorMsg || undefined}
            onRetry={fetchHistory}
          />
        )}

        {status === 'done' && allEntries.length === 0 && (
          <EmptyState
            title="No quizzes yet."
            description="Take a quiz from one of your enrolled courses to get started."
            action={{ label: 'Browse courses', to: '/courses' }}
          />
        )}

        {/* Table — desktop (sm+) */}
        {(status === 'loading' || (status === 'done' && allEntries.length > 0)) && (
          <>
            <Card className="hidden sm:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60">
                      <th
                        scope="col"
                        className="py-3 px-4 text-left font-semibold text-gray-600 dark:text-gray-400"
                      >
                        Quiz
                      </th>
                      <th
                        scope="col"
                        className="py-3 px-4 text-left font-semibold text-gray-600 dark:text-gray-400"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="py-3 px-4 text-left font-semibold text-gray-600 dark:text-gray-400"
                      >
                        Score
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
                        Attempt
                      </th>
                      <th
                        scope="col"
                        className="py-3 px-4 text-left font-semibold text-gray-600 dark:text-gray-400"
                      >
                        Points
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {status === 'loading' ? (
                      <QuizSkeletonRows />
                    ) : (
                      pageEntries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                        >
                          <td className="py-3 px-4 text-gray-900 dark:text-gray-100 max-w-[260px]">
                            <span className="truncate block">{entry.quiz_title}</span>
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={entry.status} />
                          </td>
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300 tabular-nums">
                            {entry.correct_answers}/{entry.total_questions}
                          </td>
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300 tabular-nums">
                            {entry.stars > 0 ? entry.stars : '—'}
                          </td>
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300 tabular-nums">
                            {entry.attempt}
                          </td>
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300 tabular-nums">
                            {entry.total}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {status === 'done' && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            )}
          </>
        )}

        {/* Cards — mobile (< sm) */}
        {(status === 'loading' || (status === 'done' && allEntries.length > 0)) && (
          <div className="sm:hidden space-y-3">
            {status === 'loading' ? (
              <QuizSkeletonCards />
            ) : (
              <>
                {pageEntries.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug">
                          {entry.quiz_title}
                        </span>
                        <StatusBadge status={entry.status} />
                      </div>
                      <dl className="grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <div>
                          <dt className="font-medium text-gray-500 dark:text-gray-500">Score</dt>
                          <dd className="tabular-nums text-gray-800 dark:text-gray-200">
                            {entry.correct_answers}/{entry.total_questions}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-500 dark:text-gray-500">Stars</dt>
                          <dd className="tabular-nums text-gray-800 dark:text-gray-200">
                            {entry.stars > 0 ? entry.stars : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-500 dark:text-gray-500">Points</dt>
                          <dd className="tabular-nums text-gray-800 dark:text-gray-200">
                            {entry.total}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-500 dark:text-gray-500">Attempt</dt>
                          <dd className="tabular-nums text-gray-800 dark:text-gray-200">
                            {entry.attempt}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                ))}

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPrev={() => setPage((p) => Math.max(1, p - 1))}
                  onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                />
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
