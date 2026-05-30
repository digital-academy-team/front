// Instructor lesson editor — kind-aware form.
// 1. Tutor first picks the lesson kind via a small card grid.
// 2. Editor then renders the field set relevant to that kind.
// 3. For quiz-attachable kinds, a toggle exposes the inline quiz mini-editor.

import type { LessonFormItem, QuizQuestionFormItem, QuizVariantFormItem } from '@/app/utils/instructorDashboard';
import { createEmptyHint, createEmptyQuizQuestion, createEmptyQuizVariant } from '@/app/utils/instructorDashboard';
import {
  DEFAULT_HINT_PENALTY_PERCENT,
  KIND_META,
  LESSON_KINDS,
  kindAllowsQuizAttach,
  type LessonExerciseHint,
  type LessonKind,
} from '@/app/pages/learn/lessonKind';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { FileInput } from '@/app/components/ui/FileInput';
import { Plus, Trash2, X, MinusCircle } from 'lucide-react';

type LessonKey = keyof LessonFormItem;

export interface LessonEditorProps {
  lesson: LessonFormItem;
  lessonIndex: number;
  unitIndex: number;
  onTextChange: (unitIndex: number, lessonIndex: number, key: LessonKey, value: string | number | boolean) => void;
  onFileChange: (unitIndex: number, lessonIndex: number, key: 'video' | 'captions' | 'presentation', file: File | null) => void;
  onKindChange: (unitIndex: number, lessonIndex: number, kind: LessonKind) => void;
  onExerciseChange?: (
    unitIndex: number,
    lessonIndex: number,
    key: 'language' | 'starter_code' | 'solution' | 'hint_penalty_percent',
    value: string | number,
  ) => void;
  onExerciseHintsChange?: (unitIndex: number, lessonIndex: number, hints: LessonExerciseHint[]) => void;
  attachedQuiz?: {
    title: string;
    description: string;
    time_limit_min?: number;
    show_timer?: boolean;
    questions: QuizQuestionFormItem[];
  } | null;
  onAttachedQuizChange?: (
    unitIndex: number,
    lessonIndex: number,
    quiz: { title: string; description: string; time_limit_min?: number; show_timer?: boolean; questions: QuizQuestionFormItem[] } | null,
  ) => void;
  onRemove?: (unitIndex: number, lessonIndex: number) => void;
  /** Absolute URLs of the already-uploaded media when editing a lesson. */
  existingMedia?: {
    video?: string | null;
    presentation?: string | null;
    captions?: string | null;
  };
}

