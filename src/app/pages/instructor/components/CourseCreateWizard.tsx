import { Dispatch, FormEvent, SetStateAction } from 'react';
import { CategoryItem } from '@/app/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { FileInput } from '@/app/components/ui/FileInput';
import { KIND_META } from '@/app/pages/learn/lessonKind';
import {
  CourseFormState,
  LessonFormItem,
  QuizQuestionFormItem,
  createEmptyLesson,
  createEmptyQuizQuestion,
} from '@/app/utils/instructorDashboard';
import type { LessonKind } from '@/app/pages/learn/lessonKind';
import { LessonEditor } from './LessonEditor';

interface CourseCreateWizardProps {
  form: CourseFormState;
  setForm: Dispatch<SetStateAction<CourseFormState>>;
  categories: CategoryItem[];
  isCreating: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
  /** Map of `${unitIdx}-${lessonIdx}` → attached quiz draft (optional). */
  attachedQuizzes?: Record<string, { title: string; description: string; time_limit_min?: number; show_timer?: boolean; questions: QuizQuestionFormItem[] } | null>;
  setAttachedQuizzes?: Dispatch<SetStateAction<Record<string, { title: string; description: string; time_limit_min?: number; show_timer?: boolean; questions: QuizQuestionFormItem[] } | null>>>;
}

