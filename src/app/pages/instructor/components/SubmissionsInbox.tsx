// Tutor "Submissions" inbox — review and grade every student submission
// across all of the tutor's courses in one place.
//
// Submissions are grouped per (lesson + student): all of a student's attempts
// for one assignment sit together (newest first), each downloadable and
// gradable, with the prior graded attempts kept as history. Different
// assignments / students are separate cards.

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { toast } from 'sonner';
import { Download, Inbox, RefreshCw, CheckCircle2, Clock, History } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Skeleton } from '@/app/components/ui/skeleton';
import { EmptyState } from '@/app/components/ui/EmptyState';
import {
  assignmentApi,
  mediaUrl,
  fileNameFromUrl,
  submissionStudentName,
  type AssignmentSubmissionApi,
} from '@/app/services/api';

type StatusFilter = 'ALL' | 'SUBMITTED' | 'GRADED';

function initials(sub: AssignmentSubmissionApi) {
  return submissionStudentName(sub).slice(0, 2).toUpperCase();
}

/** Every file URL in a submission (multi `files`, else single `file`). */
function submissionFileUrls(sub: AssignmentSubmissionApi): string[] {
  if (sub.files && sub.files.length) return sub.files.map((f) => f.url);
  return sub.file ? [sub.file] : [];
}

function StatusPill({ status }: { status: string }) {
  const graded = status === 'GRADED';
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider',
        graded
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/30'
          : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/30',
      ].join(' ')}
    >
      {graded ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {status}
    </span>
  );
}

function FileLink({ url }: { url: string }) {
  return (
    <a
      href={mediaUrl(url)}
      target="_blank"
      rel="noreferrer"
      download
      title={fileNameFromUrl(url)}
      className="inline-flex items-center gap-1.5 max-w-[200px] text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:underline"
    >
      <Download className="w-4 h-4 shrink-0" />
      <span className="truncate">{fileNameFromUrl(url)}</span>
    </a>
  );
}

function GradeForm({
  submission,
  onSaved,
}: {
  submission: AssignmentSubmissionApi;
  onSaved: (next: AssignmentSubmissionApi) => void;
}) {
  const [grade, setGrade] = useState(submission.grade ?? '');
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!grade.trim() && !feedback.trim()) {
      toast.error('Add a grade or a comment before saving.');
      return;
    }
    try {
      setSaving(true);
      const next = await assignmentApi.grade(submission.id, { grade: grade.trim(), feedback });
      onSaved(next);
      toast.success('Grade saved. The student has been notified.');
    } catch (err) {
      toast.error((err as Error | undefined)?.message ?? 'Could not save grade.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2">
        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
            Grade / rating
          </label>
          <Input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="A, 8/10, 95%"
            className="bg-white dark:bg-slate-900"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
            Comment to the student
          </label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Leave feedback — what was good, what to improve…"
            className="min-h-[60px] text-sm bg-white dark:bg-slate-900"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {saving ? 'Submitting…' : 'Submit'}
        </Button>
      </div>
    </form>
  );
}

function AttemptRow({
  sub,
  attemptNo,
  isLatest,
  onSaved,
}: {
  sub: AssignmentSubmissionApi;
  attemptNo: number;
  isLatest: boolean;
  onSaved: (next: AssignmentSubmissionApi) => void;
}) {
  return (
    <div
      className={[
        'rounded-xl border p-3 space-y-3',
        isLatest
          ? 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40'
          : 'border-slate-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-950',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Attempt {attemptNo}
          </span>
          {isLatest && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
              Latest
            </span>
          )}
          <span className="text-[11px] text-slate-400">
            {new Date(sub.created_at).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <StatusPill status={sub.status} />
          {submissionFileUrls(sub).map((url, i) => (
            <FileLink key={i} url={url} />
          ))}
        </div>
      </div>

      {sub.note && (
        <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 rounded-lg p-2.5 border border-slate-200 dark:border-slate-800">
          {sub.note}
        </p>
      )}

      <GradeForm submission={sub} onSaved={onSaved} />
    </div>
  );
}

export function SubmissionsInbox() {
  const [submissions, setSubmissions] = useState<AssignmentSubmissionApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('ALL');

  const load = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const rows = await assignmentApi.tutorInbox();
      setSubmissions(rows ?? []);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upsert = (next: AssignmentSubmissionApi) =>
    setSubmissions((prev) => prev.map((row) => (row.id === next.id ? next : row)));

  // Group every attempt by (lesson + student); newest attempt first.
  const groups = useMemo(() => {
    const map = new Map<string, AssignmentSubmissionApi[]>();
    for (const sub of submissions) {
      const key = `${sub.lesson}|${sub.student}`;
      const list = map.get(key);
      if (list) list.push(sub);
      else map.set(key, [sub]);
    }
    return Array.from(map.values())
      .map((attempts) =>
        [...attempts].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      )
      .sort(
        (a, b) => new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime(),
      );
  }, [submissions]);

  const counts = useMemo(() => {
    let submitted = 0;
    let graded = 0;
    for (const g of groups) {
      if (g[0].status === 'GRADED') graded += 1;
      else submitted += 1;
    }
    return { all: groups.length, submitted, graded };
  }, [groups]);

  const visibleGroups = useMemo(() => {
    if (filter === 'ALL') return groups;
    return groups.filter((g) => g[0].status === filter);
  }, [groups, filter]);

  const tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: counts.all },
    { key: 'SUBMITTED', label: 'Awaiting review', count: counts.submitted },
    { key: 'GRADED', label: 'Graded', count: counts.graded },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Student submissions</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Review assignment uploads from your courses, leave a grade and a comment. Every
            student's attempts are grouped together.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {refreshing && (
            <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-300" aria-live="polite">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Refreshing…
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            disabled={refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter pills */}
      <div role="tablist" className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(tab.key)}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                active
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${active ? 'text-indigo-500 dark:text-indigo-300' : 'text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : visibleGroups.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-16 h-16" />}
          title={
            filter === 'GRADED'
              ? 'No graded submissions yet.'
              : filter === 'SUBMITTED'
                ? 'Nothing awaiting review.'
                : 'No submissions yet.'
          }
        />
      ) : (
        <ul className={`space-y-3 transition-opacity ${refreshing ? 'opacity-60' : 'opacity-100'}`}>
          {visibleGroups.map((attempts) => {
            const latest = attempts[0];
            const history = attempts.slice(1);
            return (
              <li
                key={`${latest.lesson}|${latest.student}`}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm p-4 sm:p-5 space-y-4"
              >
                {/* Student + assignment header */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-sm font-semibold shrink-0">
                    {initials(latest)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100">
                      {submissionStudentName(latest)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {latest.course_title ? `${latest.course_title} · ` : ''}
                      {latest.lesson_title ?? 'Assignment'}
                      {attempts.length > 1 ? ` · ${attempts.length} attempts` : ''}
                    </p>
                  </div>
                </div>

                {/* Latest attempt */}
                <AttemptRow sub={latest} attemptNo={attempts.length} isLatest onSaved={upsert} />

                {/* Prior attempts (history) */}
                {history.length > 0 && (
                  <details className="group">
                    <summary className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200">
                      <History className="w-3.5 h-3.5" />
                      {history.length} earlier attempt{history.length === 1 ? '' : 's'}
                    </summary>
                    <div className="mt-2 space-y-2">
                      {history.map((sub, i) => (
                        <AttemptRow
                          key={sub.id}
                          sub={sub}
                          attemptNo={history.length - i}
                          isLatest={false}
                          onSaved={upsert}
                        />
                      ))}
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
