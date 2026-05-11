import { useState, Dispatch, SetStateAction } from 'react';
import { courseApi, quizApi, UserCourseItem } from '@/app/services/api';
import { toast } from 'sonner';
import {
  CourseLessonOption,
  CourseUnitOption,
  QuizCreateFormState,
  QuizVariantFormItem,
  createEmptyQuizCreateForm,
  createEmptyQuizQuestion,
  createEmptyQuizVariant,
  extractCourseQuizOptions,
} from '@/app/utils/instructorDashboard';

export interface UseInstructorCourseDetailResult {
  quizCourseId: string | null;
  quizUnitId: string;
  quizUnitOptions: CourseUnitOption[];
  quizLessonOptions: CourseLessonOption[];
  quizLessonId: string;
  quizForm: QuizCreateFormState;
  isCreatingQuiz: boolean;
  filteredQuizLessonOptions: CourseLessonOption[];
  setQuizUnitId: (id: string) => void;
  setQuizLessonId: (id: string) => void;
  setQuizForm: Dispatch<SetStateAction<QuizCreateFormState>>;
  startCreateQuiz: (courseId: string, courses: UserCourseItem[]) => Promise<void>;
  cancelCreateQuiz: () => void;
  updateQuizQuestion: (questionIndex: number, key: 'question_text' | 'points', value: string | number) => void;
  addQuizQuestion: () => void;
  updateQuizVariantText: (questionIndex: number, variantIndex: number, value: string) => void;
  setQuizCorrectVariant: (questionIndex: number, variantIndex: number) => void;
  addQuizVariant: (questionIndex: number) => void;
  handleCreateQuizzes: () => Promise<void>;
}

