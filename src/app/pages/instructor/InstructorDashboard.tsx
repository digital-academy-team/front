import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '@/app/store/AuthContext';
import { courseApi, UserCourseItem } from '@/app/services/api';
import { toast } from 'sonner';
import { useInstructorCourses } from '@/app/hooks/useInstructorCourses';
import { useInstructorCourseDetail } from '@/app/hooks/useInstructorCourseDetail';
import { CourseEditFormState, CourseFormState, QuizQuestionFormItem, createEmptyLesson } from '@/app/utils/instructorDashboard';
import { OverviewTab } from './components/OverviewTab';
import { InstructorCourseList } from './components/InstructorCourseList';
import { CourseCreateWizard } from './components/CourseCreateWizard';
import { SubmissionsInbox } from './components/SubmissionsInbox';

type Tab = 'overview' | 'courses' | 'submissions' | 'create';

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  courses: 'Courses',
  submissions: 'Submissions',
  create: 'Create course',
};

export default function InstructorDashboard() {
  useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    return t === 'courses' || t === 'submissions' || t === 'create' ? t : 'overview';
  });

  // Honour deep links like /instructor?tab=submissions (used by notifications).
  useEffect(() => {
    const t = searchParams.get('tab');
    if ((t === 'overview' || t === 'courses' || t === 'submissions' || t === 'create') && t !== activeTab) {
      setActiveTab(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'overview' ? {} : { tab }, { replace: true });
  };
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdatingCourse, setIsUpdatingCourse] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CourseEditFormState | null>(null);
  const [form, setForm] = useState<CourseFormState>({
    title: '',
    desc: '',
    base_price: 0,
    discount_price: 0,
    category: '',
    cover_img: null,
    units: [{ title: '', desc: '', lessons: [createEmptyLesson()] }],
  });
  const [attachedQuizzes, setAttachedQuizzes] = useState<
    Record<string, { title: string; description: string; time_limit_min?: number; show_timer?: boolean; questions: QuizQuestionFormItem[] } | null>
  >({});

  const { courses, categories, loading, refetch } = useInstructorCourses();
  const quizDetail = useInstructorCourseDetail();

  const startEditCourse = (course: UserCourseItem) => {
    setEditingCourseId(course.id);
    setEditForm({
      title: course.title,
      desc: course.desc,
      base_price: Number(course.base_price),
      discount_price: Number(course.discount_price),
      cover_img: null,
    });
  };

  const cancelEditCourse = () => {
    setEditingCourseId(null);
    setEditForm(null);
  };

  const handleUpdateCourse = async () => {
    if (!editingCourseId || !editForm) return;

    if (!editForm.title.trim() || !editForm.desc.trim()) {
      toast.error('Title and description are required.');
      return;
    }

    try {
      setIsUpdatingCourse(true);
      await courseApi.update(editingCourseId, {
        title: editForm.title.trim(),
        desc: editForm.desc.trim(),
        base_price: Number(editForm.base_price),
        discount_price: Number(editForm.discount_price),
        cover_img: editForm.cover_img,
      });

      await refetch();
      toast.success('Course updated.');
      cancelEditCourse();
    } catch (err: unknown) {
      toast.error((err as Error | undefined)?.message ?? 'Course update failed.');
    } finally {
      setIsUpdatingCourse(false);
    }
  };

  const handleCreateCourse = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.title.trim() || !form.desc.trim()) {
      toast.error('Course title and description are required.');
      return;
    }

    if (!form.units.length || !form.units[0].lessons.length) {
      toast.error('At least 1 unit and 1 lesson are required.');
      return;
    }

    if (!form.category) {
      toast.error('Selecting a category is required.');
      return;
    }

    if (!form.cover_img) {
      toast.error('Course image is required.');
      return;
    }

    for (let unitIdx = 0; unitIdx < form.units.length; unitIdx += 1) {
      const unit = form.units[unitIdx];
      for (let lessonIdx = 0; lessonIdx < unit.lessons.length; lessonIdx += 1) {
        const lesson = unit.lessons[lessonIdx];
        const needsQuiz = lesson.kind === 'QUIZ' || lesson.attach_quiz;
        if (!needsQuiz) continue;

        const quiz = attachedQuizzes[`${unitIdx}-${lessonIdx}`];
        const label = `Unit ${unitIdx + 1}, lesson ${lessonIdx + 1}`;

        if (!quiz || !quiz.title.trim() || !quiz.description.trim() || !quiz.questions.length) {
          toast.error(`${label}: complete the quiz title, description, and questions.`);
          return;
        }

        for (let qIdx = 0; qIdx < quiz.questions.length; qIdx += 1) {
          const question = quiz.questions[qIdx];
          const variants = question.variants.map((variant) => ({
            text: variant.text.trim(),
            is_correct: variant.is_correct,
          }));
          const correctCount = variants.filter((variant) => variant.is_correct).length;

          if (!question.question_text.trim() || variants.length < 2 || variants.some((variant) => !variant.text)) {
            toast.error(`${label}: complete question ${qIdx + 1} and at least two answer options.`);
            return;
          }

          if (correctCount !== 1) {
            toast.error(`${label}: question ${qIdx + 1} must have exactly one correct answer.`);
            return;
          }
        }
      }
    }

    try {
      setIsCreating(true);

      await courseApi.create({
        title: form.title.trim(),
        desc: form.desc.trim(),
        base_price: Number(form.base_price),
        discount_price: Number(form.discount_price),
        category: form.category,
        cover_img: form.cover_img,
        units: form.units.map((unit, unitIdx) => ({
          title: unit.title.trim(),
          desc: unit.desc.trim(),
          lessons: unit.lessons.map((lesson, lessonIdx) => {
            const attachedKey = `${unitIdx}-${lessonIdx}`;
            const attached = lesson.attach_quiz || lesson.kind === 'QUIZ'
              ? attachedQuizzes[attachedKey] ?? null
              : null;
            return {
              kind: lesson.kind,
              title: lesson.title.trim(),
              desc: lesson.desc.trim(),
              duration_min: lesson.duration_min,
              content_md: lesson.content_md,
              additional_task: lesson.additional_task.trim(),
              external_url: lesson.external_url.trim(),
              assignment_instructions: lesson.assignment_instructions,
              assignment_due_at: lesson.assignment_due_at || null,
              allow_multiple_files: lesson.allow_multiple_files,
              exercise: lesson.kind === 'EXERCISE' ? lesson.exercise : null,
              attached_quiz: attached,
              video: lesson.video,
              captions: lesson.captions,
              presentation: lesson.presentation,
            };
          }),
        })),
      });

      await refetch();

      toast.success('Course created successfully.');
      setForm({
        title: '',
        desc: '',
        base_price: 0,
        discount_price: 0,
        category: '',
        cover_img: null,
        units: [{ title: '', desc: '', lessons: [createEmptyLesson()] }],
      });
      setAttachedQuizzes({});
      changeTab('courses');
    } catch (err: unknown) {
      toast.error((err as Error | undefined)?.message ?? 'Failed to create course.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-8 dark:bg-slate-950 min-h-screen">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Instructor dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage courses, lessons, and student submissions.
        </p>
      </header>
      <div role="tablist" className="inline-flex p-1 mb-8 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {(['overview', 'courses', 'submissions', 'create'] as Tab[]).map(tab => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={active}
              onClick={() => changeTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                active
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab courses={courses} loading={loading} />
      )}

      {activeTab === 'courses' && (
        <InstructorCourseList
          courses={courses}
          loading={loading}
          editingCourseId={editingCourseId}
          editForm={editForm}
          isUpdatingCourse={isUpdatingCourse}
          setEditForm={setEditForm}
          startEditCourse={startEditCourse}
          cancelEditCourse={cancelEditCourse}
          handleUpdateCourse={handleUpdateCourse}
          quizDetail={quizDetail}
          refetch={refetch}
        />
      )}

      {activeTab === 'submissions' && (
        <SubmissionsInbox />
      )}

      {activeTab === 'create' && (
        <CourseCreateWizard
          form={form}
          setForm={setForm}
          categories={categories}
          isCreating={isCreating}
          onSubmit={handleCreateCourse}
          onCancel={() => changeTab('courses')}
          attachedQuizzes={attachedQuizzes}
          setAttachedQuizzes={setAttachedQuizzes}
        />
      )}
    </div>
  );
}
