// Per-kind lesson renderer. One component per LessonKind.
// Kept dependency-free and styled to match the existing Learn page.

import { useEffect, useState } from 'react';
import { CheckCircle, Clock3, Download, ExternalLink, FileText, History, PencilLine, PlayCircle, Sparkles, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { FileInput } from '@/app/components/ui/FileInput';
import { assignmentApi, exerciseApi, discussionApi, mediaUrl, fileNameFromUrl, type AssignmentSubmissionApi, type DiscussionPostApi, type ExerciseSubmissionApi } from '@/app/services/api';
import { type ApiLesson, KIND_META, normalizeHints } from './lessonKind';
import { MiniMarkdown } from './miniMarkdown';
import { CustomVideoPlayer } from './CustomVideoPlayer';
import { currentUserScope } from '@/app/utils/userScope';

const EXERCISE_CODE_STORAGE_PREFIX = 'da_exercise_code';
function exerciseCodeStorageKey(lessonId: string) {
  return `${EXERCISE_CODE_STORAGE_PREFIX}:${currentUserScope()}:${lessonId}`;
}

export interface LessonRendererProps {
  lesson: ApiLesson;
  isCompleted: boolean;
  onMarkComplete: () => void;
  /** True when the lesson has an attached follow-up quiz the student can take. */
  hasFollowUpQuiz?: boolean;
  /** True when the student already passed the attached quiz. */
  followUpQuizPassed?: boolean;
  /** Called when the student decides to take the follow-up quiz. */
  onStartFollowUpQuiz?: () => void;
  /** Render slot for an attached quiz tab/panel, if the parent decides to show it. */
  quizSlot?: React.ReactNode;
}

/**
 * CompletionRow: Mark-as-complete button + (when the lesson has a follow-up
 * quiz) an attention-grabbing "Take the quiz" CTA. The CTA pulses for a few
 * seconds after the lesson is completed so the student notices it.
 */
function CompletionRow({
  done,
  onComplete,
  hasFollowUpQuiz,
  followUpQuizPassed,
  onStartFollowUpQuiz,
}: {
  done: boolean;
  onComplete: () => void;
  hasFollowUpQuiz?: boolean;
  followUpQuizPassed?: boolean;
  onStartFollowUpQuiz?: () => void;
}) {
  // Animate-in the quiz CTA when `done` flips true.
  const [highlight, setHighlight] = useState(false);
  useEffect(() => {
    if (done && hasFollowUpQuiz && !followUpQuizPassed) {
      setHighlight(true);
      const t = window.setTimeout(() => setHighlight(false), 6000);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [done, hasFollowUpQuiz, followUpQuizPassed]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        onClick={onComplete}
        disabled={done}
        className={[
          'shadow-sm transition-all',
          done
            ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/40 hover:bg-emerald-500/10 cursor-default'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white',
        ].join(' ')}
      >
        {done ? (<><CheckCircle className="w-4 h-4 mr-2" /> Completed</>) : 'Mark as complete'}
      </Button>

      {/* Follow-up quiz CTA: appears as soon as the lesson is marked complete. */}
      {done && hasFollowUpQuiz && onStartFollowUpQuiz && (
        <button
          type="button"
          onClick={onStartFollowUpQuiz}
          className={[
            'relative inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white shadow-lg',
            'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500',
            'transition-transform hover:scale-[1.02] active:scale-95',
            'animate-in fade-in slide-in-from-right-2 duration-500',
          ].join(' ')}
        >
          {highlight && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-xl ring-2 ring-pink-400/70 animate-ping"
            />
          )}
          <Sparkles className="w-4 h-4" />
          {followUpQuizPassed ? 'Retake quiz' : 'Solve quiz to earn coins!'}
          <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
        </button>
      )}

      {done && hasFollowUpQuiz && followUpQuizPassed && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
          <CheckCircle className="w-3.5 h-3.5" /> Quiz passed
        </span>
      )}
    </div>
  );
}

// Backwards-compat shim — most call-sites still pass `CompleteButton` style props.
function CompleteButton({ done, onClick }: { done: boolean; onClick: () => void }) {
  return <CompletionRow done={done} onComplete={onClick} />;
}

function KindBadge({ kind }: { kind: keyof typeof KIND_META }) {
  const meta = KIND_META[kind];
  const Icon = meta.Icon;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${meta.bgTint} ${meta.color} text-xs font-semibold uppercase tracking-wide`}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </div>
  );
}

function LessonHeader({ lesson, kind, extra }: { lesson: ApiLesson; kind: keyof typeof KIND_META; extra?: React.ReactNode }) {
  return (
    <header className="mb-5 flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <KindBadge kind={kind} />
        {typeof lesson.duration_min === 'number' && lesson.duration_min > 0 && (
          <span className="text-xs text-slate-400">~{lesson.duration_min} min</span>
        )}
        {extra}
      </div>
      <h1 className="text-2xl font-bold text-white leading-tight">{lesson.title}</h1>
      {lesson.desc && <p className="text-slate-400 text-sm leading-relaxed">{lesson.desc}</p>}
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO
// ─────────────────────────────────────────────────────────────────────────────
export function VideoLessonRenderer({
  lesson,
  isCompleted,
  onMarkComplete,
  hasFollowUpQuiz,
  followUpQuizPassed,
  onStartFollowUpQuiz,
}: LessonRendererProps) {
  return (
    <article className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="bg-black flex items-center justify-center flex-shrink-0" style={{ height: '60%' }}>
        {lesson.video ? (
          <CustomVideoPlayer
            src={lesson.video}
            captions={lesson.captions ?? null}
            persistKey={lesson.id}
          />
        ) : (
          <div className="text-center">
            <PlayCircle className="w-20 h-20 text-indigo-400/70 mx-auto mb-4" />
            <p className="text-sm text-slate-500 mt-1">No video uploaded for this lesson.</p>
          </div>
        )}
      </div>
      <div className="p-6 bg-slate-900/70 overflow-y-auto flex-1 min-h-0">
        <LessonHeader lesson={lesson} kind="VIDEO" />
        {lesson.content_md && <MiniMarkdown source={lesson.content_md} />}
        {lesson.additional_task?.trim() && (
          <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
            <div className="flex items-center gap-2 mb-2 text-slate-300">
              <PencilLine className="w-4 h-4 text-emerald-300" />
              <span className="text-xs uppercase tracking-wider">Additional task</span>
            </div>
            <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">
              {lesson.additional_task}
            </p>
          </div>
        )}
        {lesson.presentation && (
          <div className="mt-4">
            <a
              href={lesson.presentation}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-colors"
            >
              Open presentation <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
        <div className="mt-6">
          <CompletionRow
            done={isCompleted}
            onComplete={onMarkComplete}
            hasFollowUpQuiz={hasFollowUpQuiz}
            followUpQuizPassed={followUpQuizPassed}
            onStartFollowUpQuiz={onStartFollowUpQuiz}
          />
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE  (Reading)
// ─────────────────────────────────────────────────────────────────────────────
export function ArticleLessonRenderer({ lesson, isCompleted, onMarkComplete, hasFollowUpQuiz, followUpQuizPassed, onStartFollowUpQuiz }: LessonRendererProps) {
  return (
    <article className="flex-1 overflow-y-auto bg-slate-900/70 min-h-0">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <LessonHeader lesson={lesson} kind="ARTICLE" />
        <MiniMarkdown source={lesson.content_md ?? 'No content has been added for this reading yet.'} />
        {lesson.attachments?.length ? (
          <div className="mt-6 border-t border-slate-700 pt-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-slate-400">Attachments</p>
            {lesson.attachments.map((a, idx) => (
              <a
                key={a.id ?? idx}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200"
              >
                <Download className="w-4 h-4" /> {a.label}
              </a>
            ))}
          </div>
        ) : null}
        <div className="mt-8">
          <CompletionRow
            done={isCompleted}
            onComplete={onMarkComplete}
            hasFollowUpQuiz={hasFollowUpQuiz}
            followUpQuizPassed={followUpQuizPassed}
            onStartFollowUpQuiz={onStartFollowUpQuiz}
          />
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHEATSHEET
// ─────────────────────────────────────────────────────────────────────────────
export function CheatsheetLessonRenderer({ lesson, isCompleted, onMarkComplete, hasFollowUpQuiz, followUpQuizPassed, onStartFollowUpQuiz }: LessonRendererProps) {
  return (
    <article className="flex-1 overflow-y-auto bg-slate-900/70 min-h-0">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <LessonHeader lesson={lesson} kind="CHEATSHEET" />
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <MiniMarkdown source={lesson.content_md ?? 'No cheatsheet content yet.'} />
        </div>
        {lesson.presentation && (
          <div className="mt-4">
            <a
              href={lesson.presentation}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-sm font-medium text-white transition-colors"
            >
              <Download className="w-4 h-4" /> Download cheatsheet
            </a>
          </div>
        )}
        <div className="mt-6">
          <CompletionRow
            done={isCompleted}
            onComplete={onMarkComplete}
            hasFollowUpQuiz={hasFollowUpQuiz}
            followUpQuizPassed={followUpQuizPassed}
            onStartFollowUpQuiz={onStartFollowUpQuiz}
          />
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISE
// ─────────────────────────────────────────────────────────────────────────────
export function ExerciseLessonRenderer({ lesson, isCompleted, onMarkComplete, hasFollowUpQuiz, followUpQuizPassed, onStartFollowUpQuiz }: LessonRendererProps) {
  const ex = lesson.exercise ?? null;
  const hints = normalizeHints(ex?.hints, Number(ex?.hint_penalty_percent ?? 5) || 5);
  const storageKey = exerciseCodeStorageKey(lesson.id);

  // Code persistence across reloads + lesson navigation.
  const [code, setCode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) return saved;
    } catch { /* private mode etc. */ }
    return ex?.starter_code ?? '';
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setCode(saved ?? ex?.starter_code ?? '');
    } catch {
      setCode(ex?.starter_code ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, code); } catch { /* ignore */ }
  }, [storageKey, code]);

  const [submitted, setSubmitted] = useState<ExerciseSubmissionApi | null>(null);
  const [submittingCode, setSubmittingCode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    exerciseApi.mySubmission(lesson.id).then((s) => { if (!cancelled) setSubmitted(s); });
    return () => { cancelled = true; };
  }, [lesson.id]);

  const handleSubmitCode = async () => {
    if (!code.trim()) {
      toast.error('Write some code before submitting.');
      return;
    }
    try {
      setSubmittingCode(true);
      const saved = await exerciseApi.submit(lesson.id, code);
      setSubmitted(saved);
      toast.success('Work submitted.');
      if (!isCompleted) onMarkComplete();
    } catch (e) {
      toast.error((e as Error | undefined)?.message ?? 'Submission failed.');
    } finally {
      setSubmittingCode(false);
    }
  };

  const [hintIdx, setHintIdx] = useState(-1);
  const revealedHints = Math.max(hintIdx + 1, 0);
  const totalPenalty = hints.slice(0, revealedHints).reduce((sum, h) => sum + h.penalty_percent, 0);
  const currentMaxScore = Math.max(0, 100 - totalPenalty);

  // Solution is fetched on demand from the server so it never appears in
  // the page payload (and can't be grabbed via DevTools).
  const hasSolution = Boolean(ex?.has_solution ?? (ex?.solution && String(ex.solution).length > 0));
  const [solutionText, setSolutionText] = useState<string>('');
  const [showSolution, setShowSolution] = useState(false);
  const [fetchingSolution, setFetchingSolution] = useState(false);

  const toggleSolution = async () => {
    if (showSolution) { setShowSolution(false); return; }
    if (!solutionText) {
      try {
        setFetchingSolution(true);
        const resp = await exerciseApi.fetchSolution(lesson.id);
        setSolutionText(resp?.solution ?? '');
      } catch (e) {
        toast.error((e as Error | undefined)?.message ?? 'Solution could not be loaded.');
        return;
      } finally {
        setFetchingSolution(false);
      }
    }
    setShowSolution(true);
  };

  return (
    <article className="flex-1 overflow-y-auto bg-slate-900/70 min-h-0">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <LessonHeader lesson={lesson} kind="EXERCISE" extra={ex?.language ? (
          <span className="text-xs px-2 py-1 rounded bg-emerald-900/50 text-emerald-300 uppercase tracking-wider">
            {ex.language}
          </span>
        ) : null} />

        {lesson.content_md && <MiniMarkdown source={lesson.content_md} />}

        <div className="mt-4">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Your code</p>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="w-full min-h-[260px] font-mono text-sm rounded-xl border border-slate-700 bg-slate-950 text-slate-100 p-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
          />
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleSubmitCode}
              disabled={submittingCode}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
            >
              {submittingCode ? 'Submitting…' : submitted ? 'Resubmit work' : 'Submit work'}
            </Button>
            {submitted && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
                <CheckCircle className="w-3.5 h-3.5" />
                Submitted {new Date(submitted.updated_at || submitted.created_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {hints.length > 0 ? (
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Hints ({revealedHints}/{hints.length})
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Possible score is reduced by each revealed hint.{' '}
                  <span className="text-emerald-300">Current max: {currentMaxScore}%.</span>
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setHintIdx((n) => Math.min(n + 1, hints.length - 1))}
                disabled={hintIdx + 1 >= hints.length}
              >
                Reveal next hint (−{hints[Math.min(revealedHints, hints.length - 1)]?.penalty_percent ?? 0}%)
              </Button>
            </div>
            {revealedHints > 0 && (
              <ol className="mt-3 space-y-2 text-sm text-slate-200 list-decimal pl-5">
                {hints.slice(0, revealedHints).map((hint, idx) => (
                  <li key={idx}>
                    <span>{hint.text}</span>
                    <span className="ml-2 text-xs text-amber-300">
                      (−{hint.penalty_percent}% max score)
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}

        {hasSolution && (
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-slate-400">Reference solution</p>
              <Button size="sm" variant="outline" onClick={toggleSolution} disabled={fetchingSolution}>
                {fetchingSolution ? 'Loading…' : showSolution ? 'Hide' : 'Reveal'} solution
              </Button>
            </div>
            {showSolution && solutionText && (
              <pre className="mt-3 bg-slate-950 border border-slate-700 rounded-lg p-3 overflow-x-auto text-sm text-emerald-200">
                <code>{solutionText}</code>
              </pre>
            )}
            {showSolution && !solutionText && (
              <p className="mt-3 text-xs text-slate-400">No solution recorded.</p>
            )}
          </div>
        )}

        <div className="mt-8">
          <CompletionRow
            done={isCompleted}
            onComplete={onMarkComplete}
            hasFollowUpQuiz={hasFollowUpQuiz}
            followUpQuizPassed={followUpQuizPassed}
            onStartFollowUpQuiz={onStartFollowUpQuiz}
          />
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────────────
export function AssignmentLessonRenderer({ lesson, isCompleted, onMarkComplete }: LessonRendererProps) {
  const [submitFiles, setSubmitFiles] = useState<File[]>([]);
  const [submitNote, setSubmitNote] = useState('');
  const [submissions, setSubmissions] = useState<AssignmentSubmissionApi[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const allowMultiple = Boolean(lesson.allow_multiple_files);
  const latest = submissions[0] ?? null;
  const history = submissions.slice(1);

  // Files of a submission: prefer the `files` array, fall back to single `file`.
  const subFiles = (s: AssignmentSubmissionApi | null) => {
    if (!s) return [] as Array<{ url: string; name: string }>;
    if (s.files && s.files.length) return s.files.map((f) => ({ url: f.url, name: f.name }));
    return s.file ? [{ url: s.file, name: s.file }] : [];
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingExisting(true);
    assignmentApi
      .mySubmissions(lesson.id)
      .then((rows) => { if (!cancelled) setSubmissions(rows ?? []); })
      .catch(() => { if (!cancelled) setSubmissions([]); })
      .finally(() => { if (!cancelled) setLoadingExisting(false); });
    return () => { cancelled = true; };
  }, [lesson.id]);

  const handleSubmit = async () => {
    if (!submitFiles.length && !submitNote.trim()) {
      toast.error('Attach a file or write a note before submitting.');
      return;
    }
    try {
      setSubmitting(true);
      await assignmentApi.submit(lesson.id, { files: submitFiles, note: submitNote });
      const rows = await assignmentApi.mySubmissions(lesson.id);
      setSubmissions(rows ?? []);
      setSubmitFiles([]);
      setSubmitNote('');
      toast.success('Assignment submitted.');
      if (!isCompleted) onMarkComplete();
    } catch (e) {
      toast.error((e as Error | undefined)?.message ?? 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="flex-1 overflow-y-auto bg-slate-900/70 min-h-0">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <LessonHeader
          lesson={lesson}
          kind="ASSIGNMENT"
          extra={lesson.assignment_due_at ? (
            <span className="text-xs px-2 py-1 rounded bg-orange-900/50 text-orange-300">
              Due {new Date(lesson.assignment_due_at).toLocaleDateString()}
            </span>
          ) : null}
        />

        {lesson.assignment_instructions && (
          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
            <div className="flex items-center gap-2 mb-3 text-slate-300">
              <FileText className="w-4 h-4 text-orange-300" />
              <span className="text-xs uppercase tracking-wider">Instructions</span>
            </div>
            <MiniMarkdown source={lesson.assignment_instructions} />
          </div>
        )}

        {!loadingExisting && latest && (() => {
          const isGraded = latest.status === 'GRADED';
          // Awaiting rating = submitted but not yet graded by the tutor.
          const awaitingRating = !isGraded && !latest.grade && !latest.feedback;
          return (
            <div
              className={[
                'mt-5 rounded-2xl p-5 space-y-3 relative overflow-hidden',
                isGraded
                  ? 'border border-emerald-500/40 bg-emerald-500/10'
                  : 'border border-amber-500/40 bg-amber-500/5',
              ].join(' ')}
            >
              {awaitingRating && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-1 inline-flex w-4 h-4 rounded-full bg-amber-400/70 animate-ping"
                />
              )}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="inline-flex items-center gap-2">
                  <span className={[
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider',
                    isGraded
                      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/40'
                      : 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/40',
                  ].join(' ')}>
                    {isGraded ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock3 className="w-3.5 h-3.5" />}
                    {isGraded ? 'Graded' : 'Submitted · awaiting tutor rating'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(latest.updated_at || latest.created_at).toLocaleString()}
                  </span>
                </div>
                {subFiles(latest).length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    {subFiles(latest).map((f, i) => (
                      <a
                        key={i}
                        href={mediaUrl(f.url)}
                        target="_blank"
                        rel="noreferrer"
                        download
                        title={fileNameFromUrl(f.url)}
                        className="inline-flex items-center gap-1.5 max-w-[220px] text-sm font-medium text-indigo-300 hover:text-indigo-200"
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        <span className="truncate">{fileNameFromUrl(f.url)}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {latest.note && (
                <div className="rounded-lg bg-slate-900/60 border border-slate-700 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Your note</p>
                  <p className="text-sm text-slate-100 whitespace-pre-wrap">{latest.note}</p>
                </div>
              )}

              {(latest.grade || latest.feedback) && (
                <div className="rounded-lg bg-slate-900/70 border border-emerald-500/30 p-3 space-y-1.5">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-semibold">Tutor's review</p>
                  {latest.grade && (
                    <p className="text-sm text-amber-300">
                      Grade: <strong className="text-amber-200">{latest.grade}</strong>
                    </p>
                  )}
                  {latest.feedback && (
                    <p className="text-sm text-slate-100 whitespace-pre-wrap">{latest.feedback}</p>
                  )}
                </div>
              )}

              {awaitingRating && (
                <p className="text-xs text-amber-200/80">
                  Your work was sent to the tutor — you'll see the grade and feedback here as soon as it's reviewed.
                </p>
              )}
            </div>
          );
        })()}

        {history.length > 0 && (
          <details className="mt-4 group">
            <summary className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-pointer select-none hover:text-slate-200">
              <History className="w-3.5 h-3.5" />
              {history.length} earlier submission{history.length === 1 ? '' : 's'}
            </summary>
            <div className="mt-2 space-y-2">
              {history.map((sub) => (
                <div key={sub.id} className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-400">{new Date(sub.created_at).toLocaleString()}</span>
                    <div className="flex items-center gap-2">
                      <span className={[
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                        sub.status === 'GRADED'
                          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30',
                      ].join(' ')}>
                        {sub.status === 'GRADED' ? 'Graded' : 'Submitted'}
                      </span>
                      {subFiles(sub).map((f, i) => (
                        <a
                          key={i}
                          href={mediaUrl(f.url)}
                          target="_blank"
                          rel="noreferrer"
                          download
                          title={fileNameFromUrl(f.url)}
                          className="inline-flex items-center gap-1 max-w-[180px] text-xs font-medium text-indigo-300 hover:text-indigo-200"
                        >
                          <Download className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{fileNameFromUrl(f.url)}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                  {sub.note && <p className="text-xs text-slate-300 whitespace-pre-wrap">{sub.note}</p>}
                  {(sub.grade || sub.feedback) && (
                    <div className="rounded-lg bg-slate-900/70 border border-emerald-500/30 p-2.5 space-y-1">
                      {sub.grade && (
                        <p className="text-xs text-amber-300">Grade: <strong className="text-amber-200">{sub.grade}</strong></p>
                      )}
                      {sub.feedback && <p className="text-xs text-slate-200 whitespace-pre-wrap">{sub.feedback}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}

        <div className="mt-6 space-y-3">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
            {latest ? 'Submit a new version' : 'Your submission'}
          </p>
          <div>
            <label className="text-xs font-medium text-slate-300">{allowMultiple ? 'Files' : 'File'}</label>
            <div className="mt-1.5">
              {allowMultiple ? (
                <FileInput
                  variant="any"
                  multiple
                  values={submitFiles}
                  onValuesChange={setSubmitFiles}
                  hint="Any documents, images, archives, or code"
                  label="Drop files or click to add"
                />
              ) : (
                <FileInput
                  variant="any"
                  value={submitFiles[0] ?? null}
                  hint="Any document, image, archive, or code"
                  label="Drop file or click to browse"
                  onChange={(f) => setSubmitFiles(f ? [f] : [])}
                />
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300">Notes for the tutor</label>
            <textarea
              value={submitNote}
              onChange={(e) => setSubmitNote(e.target.value)}
              className="w-full mt-1.5 min-h-[100px] rounded-xl bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none p-3 text-sm text-slate-100 placeholder:text-slate-500"
              placeholder="Optional comments…"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
          >
            {submitting ? 'Submitting…' : latest ? 'Resubmit' : 'Submit assignment'}
          </Button>
          <CompleteButton done={isCompleted} onClick={onMarkComplete} />
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE
// ─────────────────────────────────────────────────────────────────────────────
export function ResourceLessonRenderer({ lesson, isCompleted, onMarkComplete }: LessonRendererProps) {
  return (
    <article className="flex-1 overflow-y-auto bg-slate-900/70 min-h-0">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <LessonHeader lesson={lesson} kind="RESOURCE" />
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-6 text-center">
          <p className="text-slate-200 mb-4">{lesson.content_md ?? 'External resource'}</p>
          {lesson.external_url && (
            <a
              href={lesson.external_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold"
            >
              Open resource <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
        {lesson.attachments?.length ? (
          <div className="mt-5 space-y-2">
            <p className="text-xs uppercase tracking-wider text-slate-400">Files</p>
            {lesson.attachments.map((a, idx) => (
              <a
                key={a.id ?? idx}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
              >
                <Download className="w-4 h-4" /> {a.label}
              </a>
            ))}
          </div>
        ) : null}
        <div className="mt-6">
          <CompleteButton done={isCompleted} onClick={onMarkComplete} />
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DISCUSSION
// ─────────────────────────────────────────────────────────────────────────────
function timeAgoShort(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function DiscussionLessonRenderer({ lesson, isCompleted, onMarkComplete }: LessonRendererProps) {
  const [posts, setPosts] = useState<DiscussionPostApi[]>([]);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    discussionApi
      .list(lesson.id)
      .then((rows) => { if (!cancelled) setPosts(rows ?? []); })
      .catch(() => { if (!cancelled) setPosts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lesson.id]);

  const handlePost = async () => {
    if (!answer.trim()) return;
    try {
      setPosting(true);
      await discussionApi.post(lesson.id, answer.trim());
      const rows = await discussionApi.list(lesson.id);
      setPosts(rows ?? []);
      setAnswer('');
      if (!isCompleted) onMarkComplete();
    } catch (e) {
      toast.error((e as Error | undefined)?.message ?? 'Could not post your answer.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <article className="flex-1 overflow-y-auto bg-slate-900/70 min-h-0">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <LessonHeader lesson={lesson} kind="DISCUSSION" />
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-5">
          <MiniMarkdown source={lesson.content_md ?? 'Share your answer below.'} />
        </div>

        {/* Public answer box */}
        <div className="mt-5">
          <label className="text-xs uppercase tracking-wider text-slate-400">Your public answer</label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full mt-2 min-h-[110px] rounded-lg bg-slate-800 border border-slate-700 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Write your answer for everyone to see…"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              onClick={handlePost}
              disabled={posting || !answer.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
            >
              {posting ? 'Posting…' : 'Post answer'}
            </Button>
            <CompleteButton done={isCompleted} onClick={onMarkComplete} />
          </div>
        </div>

        {/* Public answers (comment section) */}
        <div className="mt-7">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">
            {loading ? 'Answers' : `${posts.length} answer${posts.length === 1 ? '' : 's'}`}
          </p>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : posts.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No answers yet — be the first.</p>
          ) : (
            <ul className="space-y-3">
              {posts.map((p) => (
                <li key={p.id} className="rounded-xl border border-slate-700/70 bg-slate-800/60 p-4">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/15 text-indigo-300 text-xs font-semibold shrink-0">
                      {p.author_name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-slate-100">{p.author_name}</span>
                    <span className="text-[11px] text-slate-500">· {timeAgoShort(p.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap pl-[2.625rem]">{p.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}