export function useInstructorCourseDetail(): UseInstructorCourseDetailResult {
  const [quizCourseId, setQuizCourseId] = useState<string | null>(null);
  const [quizUnitId, setQuizUnitId] = useState('');
  const [quizUnitOptions, setQuizUnitOptions] = useState<CourseUnitOption[]>([]);
  const [quizLessonOptions, setQuizLessonOptions] = useState<CourseLessonOption[]>([]);
  const [quizLessonId, setQuizLessonId] = useState('');
  const [quizForm, setQuizForm] = useState<QuizCreateFormState>(createEmptyQuizCreateForm());
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);

  const filteredQuizLessonOptions = quizUnitId
    ? quizLessonOptions.filter(lesson => lesson.unitId === quizUnitId)
    : quizLessonOptions;

  const startCreateQuiz = async (courseId: string, courses: UserCourseItem[]) => {
    const selectedCourse = courses.find(course => course.id === courseId);
    if (!selectedCourse) {
      toast.error('Course not found. Refresh the page and try again.');
      return;
    }

    setQuizCourseId(courseId);
    setQuizForm(createEmptyQuizCreateForm());
    setQuizLessonId('');

    let quizOptions = extractCourseQuizOptions(selectedCourse);

    // Fallback: if list payload lacks nested units/lessons, fetch detail and retry.
    if (!quizOptions.lessons.length) {
      try {
        const detail = await courseApi.detail(courseId);
        quizOptions = extractCourseQuizOptions(detail);
      } catch {
        // Ignore fallback error and show the standard warning below.
      }
    }

    setQuizUnitOptions(quizOptions.units);
    setQuizLessonOptions(quizOptions.lessons);
    setQuizUnitId(quizOptions.units[0]?.id ?? '');

    if (!quizOptions.lessons.length) {
      toast.warning('No units or lessons were found for this course.');
    }
  };

  const cancelCreateQuiz = () => {
    setQuizCourseId(null);
    setQuizUnitId('');
    setQuizUnitOptions([]);
    setQuizLessonId('');
    setQuizLessonOptions([]);
    setQuizForm(createEmptyQuizCreateForm());
  };

  const updateQuizQuestion = (
    questionIndex: number,
    key: 'question_text' | 'points',
    value: string | number
  ) => {
    setQuizForm(prev => ({
      ...prev,
      questions: prev.questions.map((question, qIdx) =>
        qIdx === questionIndex ? { ...question, [key]: value } : question
      ),
    }));
  };

  const addQuizQuestion = () => {
    setQuizForm(prev => ({
      ...prev,
      questions: [...prev.questions, createEmptyQuizQuestion()],
    }));
  };

  const updateQuizVariantText = (
    questionIndex: number,
    variantIndex: number,
    value: string
  ) => {
    setQuizForm(prev => ({
      ...prev,
      questions: prev.questions.map((question, qIdx) => {
        if (qIdx !== questionIndex) return question;
        return {
          ...question,
          variants: question.variants.map((variant, vIdx) =>
            vIdx === variantIndex ? { ...variant, text: value } : variant
          ),
        };
      }),
    }));
  };

  const setQuizCorrectVariant = (questionIndex: number, variantIndex: number) => {
    setQuizForm(prev => ({
      ...prev,
      questions: prev.questions.map((question, qIdx) => {
        if (qIdx !== questionIndex) return question;
        return {
          ...question,
          variants: question.variants.map((variant, vIdx) => ({
            ...variant,
            is_correct: vIdx === variantIndex,
          })),
        };
      }),
    }));
  };

  const addQuizVariant = (questionIndex: number) => {
    setQuizForm(prev => ({
      ...prev,
      questions: prev.questions.map((question, qIdx) =>
        qIdx === questionIndex
          ? { ...question, variants: [...question.variants, createEmptyQuizVariant(false)] }
          : question
      ),
    }));
  };

  const handleCreateQuizzes = async () => {
    if (!quizCourseId) {
      toast.error('Select a course first.');
      return;
    }

    if (!quizLessonId) {
      toast.error('Selecting a lesson is required.');
      return;
    }

    const quizTitle = quizForm.title.trim();
    const quizDescription = quizForm.description.trim();
    if (!quizTitle || !quizDescription) {
      toast.error('Quiz title and description are required.');
      return;
    }

    if (!quizForm.questions.length) {
      toast.error('At least one question is required.');
      return;
    }

    const normalizedQuestions: Array<{ question_text: string; points: number; variants: QuizVariantFormItem[] }> = [];
    for (let qIdx = 0; qIdx < quizForm.questions.length; qIdx += 1) {
      const question = quizForm.questions[qIdx];

      if (!question.question_text.trim()) {
        toast.error(`Question text is required (Question ${qIdx + 1}).`);
        return;
      }

      if (!Number.isFinite(question.points) || Number(question.points) <= 0) {
        toast.error(`Points must be greater than 0 (Question ${qIdx + 1}).`);
        return;
      }

      if (question.variants.length < 2) {
        toast.error(`Each question must have at least 2 options (Question ${qIdx + 1}).`);
        return;
      }

      const trimmedVariants = question.variants.map(variant => ({
        text: variant.text.trim(),
        is_correct: variant.is_correct,
      }));

      if (trimmedVariants.some(variant => !variant.text)) {
        toast.error(`Option text is required (Question ${qIdx + 1}).`);
        return;
      }

      const correctCount = trimmedVariants.filter(variant => variant.is_correct).length;
      if (correctCount !== 1) {
        toast.error(`Each question must have exactly 1 correct answer (Question ${qIdx + 1}).`);
        return;
      }

      normalizedQuestions.push({
        question_text: question.question_text.trim(),
        points: Number(question.points),
        variants: trimmedVariants,
      });
    }

    try {
      setIsCreatingQuiz(true);
      await quizApi.create({
        lesson: quizLessonId,
        title: quizTitle,
        description: quizDescription,
        questions: normalizedQuestions,
      });
      toast.success('Quiz created.');
      cancelCreateQuiz();
    } catch (err: unknown) {
      toast.error((err as Error | undefined)?.message ?? 'Failed to create quiz.');
    } finally {
      setIsCreatingQuiz(false);
    }
  };

  return {
    quizCourseId,
    quizUnitId,
    quizUnitOptions,
    quizLessonOptions,
    quizLessonId,
    quizForm,
    isCreatingQuiz,
    filteredQuizLessonOptions,
    setQuizUnitId,
    setQuizLessonId,
    setQuizForm,
    startCreateQuiz,
    cancelCreateQuiz,
    updateQuizQuestion,
    addQuizQuestion,
    updateQuizVariantText,
    setQuizCorrectVariant,
    addQuizVariant,
    handleCreateQuizzes,
  };
}
