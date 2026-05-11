// Types, factory helpers, pure helpers, and constants extracted from InstructorDashboard.

export interface LessonFormItem {
  title: string;
  desc: string;
  additional_task: string;
  video: File | null;
  presentation: File | null;
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
  questions: [createEmptyQuizQuestion()],
});

export const createEmptyLesson = (): LessonFormItem => ({
  title: '',
  desc: '',
  additional_task: '',
  video: null,
  presentation: null,
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