function KindPicker({ selected, onSelect }: { selected: LessonKind; onSelect: (kind: LessonKind) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {LESSON_KINDS.map((kind) => {
        const meta = KIND_META[kind];
        const Icon = meta.Icon;
        const active = selected === kind;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onSelect(kind)}
            aria-pressed={active}
            className={[
              'group relative flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all',
              active
                ? `${meta.bgTint} ${meta.color} border-current shadow-sm`
                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900 dark:text-slate-300',
            ].join(' ')}
          >
            <span className={[
              'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
              active ? 'bg-white/10' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700',
            ].join(' ')}>
              <Icon className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold leading-tight">{meta.label}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
              {meta.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AttachedQuizMini({
  quiz,
  onChange,
}: {
  quiz: NonNullable<LessonEditorProps['attachedQuiz']>;
  onChange: (next: NonNullable<LessonEditorProps['attachedQuiz']>) => void;
}) {
  const setQuestion = (qIdx: number, key: 'question_text' | 'points', value: string | number) => {
    onChange({
      ...quiz,
      questions: quiz.questions.map((q, i) => (i === qIdx ? { ...q, [key]: value } : q)),
    });
  };
  const setVariant = (qIdx: number, vIdx: number, key: keyof QuizVariantFormItem, value: string | boolean) => {
    onChange({
      ...quiz,
      questions: quiz.questions.map((q, i) => {
        if (i !== qIdx) return q;
        if (key === 'is_correct') {
          return { ...q, variants: q.variants.map((v, j) => ({ ...v, is_correct: j === vIdx })) };
        }
        return { ...q, variants: q.variants.map((v, j) => (j === vIdx ? { ...v, [key]: value } : v)) };
      }),
    });
  };
  const addQuestion = () => onChange({ ...quiz, questions: [...quiz.questions, createEmptyQuizQuestion()] });
  const removeQuestion = (qIdx: number) =>
    onChange({ ...quiz, questions: quiz.questions.filter((_, i) => i !== qIdx) });
  const addVariant = (qIdx: number) =>
    onChange({
      ...quiz,
      questions: quiz.questions.map((q, i) =>
        i === qIdx ? { ...q, variants: [...q.variants, createEmptyQuizVariant(false)] } : q,
      ),
    });

  return (
    <div className="space-y-3 border-l-2 border-pink-500/40 pl-4">
      <Input
        placeholder="Attached quiz title"
        value={quiz.title}
        onChange={(e) => onChange({ ...quiz, title: e.target.value })}
      />
      <Textarea
        placeholder="Attached quiz description"
        value={quiz.description}
        onChange={(e) => onChange({ ...quiz, description: e.target.value })}
      />
      <div className="rounded-md border dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 p-3 space-y-2">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={Number(quiz.time_limit_min ?? 0) > 0}
            onChange={(e) => onChange({ ...quiz, time_limit_min: e.target.checked ? 10 : 0 })}
          />
          Add a quiz timer
        </label>
        {Number(quiz.time_limit_min ?? 0) > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-600 dark:text-slate-400">Time limit (minutes)</Label>
              <Input
                type="number"
                min="1"
                value={quiz.time_limit_min ?? 10}
                onChange={(e) => onChange({ ...quiz, time_limit_min: Number(e.target.value) })}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 self-end pb-2">
              Auto-submits at 0.
            </p>
          </div>
        )}
      </div>
      {quiz.questions.map((q, qIdx) => (
        <div key={qIdx} className="rounded-md border dark:border-slate-700 p-3 bg-white dark:bg-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">Question {qIdx + 1}</p>
            <button
              type="button"
              onClick={() => removeQuestion(qIdx)}
              disabled={quiz.questions.length <= 1}
              aria-label={`Remove question ${qIdx + 1}`}
              title="Remove this question"
              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <MinusCircle className="w-4 h-4" />
            </button>
          </div>
          <Input
            placeholder="Question text"
            value={q.question_text}
            onChange={(e) => setQuestion(qIdx, 'question_text', e.target.value)}
          />
          <div className="grid gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400">
              Points for this question
            </label>
            <Input
              type="number"
              min="1"
              value={q.points}
              onChange={(e) => setQuestion(qIdx, 'points', Number(e.target.value))}
            />
            <p className="text-xs text-gray-500 dark:text-slate-500">
              Used to calculate the quiz score when questions have different weight.
            </p>
          </div>
          {q.variants.map((v, vIdx) => (
            <div key={vIdx} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-center">
              <Input
                placeholder={`Variant ${vIdx + 1}`}
                value={v.text}
                onChange={(e) => setVariant(qIdx, vIdx, 'text', e.target.value)}
              />
              <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-slate-300">
                <input
                  type="radio"
                  name={`attached-quiz-${qIdx}`}
                  checked={v.is_correct}
                  onChange={() => setVariant(qIdx, vIdx, 'is_correct', true)}
                />
                Correct
              </label>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addVariant(qIdx)}>
            Add option
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
        Add question
      </Button>
    </div>
  );
}

export function LessonEditor({
  lesson,
  lessonIndex,
  unitIndex,
  onTextChange,
  onFileChange,
  onKindChange,
  onExerciseChange,
  onExerciseHintsChange,
  attachedQuiz,
  onAttachedQuizChange,
  onRemove,
  existingMedia,
}: LessonEditorProps) {
  const meta = KIND_META[lesson.kind];
  const Icon = meta.Icon;
  const updateHintText = (hintIndex: number, text: string) => {
    const next = lesson.exercise.hints.map((hint, index) =>
      index === hintIndex ? { ...hint, text } : hint,
    );
    onExerciseHintsChange?.(unitIndex, lessonIndex, next);
  };
  const updateHintPenalty = (hintIndex: number, penalty: number) => {
    const clamped = Math.max(0, Math.min(100, Number.isFinite(penalty) ? penalty : 0));
    const next = lesson.exercise.hints.map((hint, index) =>
      index === hintIndex ? { ...hint, penalty_percent: clamped } : hint,
    );
    onExerciseHintsChange?.(unitIndex, lessonIndex, next);
  };
  const removeHint = (hintIndex: number) => {
    onExerciseHintsChange?.(
      unitIndex,
      lessonIndex,
      lesson.exercise.hints.filter((_, index) => index !== hintIndex),
    );
  };
  const addHint = () => {
    const fallback = Number(lesson.exercise.hint_penalty_percent) || DEFAULT_HINT_PENALTY_PERCENT;
    onExerciseHintsChange?.(unitIndex, lessonIndex, [...lesson.exercise.hints, createEmptyHint(fallback)]);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ring-1 ring-inset ${meta.bgTint}`}>
            <Icon className={`w-4 h-4 ${meta.color}`} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Lesson {lessonIndex + 1}
            </p>
            <p className={`text-sm font-semibold ${meta.color}`}>{meta.label}</p>
          </div>
        </div>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
            onClick={() => onRemove(unitIndex, lessonIndex)}
            aria-label="Remove lesson"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Lesson type</Label>
        <KindPicker selected={lesson.kind} onSelect={(kind) => onKindChange(unitIndex, lessonIndex, kind)} />
      </div>

      <Input
        placeholder="Lesson title"
        value={lesson.title}
        onChange={(e) => onTextChange(unitIndex, lessonIndex, 'title', e.target.value)}
        required
      />
      <Textarea
        placeholder="Short description (shown in lesson lists)"
        value={lesson.desc}
        onChange={(e) => onTextChange(unitIndex, lessonIndex, 'desc', e.target.value)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-gray-600 dark:text-slate-400">Estimated duration (minutes)</Label>
          <Input
            type="number"
            min="0"
            value={lesson.duration_min || 0}
            onChange={(e) => onTextChange(unitIndex, lessonIndex, 'duration_min', Number(e.target.value))}
          />
        </div>
      </div>

      {lesson.kind === 'VIDEO' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Video file</Label>
            <FileInput
              variant="video"
              accept="video/*"
              value={lesson.video}
              existingUrl={existingMedia?.video ?? undefined}
              existingLabel="Current video — open / download"
              hint="MP4, MOV, MKV, or WEBM"
              label={existingMedia?.video ? 'Replace video' : 'Drop video or click to browse'}
              onChange={(file) => onFileChange(unitIndex, lessonIndex, 'video', file)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Presentation (optional)</Label>
            <FileInput
              variant="doc"
              accept=".pdf,.ppt,.pptx,.key"
              value={lesson.presentation}
              existingUrl={existingMedia?.presentation ?? undefined}
              existingLabel="Current slides — open / download"
              hint="PDF, PPT, PPTX, KEY"
              label={existingMedia?.presentation ? 'Replace slides' : 'Drop slides or click to browse'}
              onChange={(file) => onFileChange(unitIndex, lessonIndex, 'presentation', file)}
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Captions / subtitles (optional)
            </Label>
            <FileInput
              variant="doc"
              accept=".vtt,.srt"
              value={lesson.captions}
              existingUrl={existingMedia?.captions ?? undefined}
              existingLabel="Current captions — open / download"
              hint="WebVTT (.vtt) or SubRip (.srt). The student can toggle CC in the player."
              label={existingMedia?.captions ? 'Replace captions' : 'Drop a .vtt or .srt file'}
              onChange={(file) => onFileChange(unitIndex, lessonIndex, 'captions', file)}
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Additional task (optional)</Label>
            <Textarea
              value={lesson.additional_task}
              onChange={(e) => onTextChange(unitIndex, lessonIndex, 'additional_task', e.target.value)}
              placeholder="Short challenge tied to the video"
            />
          </div>
        </div>
      )}

      {(lesson.kind === 'ARTICLE' || lesson.kind === 'CHEATSHEET' || lesson.kind === 'DISCUSSION') && (
        <div className="space-y-1">
          <Label className="text-xs text-gray-600 dark:text-slate-400">
            {lesson.kind === 'DISCUSSION' ? 'Discussion prompt (Markdown)' : 'Body (Markdown)'}
          </Label>
          <Textarea
            value={lesson.content_md}
            onChange={(e) => onTextChange(unitIndex, lessonIndex, 'content_md', e.target.value)}
            placeholder={'# Heading\n**Bold**, `code`, [Link](https://example.com)'}
            className="min-h-[180px] font-mono text-sm"
          />
          {lesson.kind === 'CHEATSHEET' && (
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Downloadable cheatsheet file (optional)</Label>
              <FileInput
                variant="doc"
                accept=".pdf,.png,.jpg,.jpeg,.svg"
                value={lesson.presentation}
                existingUrl={existingMedia?.presentation ?? undefined}
                existingLabel="Current file — open / download"
                hint="PDF, PNG, JPG, or SVG"
                label={existingMedia?.presentation ? 'Replace file' : 'Drop file or click to browse'}
                onChange={(file) => onFileChange(unitIndex, lessonIndex, 'presentation', file)}
              />
            </div>
          )}
        </div>
      )}

      {lesson.kind === 'EXERCISE' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-600 dark:text-slate-400">Exercise prompt (Markdown)</Label>
            <Textarea
              value={lesson.content_md}
              onChange={(e) => onTextChange(unitIndex, lessonIndex, 'content_md', e.target.value)}
              placeholder="What should the student build?"
              className="min-h-[140px] font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-gray-600 dark:text-slate-400">Language</Label>
              <Input
                value={lesson.exercise.language}
                onChange={(e) => onExerciseChange?.(unitIndex, lessonIndex, 'language', e.target.value)}
                placeholder="python, javascript, sql…"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-600 dark:text-slate-400">Default new-hint penalty (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                className="w-32"
                value={lesson.exercise.hint_penalty_percent}
                onChange={(e) =>
                  onExerciseChange?.(unitIndex, lessonIndex, 'hint_penalty_percent', Number(e.target.value))
                }
              />
              <p className="text-xs text-gray-500 dark:text-slate-500">
                Pre-fills the penalty for new hints. You can override each hint below.
              </p>
            </div>
          </div>
          <div className="space-y-2 rounded-md border dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-xs text-gray-600 dark:text-slate-400">Hints</Label>
                <p className="text-xs text-gray-500 dark:text-slate-500">
                  Each hint has its own point-deduction percentage applied when the student reveals it.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addHint}>
                <Plus className="w-4 h-4 mr-1" /> Add hint
              </Button>
            </div>
            {lesson.exercise.hints.length === 0 ? (
              <p className="text-sm text-slate-500">No hints added.</p>
            ) : (
              <div className="space-y-2">
                {lesson.exercise.hints.map((hint, hintIndex) => (
                  <div
                    key={hintIndex}
                    className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-2 items-center"
                  >
                    <Input
                      value={hint.text}
                      onChange={(e) => updateHintText(hintIndex, e.target.value)}
                      placeholder={`Hint ${hintIndex + 1}`}
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={hint.penalty_percent}
                        onChange={(e) => updateHintPenalty(hintIndex, Number(e.target.value))}
                      />
                      <span className="text-xs text-slate-500">%</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => removeHint(hintIndex)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600 dark:text-slate-400">Starter code</Label>
            <Textarea
              value={lesson.exercise.starter_code}
              onChange={(e) => onExerciseChange?.(unitIndex, lessonIndex, 'starter_code', e.target.value)}
              className="min-h-[120px] font-mono text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600 dark:text-slate-400">Reference solution (optional)</Label>
            <Textarea
              value={lesson.exercise.solution}
              onChange={(e) => onExerciseChange?.(unitIndex, lessonIndex, 'solution', e.target.value)}
              className="min-h-[120px] font-mono text-sm"
            />
          </div>
        </div>
      )}

      {lesson.kind === 'ASSIGNMENT' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-600 dark:text-slate-400">Assignment instructions (Markdown)</Label>
            <Textarea
              value={lesson.assignment_instructions}
              onChange={(e) => onTextChange(unitIndex, lessonIndex, 'assignment_instructions', e.target.value)}
              className="min-h-[160px] font-mono text-sm"
              placeholder="What should the student produce and submit?"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-600 dark:text-slate-400">Due date (optional)</Label>
              <Input
                type="datetime-local"
                value={lesson.assignment_due_at}
                onChange={(e) => onTextChange(unitIndex, lessonIndex, 'assignment_due_at', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Reference file (optional)</Label>
              <FileInput
                variant="doc"
                value={lesson.presentation}
                existingUrl={existingMedia?.presentation ?? undefined}
                existingLabel="Current file — open / download"
                hint="Any file the student should reference"
                label={existingMedia?.presentation ? 'Replace file' : undefined}
                onChange={(file) => onFileChange(unitIndex, lessonIndex, 'presentation', file)}
              />
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              checked={lesson.allow_multiple_files}
              onChange={(e) => onTextChange(unitIndex, lessonIndex, 'allow_multiple_files', e.target.checked)}
            />
            Let students upload multiple files in one submission
          </label>
        </div>
      )}

      {lesson.kind === 'RESOURCE' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-600 dark:text-slate-400">External URL</Label>
            <Input
              type="url"
              value={lesson.external_url}
              onChange={(e) => onTextChange(unitIndex, lessonIndex, 'external_url', e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600 dark:text-slate-400">Short note (Markdown)</Label>
            <Textarea
              value={lesson.content_md}
              onChange={(e) => onTextChange(unitIndex, lessonIndex, 'content_md', e.target.value)}
              placeholder="Why this resource is useful"
              className="min-h-[80px] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Or attach a downloadable file</Label>
            <FileInput
              variant="doc"
              value={lesson.presentation}
              existingUrl={existingMedia?.presentation ?? undefined}
              existingLabel="Current file — open / download"
              hint="Any file the student can download"
              label={existingMedia?.presentation ? 'Replace file' : undefined}
              onChange={(file) => onFileChange(unitIndex, lessonIndex, 'presentation', file)}
            />
          </div>
        </div>
      )}

      {lesson.kind === 'QUIZ' && (
        <div className="rounded-md border border-pink-500/40 bg-pink-500/10 p-3 text-sm text-slate-200">
          This lesson is a standalone quiz. Either fill the inline editor below or use the dashboard&apos;s
          dedicated quiz creator later.
          {onAttachedQuizChange && (
            <div className="mt-3">
              <AttachedQuizMini
                quiz={
                  attachedQuiz ?? {
                    title: lesson.title || 'Quiz',
                    description: lesson.desc,
                    time_limit_min: 0,
                    show_timer: true,
                    questions: [createEmptyQuizQuestion()],
                  }
                }
                onChange={(next) => onAttachedQuizChange(unitIndex, lessonIndex, next)}
              />
            </div>
          )}
        </div>
      )}

      {kindAllowsQuizAttach(lesson.kind) && (
        <div className="border-t dark:border-slate-700 pt-3 space-y-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={lesson.attach_quiz}
              onChange={(e) => {
                const checked = e.target.checked;
                onTextChange(unitIndex, lessonIndex, 'attach_quiz', checked);
                if (checked && !attachedQuiz) {
                  onAttachedQuizChange?.(unitIndex, lessonIndex, {
                    title: `${lesson.title || 'Lesson'} quiz`,
                    description: '',
                    time_limit_min: 0,
                    show_timer: true,
                    questions: [createEmptyQuizQuestion()],
                  });
                }
                if (!checked) {
                  onAttachedQuizChange?.(unitIndex, lessonIndex, null);
                }
              }}
            />
            Add a follow-up quiz to this lesson
          </label>
          {lesson.attach_quiz && onAttachedQuizChange && (
            <AttachedQuizMini
              quiz={
                attachedQuiz ?? {
                  title: `${lesson.title || 'Lesson'} quiz`,
                  description: '',
                  time_limit_min: 0,
                  show_timer: true,
                  questions: [createEmptyQuizQuestion()],
                }
              }
              onChange={(next) => onAttachedQuizChange(unitIndex, lessonIndex, next)}
            />
          )}
        </div>
      )}
    </div>
  );
}
