import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { toast } from 'sonner';
import { GripVertical, Plus, ListChecks, FolderOpen, Pencil } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Skeleton } from '@/app/components/ui/skeleton';
import { courseApi, quizApi, mediaUrl, type UserCourseItem } from '@/app/services/api';
import {
  type LessonFormItem,
  type QuizQuestionFormItem,
  type QuizVariantFormItem,
  createEmptyLesson,
  createEmptyQuizQuestion,
} from '@/app/utils/instructorDashboard';
import {
  DEFAULT_HINT_PENALTY_PERCENT,
  KIND_META,
  type ApiLesson,
  type LessonKind,
  inferKind,
  normalizeHints,
} from '@/app/pages/learn/lessonKind';
import { LessonEditor } from './LessonEditor';
import { AssignmentSubmissionsPanel } from './AssignmentSubmissionsPanel';

interface ManagerUnit {
  id: string;
  title: string;
  desc: string;
  lessons: ApiLesson[];
}

interface ActivityStep {
  id: string;
  label: string;
  at: string;
}

type DragPayload =
  | { type: 'lesson'; id: string; fromUnitId: string }
  | { type: 'unit'; id: string };

const STEPS_KEY = (courseId: string) => `da_lesson_manager_steps:${courseId}`;

/** Order fingerprint of the unit/lesson tree — used to skip no-op reorders. */
function treeSignature(units: ManagerUnit[]): string {
  return units.map((u) => `${u.id}:${u.lessons.map((l) => l.id).join(',')}`).join('|');
}

interface LessonManagerProps {
  course: UserCourseItem;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}

function readUnits(source: unknown): ManagerUnit[] {
  const src = source as Record<string, unknown> | null | undefined;
  const candidates = [
    src,
    src?.data,
    src?.course,
    (src?.data as Record<string, unknown> | null | undefined)?.course,
  ];

  for (const candidate of candidates) {
    const root = candidate as Record<string, unknown> | null | undefined;
    if (!Array.isArray(root?.units)) continue;
    return root.units.map((unit: Record<string, unknown>, unitIndex: number) => ({
      id: String(unit.id ?? `unit-${unitIndex}`),
      title: String(unit.title ?? `Unit ${unitIndex + 1}`),
      desc: String(unit.desc ?? ''),
      lessons: Array.isArray(unit.lessons) ? (unit.lessons as ApiLesson[]) : [],
    }));
  }

  return [];
}

function toLessonForm(lesson: ApiLesson): LessonFormItem {
  return {
    ...createEmptyLesson(inferKind(lesson)),
    title: lesson.title ?? '',
    desc: lesson.desc ?? '',
    duration_min: Number(lesson.duration_min ?? 0),
    content_md: lesson.content_md ?? '',
    additional_task: lesson.additional_task ?? '',
    external_url: lesson.external_url ?? '',
    assignment_instructions: lesson.assignment_instructions ?? '',
    assignment_due_at: lesson.assignment_due_at ? lesson.assignment_due_at.slice(0, 16) : '',
    allow_multiple_files: Boolean(lesson.allow_multiple_files),
    exercise: {
      language: lesson.exercise?.language ?? 'javascript',
      starter_code: lesson.exercise?.starter_code ?? '',
      // NB: edited solution is never sent back to the student inline — the
      // backend strips it from StudentLessonsSerializer responses.
      solution: lesson.exercise?.solution ?? '',
      hint_penalty_percent: Number(lesson.exercise?.hint_penalty_percent ?? DEFAULT_HINT_PENALTY_PERCENT),
      hints: normalizeHints(
        lesson.exercise?.hints,
        Number(lesson.exercise?.hint_penalty_percent ?? DEFAULT_HINT_PENALTY_PERCENT),
      ),
    },
  };
}

function normalizeQuizDraft(quiz: {
  title: string;
  description: string;
  time_limit_min?: number;
  show_timer?: boolean;
  questions: QuizQuestionFormItem[];
} | null) {
  if (!quiz) return null;
  const title = quiz.title.trim();
  const description = quiz.description.trim();

  if (!title || !description || !quiz.questions.length) return null;

  const questions: Array<{ question_text: string; points: number; variants: QuizVariantFormItem[] }> = [];
  for (const question of quiz.questions) {
    const questionText = question.question_text.trim();
    const variants = question.variants.map((variant) => ({
      text: variant.text.trim(),
      is_correct: variant.is_correct,
    }));
    const correctCount = variants.filter((variant) => variant.is_correct).length;

    if (!questionText || variants.length < 2 || variants.some((variant) => !variant.text) || correctCount !== 1) {
      return null;
    }

    questions.push({
      question_text: questionText,
      points: Number(question.points) || 1,
      variants,
    });
  }

  return {
    title,
    description,
    time_limit_min: Math.max(0, Number(quiz.time_limit_min ?? 0) || 0),
    show_timer: quiz.show_timer !== false,
    questions,
  };
}

