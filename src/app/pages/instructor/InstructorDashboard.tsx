import { useState, FormEvent } from 'react';
import { useAuth } from '@/app/store/AuthContext';
import { courseApi, UserCourseItem } from '@/app/services/api';
import { toast } from 'sonner';
import { useInstructorCourses } from '@/app/hooks/useInstructorCourses';
import { useInstructorCourseDetail } from '@/app/hooks/useInstructorCourseDetail';
import { CourseEditFormState, CourseFormState, createEmptyLesson } from '@/app/utils/instructorDashboard';
import { OverviewTab } from './components/OverviewTab';
import { InstructorCourseList } from './components/InstructorCourseList';
import { CourseCreateWizard } from './components/CourseCreateWizard';

type Tab = 'overview' | 'courses' | 'create';

export default function InstructorDashboard() {
  useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
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

    try {
      setIsCreating(true);

      await courseApi.create({
        title: form.title.trim(),
        desc: form.desc.trim(),
        base_price: Number(form.base_price),
        discount_price: Number(form.discount_price),
        category: form.category,
        cover_img: form.cover_img,
        units: form.units.map(unit => ({
          title: unit.title.trim(),
          desc: unit.desc.trim(),
          lessons: unit.lessons.map(lesson => ({
            title: lesson.title.trim(),
            desc: lesson.desc.trim(),
            additional_task: lesson.additional_task.trim(),
            video: lesson.video,
            presentation: lesson.presentation,
          })),
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
      setActiveTab('courses');
    } catch (err: unknown) {
      toast.error((err as Error | undefined)?.message ?? 'Failed to create course.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 dark:bg-slate-950 min-h-screen">
      <h1 className="text-3xl font-bold mb-4 dark:text-slate-100">Instructor Dashboard</h1>
      <div className="flex gap-4 mb-8 border-b dark:border-slate-700">
        {(['overview', 'courses', 'create'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'
            }`}
          >
            {tab === 'create' ? 'Create Course' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
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
        />
      )}

      {activeTab === 'create' && (
        <CourseCreateWizard
          form={form}
          setForm={setForm}
          categories={categories}
          isCreating={isCreating}
          onSubmit={handleCreateCourse}
          onCancel={() => setActiveTab('courses')}
        />
      )}
    </div>
  );
}