export function CourseCreateWizard({
  form,
  setForm,
  categories,
  isCreating,
  onSubmit,
  onCancel,
  attachedQuizzes,
  setAttachedQuizzes,
}: CourseCreateWizardProps) {
  const updateUnit = (unitIndex: number, key: 'title' | 'desc', value: string) => {
    setForm((prev) => ({
      ...prev,
      units: prev.units.map((unit, idx) => (idx === unitIndex ? { ...unit, [key]: value } : unit)),
    }));
  };

  const updateLessonField = (
    unitIndex: number,
    lessonIndex: number,
    key: keyof LessonFormItem,
    value: string | number | boolean,
  ) => {
    setForm((prev) => ({
      ...prev,
      units: prev.units.map((unit, idx) => {
        if (idx !== unitIndex) return unit;
        return {
          ...unit,
          lessons: unit.lessons.map((lesson, lIdx) =>
            lIdx === lessonIndex ? { ...lesson, [key]: value } : lesson,
          ),
        };
      }),
    }));
  };

  const updateLessonFile = (
    unitIndex: number,
    lessonIndex: number,
    key: 'video' | 'captions' | 'presentation',
    file: File | null,
  ) => {
    setForm((prev) => ({
      ...prev,
      units: prev.units.map((unit, idx) => {
        if (idx !== unitIndex) return unit;
        return {
          ...unit,
          lessons: unit.lessons.map((lesson, lIdx) =>
            lIdx === lessonIndex ? { ...lesson, [key]: file } : lesson,
          ),
        };
      }),
    }));
  };

  const updateLessonKind = (unitIndex: number, lessonIndex: number, kind: LessonKind) => {
    setForm((prev) => ({
      ...prev,
      units: prev.units.map((unit, idx) => {
        if (idx !== unitIndex) return unit;
        return {
          ...unit,
          lessons: unit.lessons.map((lesson, lIdx) =>
            lIdx === lessonIndex ? { ...lesson, kind } : lesson,
          ),
        };
      }),
    }));

    if (kind === 'QUIZ' && setAttachedQuizzes) {
      setAttachedQuizzes((prev) => {
        const key = `${unitIndex}-${lessonIndex}`;
        if (prev[key]) return prev;
        return {
          ...prev,
          [key]: {
            title: 'Quiz',
            description: '',
            time_limit_min: 0,
            show_timer: true,
            questions: [createEmptyQuizQuestion()],
          },
        };
      });
    }
  };

  const updateLessonExercise = (
    unitIndex: number,
    lessonIndex: number,
    key: 'language' | 'starter_code' | 'solution' | 'hint_penalty_percent',
    value: string | number,
  ) => {
    setForm((prev) => ({
      ...prev,
      units: prev.units.map((unit, idx) => {
        if (idx !== unitIndex) return unit;
        return {
          ...unit,
          lessons: unit.lessons.map((lesson, lIdx) =>
            lIdx === lessonIndex
              ? { ...lesson, exercise: { ...lesson.exercise, [key]: value } }
              : lesson,
          ),
        };
      }),
    }));
  };

  const updateLessonHints = (
    unitIndex: number,
    lessonIndex: number,
    hints: Array<{ text: string; penalty_percent: number }>,
  ) => {
    setForm((prev) => ({
      ...prev,
      units: prev.units.map((unit, idx) => {
        if (idx !== unitIndex) return unit;
        return {
          ...unit,
          lessons: unit.lessons.map((lesson, lIdx) =>
            lIdx === lessonIndex
              ? { ...lesson, exercise: { ...lesson.exercise, hints } }
              : lesson,
          ),
        };
      }),
    }));
  };

  const addUnit = () => {
    setForm((prev) => ({
      ...prev,
      units: [...prev.units, { title: '', desc: '', lessons: [createEmptyLesson()] }],
    }));
  };

  const addLesson = (unitIndex: number, kind: LessonKind = 'VIDEO') => {
    setForm((prev) => ({
      ...prev,
      units: prev.units.map((unit, idx) =>
        idx === unitIndex
          ? { ...unit, lessons: [...unit.lessons, createEmptyLesson(kind)] }
          : unit,
      ),
    }));
  };

  const removeLesson = (unitIndex: number, lessonIndex: number) => {
    setForm((prev) => ({
      ...prev,
      units: prev.units.map((unit, idx) => {
        if (idx !== unitIndex) return unit;
        return { ...unit, lessons: unit.lessons.filter((_, lIdx) => lIdx !== lessonIndex) };
      }),
    }));
  };

  const setAttachedQuiz = (
    unitIndex: number,
    lessonIndex: number,
    quiz: { title: string; description: string; time_limit_min?: number; show_timer?: boolean; questions: QuizQuestionFormItem[] } | null,
  ) => {
    if (!setAttachedQuizzes) return;
    setAttachedQuizzes((prev) => ({ ...prev, [`${unitIndex}-${lessonIndex}`]: quiz }));
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-xl">Create a new course</CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Set up the course outline, then add lessons of any type to each unit.
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <form className="space-y-6 max-w-5xl mx-auto" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Course title</Label>
            <Input
              placeholder="e.g. Complete React Developer Course"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Short description of the course"
              value={form.desc}
              onChange={(e) => setForm((prev) => ({ ...prev, desc: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Base price</Label>
              <Input
                type="number"
                min="0"
                value={form.base_price}
                onChange={(e) => setForm((prev) => ({ ...prev, base_price: Number(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Discount price</Label>
              <Input
                type="number"
                min="0"
                value={form.discount_price}
                onChange={(e) => setForm((prev) => ({ ...prev, discount_price: Number(e.target.value) }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 px-3 py-2 text-sm"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              required
              disabled={categories.length === 0}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-300">
                No categories exist in this local database yet. Add categories in Django admin, then refresh this page.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Course image</Label>
            <FileInput
              variant="image"
              accept="image/*"
              value={form.cover_img}
              hint="JPG, PNG, or WEBP — recommended 1280×720"
              label="Drop cover image or click to browse"
              onChange={(file) => setForm((prev) => ({ ...prev, cover_img: file }))}
            />
          </div>

          {form.units.map((unit, unitIndex) => (
            <section
              key={unitIndex}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-sm">
                  {unitIndex + 1}
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                    Unit
                  </p>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {unit.title || `Unit ${unitIndex + 1}`}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Unit title</Label>
                  <Input
                    value={unit.title}
                    onChange={(e) => updateUnit(unitIndex, 'title', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Unit description</Label>
                  <Textarea
                    value={unit.desc}
                    onChange={(e) => updateUnit(unitIndex, 'desc', e.target.value)}
                    rows={1}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                {unit.lessons.map((lesson, lessonIndex) => (
                  <LessonEditor
                    key={lessonIndex}
                    lesson={lesson}
                    lessonIndex={lessonIndex}
                    unitIndex={unitIndex}
                    onTextChange={updateLessonField}
                    onFileChange={updateLessonFile}
                    onKindChange={updateLessonKind}
                    onExerciseChange={updateLessonExercise}
                    onExerciseHintsChange={updateLessonHints}
                    attachedQuiz={attachedQuizzes?.[`${unitIndex}-${lessonIndex}`] ?? null}
                    onAttachedQuizChange={setAttachedQuizzes ? setAttachedQuiz : undefined}
                    onRemove={removeLesson}
                  />
                ))}
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Add a lesson to this unit:
                </p>
                <div className="flex gap-2 flex-wrap">
                  {(['VIDEO', 'ARTICLE', 'EXERCISE', 'QUIZ', 'ASSIGNMENT', 'CHEATSHEET', 'RESOURCE', 'DISCUSSION'] as const).map((kind) => {
                    const meta = KIND_META[kind];
                    const Icon = meta.Icon;
                    return (
                      <Button
                        key={kind}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => addLesson(unitIndex, kind)}
                      >
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                        {meta.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addUnit}
            className="w-full border-dashed border-2 h-12 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
          >
            + Add another unit
          </Button>

          <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
              disabled={isCreating}
            >
              {isCreating ? 'Creating…' : 'Create course'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
