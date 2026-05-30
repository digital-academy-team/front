// Types, factory helpers, pure helpers, and constants extracted from InstructorDashboard.
//
// v2: lesson form is now kind-aware. `kind` decides which fields the editor
// renders and which fields the API layer should send.

import type { LessonExerciseHint, LessonKind } from '@/app/pages/learn/lessonKind';
import { DEFAULT_HINT_PENALTY_PERCENT } from '@/app/pages/learn/lessonKind';

export interface LessonExerciseFormItem {
  language: string;
  starter_code: string;
  solution: string;
  /** Default penalty applied to newly added hints. */
  hint_penalty_percent: number;
  /** Each hint now carries its OWN penalty. */
  hints: LessonExerciseHint[];
}

export interface LessonFormItem {
  // Core
  kind: LessonKind;
  title: string;
  desc: string;
  duration_min: number;
  // Body
  content_md: string;             // ARTICLE, CHEATSHEET, EXERCISE intro, DISCUSSION prompt, RESOURCE description
  additional_task: string;        // legacy: keep for VIDEO back-compat
  // Files
  video: File | null;
  captions: File | null;
  presentation: File | null;
  // Type-specific
  external_url: string;           // RESOURCE
  assignment_instructions: string; // ASSIGNMENT
  assignment_due_at: string;       // ISO date string, ASSIGNMENT
  allow_multiple_files: boolean;   // ASSIGNMENT: let students attach several files
  exercise: LessonExerciseFormItem; // EXERCISE
  // Optional attached quiz
  attach_quiz: boolean;            // if true and kind is quiz-attachable, parent form expects a quiz draft
}

export interface QuizVariantFormItem {
  text: string;
  is_correct: boolean;
}

export interface QuizQuestionFormItem {
  question_text: string;
  points: number;
  variants: QuizVariantFormItem[];
}

export interface UnitFormItem {
  title: string;
  desc: string;
  lessons: LessonFormItem[];
}

export interface CourseFormState {
  title: string;
  desc: string;
  base_price: number;
  discount_price: number;
  category: string;
  cover_img: File | null;
  units: UnitFormItem[];
}

export interface CourseEditFormState {
  title: string;
  desc: string;
  base_price: number;
  discount_price: number;
  cover_img: File | null;
}

export interface CourseLessonOption {
  id: string;
  unitId: string;
  label: string;
}

export interface CourseUnitOption {
  id: string;
  label: string;
}

export interface QuizCreateFormState {
  title: string;
  description: string;
  time_limit_min: number;
  show_timer: boolean;
  questions: QuizQuestionFormItem[];
}

export const createEmptyQuizVariant = (isCorrect = false): QuizVariantFormItem => ({
  text: '',
  is_correct: isCorrect,
});

export const createEmptyQuizQuestion = (): QuizQuestionFormItem => ({
  question_text: '',
  points: 1,
  variants: [createEmptyQuizVariant(true), createEmptyQuizVariant(false)],
});

export const createEmptyQuizCreateForm = (): QuizCreateFormState => ({
  title: '',
  description: '',
  time_limit_min: 0,
  show_timer: true,
  questions: [createEmptyQuizQuestion()],
});

export const createEmptyExercise = (): LessonExerciseFormItem => ({
  language: 'javascript',
  starter_code: '',
  solution: '',
  hint_penalty_percent: DEFAULT_HINT_PENALTY_PERCENT,
  hints: [],
});

export const createEmptyHint = (penalty = DEFAULT_HINT_PENALTY_PERCENT): LessonExerciseHint => ({
  text: '',
  penalty_percent: penalty,
});

export const createEmptyLesson = (kind: LessonKind = 'VIDEO'): LessonFormItem => ({
  kind,
  title: '',
  desc: '',
  duration_min: 0,
  content_md: '',
  additional_task: '',
  video: null,
  captions: null,
  presentation: null,
  external_url: '',
  assignment_instructions: '',
  assignment_due_at: '',
  allow_multiple_files: false,
  exercise: createEmptyExercise(),
  attach_quiz: false,
});

export function extractCourseQuizOptions(source: unknown): {
  units: CourseUnitOption[];
  lessons: CourseLessonOption[];
} {
  const unitOptions: CourseUnitOption[] = [];
  const lessonOptions: CourseLessonOption[] = [];

  const src = source as Record<string, unknown> | null | undefined;

  const candidateRoots = [
    src,
    src?.data,
    src?.course,
    (src?.data as Record<string, unknown> | null | undefined)?.course,
  ];

  for (const root of candidateRoots) {
    const r = root as Record<string, unknown> | null | undefined;
    const units = r?.units;
    if (!Array.isArray(units)) continue;

    units.forEach((unit: Record<string, unknown>, unitIndex: number) => {
      if (typeof unit?.id !== 'string' || !unit.id) return;
      const unitLabel = (unit?.title as string | undefined) || `Unit ${unitIndex + 1}`;
      unitOptions.push({ id: unit.id as string, label: unitLabel });

      if (!Array.isArray(unit?.lessons)) return;
      (unit.lessons as Record<string, unknown>[]).forEach((lesson: Record<string, unknown>, lessonIndex: number) => {
        if (typeof lesson?.id !== 'string' || !lesson.id) return;
        const lessonLabel = (lesson?.title as string | undefined) || `Lesson ${lessonIndex + 1}`;
        lessonOptions.push({
          id: lesson.id as string,
          unitId: unit.id as string,
          label: lessonLabel,
        });
      });
    });

    if (unitOptions.length > 0 || lessonOptions.length > 0) {
      break;
    }
  }

  return {
    units: unitOptions,
    lessons: lessonOptions,
  };
}

export const mockChartData = [
  { month: 'Oct', enrollments: 12 },
  { month: 'Nov', enrollments: 28 },
  { month: 'Dec', enrollments: 19 },
  { month: 'Jan', enrollments: 34 },
  { month: 'Feb', enrollments: 41 },
  { month: 'Mar', enrollments: 38 },
];
