// Tutor view of a lesson's submissions, grouped per student.

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { toast } from 'sonner';
import { Download, CheckCircle2, Clock, History } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import {
  assignmentApi,
  mediaUrl,
  fileNameFromUrl,
  submissionStudentName,
  type AssignmentSubmissionApi,
} from '@/app/services/api';

interface AssignmentSubmissionsPanelProps {
  lessonId: string;
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

function submissionFileUrls(sub: AssignmentSubmissionApi): string[] {
  if (sub.files && sub.files.length) return sub.files.map((f) => f.url);
  return sub.file ? [sub.file] : [];
}

function FileLink({ url }: { url: string }) {
  return (
    <a
      href={mediaUrl(url)}
      target="_blank"
      rel="noreferrer"
      download
      title={fileNameFromUrl(url)}
      className="inline-flex items-center gap-1.5 max-w-[180px] text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:underline"
    >
      <Download className="w-4 h-4 shrink-0" />
      <span className="truncate">{fileNameFromUrl(url)}</span>
    </a>
  );
}

function GradeForm({ submission, onSaved }: { submission: AssignmentSubmissionApi; onSaved: (next: AssignmentSubmissionApi) => void }) {
  const [grade, setGrade] = useState(submission.grade ?? '');
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const next = await assignmentApi.grade(submission.id, { grade: grade.trim(), feedback });
      onSaved(next);
      toast.success('Grade saved. The student has been notified.');
    } catch (e2) {
      toast.error((e2 as Error | undefined)?.message ?? 'Could not save grade.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-[120px_1fr_auto] gap-2 items-start">
      <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Grade (A, 8/10)" className="bg-white dark:bg-slate-900" />
      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Feedback to the student"
        className="min-h-[60px] text-sm bg-white dark:bg-slate-900"
      />
      <Button type="submit" size="sm" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white">
        {saving ? 'Submitting…' : 'Submit'}
      </Button>
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
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2 bg-slate-50/60 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500">Attempt {attemptNo}</span>
          {isLatest && <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Latest</span>}
          <span className="text-[11px] text-slate-400">{new Date(sub.created_at).toLocaleString()}</span>
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

export function AssignmentSubmissionsPanel({ lessonId }: AssignmentSubmissionsPanelProps) {
  const [submissions, setSubmissions] = useState<AssignmentSubmissionApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    assignmentApi
      .listForLesson(lessonId)
      .then((rows) => { if (!cancelled) setSubmissions(rows ?? []); })
      .catch(() => { if (!cancelled) setSubmissions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lessonId]);

  const upsert = (next: AssignmentSubmissionApi) =>
    setSubmissions((prev) => prev.map((row) => (row.id === next.id ? next : row)));

  // Group attempts by student (newest first).
  const groups = useMemo(() => {
    const map = new Map<string, AssignmentSubmissionApi[]>();
    for (const sub of submissions) {
      const list = map.get(sub.student);
      if (list) list.push(sub);
      else map.set(sub.student, [sub]);
    }
    return Array.from(map.values())
      .map((a) => [...a].sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()))
      .sort((a, b) => new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime());
  }, [submissions]);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
            Submissions
          </p>
          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">Student submissions</h4>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
          {loading ? '…' : groups.length}
        </span>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-slate-500 italic">No submissions yet.</p>
      ) : (
        <ul className="space-y-3">
          {groups.map((attempts) => {
            const latest = attempts[0];
            const history = attempts.slice(1);
            return (
              <li
                key={latest.student}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-950"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-sm font-semibold shrink-0">
                    {submissionStudentName(latest).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">
                      {submissionStudentName(latest)}
                    </p>
                    {attempts.length > 1 && (
                      <p className="text-[11px] text-slate-500">{attempts.length} attempts</p>
                    )}
                  </div>
                </div>

                <AttemptRow sub={latest} attemptNo={attempts.length} isLatest onSaved={upsert} />

                {history.length > 0 && (
                  <details className="group">
                    <summary className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200">
                      <History className="w-3.5 h-3.5" />
                      {history.length} earlier attempt{history.length === 1 ? '' : 's'}
                    </summary>
                    <div className="mt-2 space-y-2">
                      {history.map((sub, i) => (
                        <AttemptRow key={sub.id} sub={sub} attemptNo={history.length - i} isLatest={false} onSaved={upsert} />
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