export function LessonManager({ course, onClose, onChanged }: LessonManagerProps) {
  const [units, setUnits] = useState<ManagerUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [lesson, setLesson] = useState<LessonFormItem>(() => createEmptyLesson('ARTICLE'));
  const [attachedQuiz, setAttachedQuiz] = useState<{
    title: string;
    description: string;
    time_limit_min?: number;
    show_timer?: boolean;
    questions: QuizQuestionFormItem[];
  } | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  // The center editor stays hidden (placeholder shown) until the tutor picks a
  // lesson to edit or clicks + to create a new one.
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newUnitDesc, setNewUnitDesc] = useState('');
  const [creatingUnit, setCreatingUnit] = useState(false);

  // Applied-steps activity log (Power Query style). Persisted per course.
  const [steps, setSteps] = useState<ActivityStep[]>(() => {
    try {
      const raw = localStorage.getItem(STEPS_KEY(course.id));
      return raw ? (JSON.parse(raw) as ActivityStep[]) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STEPS_KEY(course.id), JSON.stringify(steps.slice(-100)));
    } catch {
      /* ignore quota */
    }
  }, [steps, course.id]);

  const logStep = (label: string) =>
    setSteps((prev) => [...prev, { id: crypto.randomUUID(), label, at: new Date().toISOString() }]);

  // Drag-and-drop bookkeeping.
  const dragRef = useRef<DragPayload | null>(null);
  const [dropHintUnitId, setDropHintUnitId] = useState<string | null>(null);
  // Where the dragged item will land — drives the drop-indicator line.
  const [dropLine, setDropLine] = useState<
    | { kind: 'lesson'; unitId: string; beforeId: string | null }
    | { kind: 'unit'; beforeId: string | null }
    | null
  >(null);

  // Inline unit title / description editing.
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitEditTitle, setUnitEditTitle] = useState('');
  const [unitEditDesc, setUnitEditDesc] = useState('');
  const [savingUnit, setSavingUnit] = useState(false);

  const startEditUnit = (unit: ManagerUnit) => {
    setEditingUnitId(unit.id);
    setUnitEditTitle(unit.title);
    setUnitEditDesc(unit.desc);
  };
  const cancelEditUnit = () => {
    setEditingUnitId(null);
    setUnitEditTitle('');
    setUnitEditDesc('');
  };
  const saveUnitEdit = async (unitId: string) => {
    const title = unitEditTitle.trim();
    if (!title) {
      toast.error('Unit title cannot be empty.');
      return;
    }
    try {
      setSavingUnit(true);
      await courseApi.updateUnit(course.id, unitId, { title, desc: unitEditDesc });
      cancelEditUnit();
      await loadDetail();
      logStep(`Edited unit “${title}”`);
      await onChanged();
    } catch (error: unknown) {
      toast.error((error as Error | undefined)?.message ?? 'Unit could not be updated.');
    } finally {
      setSavingUnit(false);
    }
  };

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId) ?? units[0],
    [selectedUnitId, units],
  );

  const loadDetail = async () => {
    try {
      setLoading(true);
      const detail = await courseApi.detail(course.id);
      const nextUnits = readUnits(detail);
      setUnits(nextUnits);
      setSelectedUnitId((current) =>
        nextUnits.some((unit) => unit.id === current) ? current : nextUnits[0]?.id || '',
      );
    } catch (error: unknown) {
      toast.error((error as Error | undefined)?.message ?? 'Course lessons could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [course.id]);

  const updateLessonField = (_unitIndex: number, _lessonIndex: number, key: keyof LessonFormItem, value: string | number | boolean) => {
    setLesson((prev) => ({ ...prev, [key]: value }));
  };

  const updateLessonFile = (_unitIndex: number, _lessonIndex: number, key: 'video' | 'captions' | 'presentation', file: File | null) => {
    setLesson((prev) => ({ ...prev, [key]: file }));
  };

  const updateLessonKind = (_unitIndex: number, _lessonIndex: number, kind: LessonKind) => {
    setLesson((prev) => ({ ...prev, kind }));
    if (kind === 'QUIZ' && !attachedQuiz) {
      setAttachedQuiz({
        title: 'Quiz',
        description: '',
        time_limit_min: 0,
        show_timer: true,
        questions: [createEmptyQuizQuestion()],
      });
    }
  };

  const updateExercise = (
    _unitIndex: number,
    _lessonIndex: number,
    key: 'language' | 'starter_code' | 'solution' | 'hint_penalty_percent',
    value: string | number,
  ) => {
    setLesson((prev) => ({ ...prev, exercise: { ...prev.exercise, [key]: value } }));
  };

  const updateHints = (
    _unitIndex: number,
    _lessonIndex: number,
    hints: Array<{ text: string; penalty_percent: number }>,
  ) => {
    setLesson((prev) => ({ ...prev, exercise: { ...prev.exercise, hints } }));
  };

  const resetDraft = () => {
    setLesson(createEmptyLesson('ARTICLE'));
    setAttachedQuiz(null);
    setEditingLessonId(null);
    setEditingApiLesson(null);
  };

  const createUnit = async () => {
    const title = newUnitTitle.trim();
    if (!title) {
      toast.error('Unit title is required.');
      return;
    }

    try {
      setCreatingUnit(true);
      const created = await courseApi.createUnit(course.id, {
        title,
        desc: newUnitDesc.trim(),
      });
      const createdId = String(created?.data?.id ?? created?.id ?? '');
      await loadDetail();
      if (createdId) setSelectedUnitId(createdId);
      setNewUnitTitle('');
      setNewUnitDesc('');
      toast.success('Unit added.');
      logStep(`Created unit “${title}”`);
      await onChanged();
    } catch (error: unknown) {
      toast.error((error as Error | undefined)?.message ?? 'Unit could not be added.');
    } finally {
      setCreatingUnit(false);
    }
  };

  // Track the lesson currently being edited so we can upsert its attached quiz
  // and show the tutor's submissions panel for ASSIGNMENT lessons.
  const [editingApiLesson, setEditingApiLesson] = useState<ApiLesson | null>(null);

  const startEdit = (unitId: string, apiLesson: ApiLesson) => {
    setSelectedUnitId(unitId);
    setEditorOpen(true);
    setEditingLessonId(apiLesson.id);
    setEditingApiLesson(apiLesson);
    // Hydrate the attached-quiz draft from the lesson's existing quiz so
    // the editor lets the tutor tweak it instead of duplicating it.
    const existingQuiz = apiLesson.quizzes?.[0];
    // Mark the lesson as quiz-attached so the "Add a follow-up quiz" toggle is
    // pre-checked and the inline quiz editor is shown when editing.
    setLesson({ ...toLessonForm(apiLesson), attach_quiz: Boolean(existingQuiz) });
    if (existingQuiz) {
      setAttachedQuiz({
        title: existingQuiz.title ?? '',
        description: existingQuiz.description ?? '',
        time_limit_min: Number(existingQuiz.time_limit_min ?? 0) || 0,
        show_timer: existingQuiz.show_timer !== false,
        questions: (existingQuiz.questions ?? []).map((q) => ({
          question_text: q.question_text,
          points: Number(q.points) || 1,
          variants: (q.variants ?? []).map((v) => ({ text: v.text, is_correct: !!v.is_correct })),
        })),
      });
    } else {
      setAttachedQuiz(null);
    }
  };

  const saveLesson = async () => {
    if (!selectedUnitId) {
      toast.error('Select a unit first.');
      return;
    }

    if (!lesson.title.trim()) {
      toast.error('Lesson title is required.');
      return;
    }

    const quizDraft = lesson.attach_quiz || lesson.kind === 'QUIZ' ? normalizeQuizDraft(attachedQuiz) : null;
    if (lesson.kind === 'QUIZ' && !quizDraft) {
      toast.error('A standalone quiz lesson needs a complete quiz draft.');
      return;
    }

    const payload = {
      course_unit: selectedUnitId,
      kind: lesson.kind,
      title: lesson.title.trim(),
      desc: lesson.desc.trim(),
      duration_min: Number(lesson.duration_min) || 0,
      content_md: lesson.content_md,
      additional_task: lesson.additional_task.trim(),
      external_url: lesson.external_url.trim(),
      assignment_instructions: lesson.assignment_instructions,
      assignment_due_at: lesson.assignment_due_at || null,
      allow_multiple_files: lesson.allow_multiple_files,
      exercise: lesson.kind === 'EXERCISE' ? lesson.exercise : null,
      video: lesson.video,
      captions: lesson.captions,
      presentation: lesson.presentation,
    };

    try {
      setSaving(true);
      const saved = editingLessonId
        ? await courseApi.updateLesson(editingLessonId, payload)
        : await courseApi.createLesson(payload);

      const lessonId = editingLessonId ?? saved?.id ?? saved?.data?.id;
      if (quizDraft && lessonId) {
        // Upsert: if this lesson already had a quiz, PATCH it; otherwise POST.
        const existingQuizId = editingApiLesson?.quizzes?.[0]?.id ?? null;
        if (existingQuizId) {
          await quizApi.update(existingQuizId, { ...quizDraft });
        } else {
          await quizApi.create({ lesson: lessonId, ...quizDraft });
        }
      }

      toast.success(editingLessonId ? 'Lesson updated.' : 'Lesson added.');
      logStep(`${editingLessonId ? 'Updated' : 'Added'} lesson “${payload.title}”`);
      resetDraft();
      await loadDetail();
      await onChanged();
    } catch (error: unknown) {
      toast.error((error as Error | undefined)?.message ?? 'Lesson could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  // ── Drag-and-drop reorder ──────────────────────────────────────────────
  const persistOrder = async (next: ManagerUnit[]) => {
    try {
      await courseApi.reorder(
        course.id,
        next.map((u) => ({ id: u.id, lessons: u.lessons.map((l) => String(l.id)) })),
      );
      await onChanged();
    } catch (error: unknown) {
      toast.error((error as Error | undefined)?.message ?? 'Could not save the new order.');
      await loadDetail(); // fall back to server truth
    }
  };

  const moveLesson = (
    lessonId: string,
    fromUnitId: string,
    toUnitId: string,
    beforeLessonId: string | null,
  ) => {
    const next = units.map((u) => ({ ...u, lessons: [...u.lessons] }));
    const from = next.find((u) => u.id === fromUnitId);
    const to = next.find((u) => u.id === toUnitId);
    if (!from || !to) return;
    const idx = from.lessons.findIndex((l) => String(l.id) === lessonId);
    if (idx === -1) return;
    const [moved] = from.lessons.splice(idx, 1);
    let insertAt = to.lessons.length;
    if (beforeLessonId && beforeLessonId !== lessonId) {
      const bIdx = to.lessons.findIndex((l) => String(l.id) === beforeLessonId);
      if (bIdx !== -1) insertAt = bIdx;
    }
    to.lessons.splice(insertAt, 0, moved);
    // No-op guard: dropping a lesson back where it started must not log/persist.
    if (treeSignature(units) === treeSignature(next)) return;
    setUnits(next);
    logStep(
      fromUnitId === toUnitId
        ? `Reordered lessons in “${to.title}”`
        : `Moved “${moved.title}” → “${to.title}”`,
    );
    persistOrder(next);
  };

  const moveUnit = (unitId: string, beforeUnitId: string | null) => {
    if (unitId === beforeUnitId) return;
    const next = units.map((u) => ({ ...u, lessons: [...u.lessons] }));
    const idx = next.findIndex((u) => u.id === unitId);
    if (idx === -1) return;
    const [moved] = next.splice(idx, 1);
    let insertAt = next.length;
    if (beforeUnitId) {
      const bIdx = next.findIndex((u) => u.id === beforeUnitId);
      if (bIdx !== -1) insertAt = bIdx;
    }
    next.splice(insertAt, 0, moved);
    if (treeSignature(units) === treeSignature(next)) return;
    setUnits(next);
    logStep('Reordered units');
    persistOrder(next);
  };

  const nextLessonId = (unitId: string, lessonId: string): string | null => {
    const u = units.find((x) => x.id === unitId);
    if (!u) return null;
    const i = u.lessons.findIndex((l) => String(l.id) === lessonId);
    return i >= 0 && i + 1 < u.lessons.length ? String(u.lessons[i + 1].id) : null;
  };
  const nextUnitId = (unitId: string): string | null => {
    const i = units.findIndex((x) => x.id === unitId);
    return i >= 0 && i + 1 < units.length ? units[i + 1].id : null;
  };
  // Top half of the hovered item → insert before it; bottom half → after.
  const isTopHalf = (e: DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2;
  };

  const clearDrag = () => {
    dragRef.current = null;
    setDropHintUnitId(null);
    setDropLine(null);
  };

  const onLessonDragStart = (e: DragEvent, lessonId: string, fromUnitId: string) => {
    dragRef.current = { type: 'lesson', id: lessonId, fromUnitId };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lessonId);
  };
  const onUnitDragStart = (e: DragEvent, unitId: string) => {
    dragRef.current = { type: 'unit', id: unitId };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', unitId);
  };

  // Hovering a lesson row → show the line above/below it.
  const onLessonDragOver = (e: DragEvent, unitId: string, lessonId: string) => {
    if (dragRef.current?.type !== 'lesson') return;
    e.preventDefault();
    e.stopPropagation();
    const beforeId = isTopHalf(e) ? lessonId : nextLessonId(unitId, lessonId);
    setDropHintUnitId(unitId);
    setDropLine({ kind: 'lesson', unitId, beforeId });
  };
  // Hovering the unit body (not a specific row) → drop at the end.
  const onUnitBodyDragOver = (e: DragEvent, unitId: string) => {
    if (dragRef.current?.type !== 'lesson') return;
    e.preventDefault();
    setDropHintUnitId(unitId);
    setDropLine((prev) =>
      prev && prev.kind === 'lesson' && prev.unitId === unitId ? prev : { kind: 'lesson', unitId, beforeId: null },
    );
  };
  // Hovering a unit header → reorder units (or move a lesson into it).
  const onUnitHeaderDragOver = (e: DragEvent, unit: ManagerUnit) => {
    const d = dragRef.current;
    if (!d) return;
    e.preventDefault();
    if (d.type === 'unit') {
      const beforeId = isTopHalf(e) ? unit.id : nextUnitId(unit.id);
      setDropLine({ kind: 'unit', beforeId });
    } else {
      setDropHintUnitId(unit.id);
      setDropLine({ kind: 'lesson', unitId: unit.id, beforeId: null });
    }
  };

  const commitDrop = () => {
    const d = dragRef.current;
    const line = dropLine;
    if (d && line) {
      if (d.type === 'lesson' && line.kind === 'lesson') {
        moveLesson(d.id, d.fromUnitId, line.unitId, line.beforeId);
      } else if (d.type === 'unit' && line.kind === 'unit') {
        moveUnit(d.id, line.beforeId);
      }
    }
    clearDrag();
  };
  const onAnyDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    commitDrop();
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
            Lesson manager
          </p>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{course.title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Drag units and lessons to reorder. Drop a lesson into another unit to move it.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onClose}>Close</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr_260px] gap-4">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)_260px] gap-4 items-start">
          {/* ── LEFT: units + lessons tree (drag and drop) ──────────────── */}
          <aside className="space-y-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3 space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Add a unit</Label>
              <Input
                value={newUnitTitle}
                onChange={(event) => setNewUnitTitle(event.target.value)}
                placeholder="Unit title"
                className="bg-white dark:bg-slate-900"
              />
              <Input
                value={newUnitDesc}
                onChange={(event) => setNewUnitDesc(event.target.value)}
                placeholder="Short description (optional)"
                className="bg-white dark:bg-slate-900"
              />
              <Button
                type="button"
                disabled={creatingUnit}
                onClick={createUnit}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {creatingUnit ? 'Adding…' : 'Add unit'}
              </Button>
            </div>

            {!units.length ? (
              <p className="text-sm text-amber-600 dark:text-amber-300 px-1">
                No units yet. Add one above to start placing lessons.
              </p>
            ) : (
              <div className="space-y-3" onDragEnd={clearDrag}>
                {units.map((unit) => {
                  const isActiveUnit = selectedUnitId === unit.id;
                  const isDropHint = dropHintUnitId === unit.id;
                  const isEditingUnit = editingUnitId === unit.id;
                  const showUnitLineBefore = dropLine?.kind === 'unit' && dropLine.beforeId === unit.id;
                  return (
                    <div key={unit.id}>
                      {/* Unit reorder drop-line */}
                      <div className={`h-0.5 rounded-full transition-colors ${showUnitLineBefore ? 'bg-indigo-500 mb-2' : 'bg-transparent'}`} />
                      <div
                        onDragOver={(e) => onUnitBodyDragOver(e, unit.id)}
                        onDrop={onAnyDrop}
                        className={[
                          'rounded-xl border bg-white dark:bg-slate-900/40 transition-colors',
                          isDropHint
                            ? 'border-indigo-400 ring-2 ring-indigo-500/30'
                            : isActiveUnit
                              ? 'border-indigo-300 dark:border-indigo-500/40'
                              : 'border-slate-200 dark:border-slate-800',
                        ].join(' ')}
                      >
                        {/* Unit header — draggable to reorder; pencil to edit title/desc */}
                        <div
                          draggable={!isEditingUnit}
                          onDragStart={(e) => onUnitDragStart(e, unit.id)}
                          onDragOver={(e) => onUnitHeaderDragOver(e, unit)}
                          onDrop={onAnyDrop}
                          className={[
                            'flex items-start gap-2 px-3 py-2.5 rounded-t-xl',
                            isActiveUnit ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'bg-slate-50 dark:bg-slate-900/60',
                            isEditingUnit ? '' : 'cursor-grab active:cursor-grabbing',
                          ].join(' ')}
                          title={isEditingUnit ? undefined : 'Drag to reorder unit'}
                        >
                          {isEditingUnit ? (
                            <div className="w-full space-y-2">
                              <Input
                                value={unitEditTitle}
                                onChange={(e) => setUnitEditTitle(e.target.value)}
                                placeholder="Unit title"
                                autoFocus
                                className="h-8 bg-white dark:bg-slate-900"
                              />
                              <Input
                                value={unitEditDesc}
                                onChange={(e) => setUnitEditDesc(e.target.value)}
                                placeholder="Description (optional)"
                                className="h-8 bg-white dark:bg-slate-900"
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={savingUnit}
                                  onClick={() => saveUnitEdit(unit.id)}
                                  className="h-7 bg-indigo-600 hover:bg-indigo-500 text-white"
                                >
                                  {savingUnit ? 'Saving…' : 'Save'}
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={cancelEditUnit} className="h-7">
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <GripVertical className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <button
                                type="button"
                                onClick={() => setSelectedUnitId(unit.id)}
                                className="flex items-center gap-2 min-w-0 flex-1 text-left"
                                title="Click to target new lessons here"
                              >
                                <FolderOpen className={`w-4 h-4 shrink-0 ${isActiveUnit ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500'}`} />
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {unit.title}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { setSelectedUnitId(unit.id); resetDraft(); setEditorOpen(true); }}
                                aria-label="Add a lesson to this unit"
                                title="Add a lesson to this unit"
                                className="shrink-0 p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => startEditUnit(unit)}
                                aria-label="Edit unit"
                                className="shrink-0 p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>

                        {/* Lessons in this unit */}
                        <div className="p-2 space-y-1.5 min-h-[44px]">
                          {unit.lessons.map((item) => {
                            const kind = inferKind(item);
                            const meta = KIND_META[kind];
                            const Icon = meta.Icon;
                            const isEditing = editingApiLesson?.id === item.id;
                            const showLineBefore =
                              dropLine?.kind === 'lesson' && dropLine.unitId === unit.id && dropLine.beforeId === String(item.id);
                            return (
                              <div key={item.id}>
                                <div className={`h-0.5 rounded-full transition-colors ${showLineBefore ? 'bg-indigo-500 mb-1.5' : 'bg-transparent'}`} />
                                <div
                                  draggable
                                  onDragStart={(e) => onLessonDragStart(e, String(item.id), unit.id)}
                                  onDragOver={(e) => onLessonDragOver(e, unit.id, String(item.id))}
                                  onDrop={onAnyDrop}
                                  onClick={() => startEdit(unit.id, item)}
                                  className={[
                                    'group flex items-center gap-2 rounded-lg px-2 py-2 cursor-grab active:cursor-grabbing transition-colors',
                                    isEditing
                                      ? 'bg-indigo-50 ring-1 ring-indigo-500/40 dark:bg-indigo-500/10'
                                      : 'bg-white hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-800',
                                  ].join(' ')}
                                  title="Drag to reorder or move to another unit · click to edit"
                                >
                                  <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${meta.bgTint}`}>
                                    <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">{item.title}</p>
                                    <p className="text-[10px] uppercase tracking-wider text-slate-400">{meta.label}</p>
                                  </div>
                                  <Pencil className={`w-3.5 h-3.5 shrink-0 ${isEditing ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400'}`} />
                                </div>
                              </div>
                            );
                          })}
                          {/* End-of-list drop-line */}
                          {dropLine?.kind === 'lesson' && dropLine.unitId === unit.id && dropLine.beforeId === null && unit.lessons.length > 0 && (
                            <div className="h-0.5 rounded-full bg-indigo-500" />
                          )}
                          {unit.lessons.length === 0 && (
                            <p
                              className={[
                                'text-xs italic text-center py-3 border border-dashed rounded-lg transition-colors',
                                isDropHint
                                  ? 'border-indigo-400 text-indigo-500 bg-indigo-50/60 dark:bg-indigo-500/10'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-400',
                              ].join(' ')}
                            >
                              Drop lessons here
                            </p>
                          )}
                          {editorOpen && !editingLessonId && selectedUnitId === unit.id && (
                            <p className="text-[10px] text-indigo-500/80 dark:text-indigo-300/80 text-right pr-1 pt-0.5">
                              ↳ new lesson lands in this unit
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Drop-line for appending a unit at the end */}
                {dropLine?.kind === 'unit' && dropLine.beforeId === null && (
                  <div className="h-0.5 rounded-full bg-indigo-500" />
                )}
              </div>
            )}
          </aside>

          {/* ── CENTER: editor ──────────────────────────────────────────── */}
          <section className="space-y-4 min-w-0">
            {!units.length ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Add a unit on the left, then build a lesson here.
              </p>
            ) : !editorOpen ? (
              <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-center leading-relaxed text-slate-300 dark:text-slate-700 select-none px-6">
                  Select a lesson to edit
                  <br />
                  or click + to create a new lesson in the unit
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                  {editingLessonId ? 'Editing lesson in' : 'New lesson will be added to'}{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedUnit?.title}</span>
                </div>

                <LessonEditor
                  lesson={lesson}
                  lessonIndex={
                    editingLessonId
                      ? Math.max(
                          0,
                          (selectedUnit?.lessons ?? []).findIndex((l) => String(l.id) === String(editingLessonId)),
                        )
                      : (selectedUnit?.lessons.length ?? 0)
                  }
                  unitIndex={0}
                  onTextChange={updateLessonField}
                  onFileChange={updateLessonFile}
                  onKindChange={updateLessonKind}
                  onExerciseChange={updateExercise}
                  onExerciseHintsChange={updateHints}
                  attachedQuiz={attachedQuiz}
                  onAttachedQuizChange={(_unitIndex, _lessonIndex, quiz) => setAttachedQuiz(quiz)}
                  existingMedia={
                    editingLessonId && editingApiLesson
                      ? {
                          video: mediaUrl(editingApiLesson.video),
                          presentation: mediaUrl(editingApiLesson.presentation),
                          captions: mediaUrl(editingApiLesson.captions),
                        }
                      : undefined
                  }
                />

                {editingApiLesson && editingApiLesson.kind === 'ASSIGNMENT' && (
                  <AssignmentSubmissionsPanel lessonId={editingApiLesson.id} />
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                    disabled={saving}
                    onClick={saveLesson}
                  >
                    {saving ? 'Saving…' : editingLessonId ? 'Save changes' : 'Add lesson'}
                  </Button>
                  {editingLessonId && (
                    <Button type="button" variant="outline" onClick={resetDraft}>
                      New lesson instead
                    </Button>
                  )}
                </div>
              </>
            )}
          </section>

          {/* ── RIGHT: applied-steps activity log ───────────────────────── */}
          <aside className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Applied steps</p>
              </div>
              {steps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSteps([])}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            {steps.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                Your edits will appear here as a running log.
              </p>
            ) : (
              <ol className="space-y-0">
                {steps.map((step, i) => {
                  const isLast = i === steps.length - 1;
                  return (
                    <li key={step.id} className="relative flex gap-2.5 pb-2.5 last:pb-0">
                      <div className="flex flex-col items-center">
                        <span
                          className={[
                            'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0',
                            isLast
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                          ].join(' ')}
                        >
                          {i + 1}
                        </span>
                        {!isLast && <span className="flex-1 w-px bg-slate-200 dark:bg-slate-700 my-0.5" />}
                      </div>
                      <div className="min-w-0 -mt-0.5">
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug">{step.label}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(step.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
