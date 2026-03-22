import { Fragment, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/app/store/AuthContext';
import { categoryApi, CategoryItem, courseApi, quizApi, UserCourseItem } from '@/app/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, Star, TrendingUp } from 'lucide-react';

type Tab = 'overview' | 'courses' | 'create';

interface LessonFormItem {
  title: string;
  desc: string;
  additional_task: string;
  video: File | null;
  presentation: File | null;
}

interface QuizVariantFormItem {
  text: string;
  is_correct: boolean;
}

interface QuizQuestionFormItem {
  question_text: string;
  points: number;
  variants: QuizVariantFormItem[];
}

interface UnitFormItem {
  title: string;
  desc: string;
  lessons: LessonFormItem[];
}

interface CourseFormState {
  title: string;
  desc: string;
  base_price: number;
  discount_price: number;
  category: string;
  cover_img: File | null;
  units: UnitFormItem[];
}

interface CourseEditFormState {
  title: string;
  desc: string;
  base_price: number;
  discount_price: number;
  cover_img: File | null;
}

interface CourseLessonOption {
  id: string;
  unitId: string;
  label: string;
}

interface CourseUnitOption {
  id: string;
  label: string;
}

interface QuizCreateFormState {
  title: string;
  description: string;
  questions: QuizQuestionFormItem[];
}

const createEmptyQuizVariant = (isCorrect = false): QuizVariantFormItem => ({
  text: '',
  is_correct: isCorrect,
});

const createEmptyQuizQuestion = (): QuizQuestionFormItem => ({
  question_text: '',
  points: 1,
  variants: [createEmptyQuizVariant(true), createEmptyQuizVariant(false)],
});

const createEmptyQuizCreateForm = (): QuizCreateFormState => ({
  title: '',
  description: '',
  questions: [createEmptyQuizQuestion()],
});

const createEmptyLesson = (): LessonFormItem => ({
  title: '',
  desc: '',
  additional_task: '',
  video: null,
  presentation: null,
});

function extractCourseQuizOptions(source: any): {
  units: CourseUnitOption[];
  lessons: CourseLessonOption[];
} {
  const unitOptions: CourseUnitOption[] = [];
  const lessonOptions: CourseLessonOption[] = [];

  const candidateRoots = [
    source,
    source?.data,
    source?.course,
    source?.data?.course,
  ];

  for (const root of candidateRoots) {
    const units = root?.units;
    if (!Array.isArray(units)) continue;

    units.forEach((unit: any, unitIndex: number) => {
      if (typeof unit?.id !== 'string' || !unit.id) return;
      const unitLabel = unit?.title || `Unit ${unitIndex + 1}`;
      unitOptions.push({ id: unit.id, label: unitLabel });

      if (!Array.isArray(unit?.lessons)) return;
      unit.lessons.forEach((lesson: any, lessonIndex: number) => {
        if (typeof lesson?.id !== 'string' || !lesson.id) return;
        const lessonLabel = lesson?.title || `Lesson ${lessonIndex + 1}`;
        lessonOptions.push({
          id: lesson.id,
          unitId: unit.id,
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

const mockChartData = [
  { month: 'Oct', enrollments: 12 },
  { month: 'Nov', enrollments: 28 },
  { month: 'Dec', enrollments: 19 },
  { month: 'Jan', enrollments: 34 },
  { month: 'Feb', enrollments: 41 },
  { month: 'Mar', enrollments: 38 },
];

export default function InstructorDashboard() {
  useAuth();
  const didLoadInitialDataRef = useRef(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [isUpdatingCourse, setIsUpdatingCourse] = useState(false);
  const [myCourses, setMyCourses] = useState<UserCourseItem[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CourseEditFormState | null>(null);
  const [quizCourseId, setQuizCourseId] = useState<string | null>(null);
  const [quizUnitId, setQuizUnitId] = useState('');
  const [quizUnitOptions, setQuizUnitOptions] = useState<CourseUnitOption[]>([]);
  const [quizLessonOptions, setQuizLessonOptions] = useState<CourseLessonOption[]>([]);
  const [quizLessonId, setQuizLessonId] = useState('');
  const [quizForm, setQuizForm] = useState<QuizCreateFormState>(createEmptyQuizCreateForm());
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [form, setForm] = useState<CourseFormState>({
    title: '',
    desc: '',
    base_price: 0,
    discount_price: 0,
    category: '',
    cover_img: null,
    units: [
      {
        title: '',
        desc: '',
        lessons: [createEmptyLesson()],
      },
    ],
  });

  useEffect(() => {
    if (didLoadInitialDataRef.current) return;
    didLoadInitialDataRef.current = true;

    const loadInitialData = async () => {
      setIsLoadingCourses(true);
      const [categoryResult, courseResult] = await Promise.allSettled([
        categoryApi.list(),
        courseApi.myCourses(),
      ]);

      if (categoryResult.status === 'fulfilled') {
        setCategories(categoryResult.value?.data ?? []);
      } else {
        toast.error('Failed to load categories.');
      }

      if (courseResult.status === 'fulfilled') {
        setMyCourses(courseResult.value?.data ?? []);
      } else {
        const message = (courseResult.reason as Error | undefined)?.message;
        toast.error(message ?? 'Failed to load course list.');
        setMyCourses([]);
      }

      if (categoryResult.status === 'rejected' && courseResult.status === 'rejected') {
        toast.error('Failed to load dashboard data.');
      }

      setIsLoadingCourses(false);
    };

    loadInitialData();
  }, []);

  const reloadMyCourses = async () => {
    const response = await courseApi.myCourses();
    setMyCourses(response?.data ?? []);
  };

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
    if (!editingCourseId || !editForm) {
      return;
    }

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

      await reloadMyCourses();
      toast.success('Course updated.');
      cancelEditCourse();
    } catch (err: any) {
      toast.error(err?.message ?? 'Course update failed.');
    } finally {
      setIsUpdatingCourse(false);
    }
  };

  const startCreateQuiz = async (courseId: string) => {
    const selectedCourse = myCourses.find(course => course.id === courseId);
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

    const normalizedQuestions = [] as Array<{ question_text: string; points: number; variants: QuizVariantFormItem[] }>;
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
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create quiz.');
    } finally {
      setIsCreatingQuiz(false);
    }
  };

  const updateUnit = (unitIndex: number, key: 'title' | 'desc', value: string) => {
    setForm(prev => ({
      ...prev,
      units: prev.units.map((unit, idx) => (idx === unitIndex ? { ...unit, [key]: value } : unit)),
    }));
  };

  const updateLesson = (
    unitIndex: number,
    lessonIndex: number,
    key: 'title' | 'desc' | 'additional_task',
    value: string
  ) => {

    setForm(prev => ({
      ...prev,
      units: prev.units.map((unit, idx) => {
        if (idx !== unitIndex) return unit;
        return {
          ...unit,
          lessons: unit.lessons.map((lesson, lIdx) =>
            lIdx === lessonIndex ? { ...lesson, [key]: value } : lesson
          ),
        };
      }),
    }));
  };

  const updateLessonFile = (
    unitIndex: number,
    lessonIndex: number,
    key: 'video' | 'presentation',
    file: File | null
  ) => {
    setForm(prev => ({
      ...prev,
      units: prev.units.map((unit, idx) => {
        if (idx !== unitIndex) return unit;
        return {
          ...unit,
          lessons: unit.lessons.map((lesson, lIdx) =>
            lIdx === lessonIndex ? { ...lesson, [key]: file } : lesson
          ),
        };
      }),
    }));
  };

  const addUnit = () => {
    setForm(prev => ({
      ...prev,
      units: [
        ...prev.units,
        { title: '', desc: '', lessons: [createEmptyLesson()] },
      ],
    }));
  };

  const addLesson = (unitIndex: number) => {
    setForm(prev => ({
      ...prev,
      units: prev.units.map((unit, idx) =>
        idx === unitIndex
          ? { ...unit, lessons: [...unit.lessons, createEmptyLesson()] }
          : unit
      ),
    }));
  };

  const handleCreateCourse = async (e: React.FormEvent<HTMLFormElement>) => {
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

      await reloadMyCourses();

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
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create course.');
    } finally {
      setIsCreating(false);
    }
  };
  const totalCourses = myCourses.length;
  const totalBasePrice = myCourses.reduce((sum, course) => sum + Number(course.base_price || 0), 0);
  const totalDiscountPrice = myCourses.reduce((sum, course) => sum + Number(course.discount_price || 0), 0);
  const totalDiscountValue = totalBasePrice - totalDiscountPrice;
  const filteredQuizLessonOptions = quizUnitId
    ? quizLessonOptions.filter(lesson => lesson.unitId === quizUnitId)
    : quizLessonOptions;

  const stats = [
    { label: 'Total Courses', value: totalCourses.toLocaleString(), icon: <BookOpen className="w-5 h-5 text-purple-500" /> },
    { label: 'Total Base Price', value: totalBasePrice.toLocaleString(), icon: <Users className="w-5 h-5 text-blue-500" /> },
    { label: 'Total Discount Price', value: totalDiscountPrice.toLocaleString(), icon: <Star className="w-5 h-5 text-yellow-500" /> },
    { label: 'Discount Value', value: totalDiscountValue.toLocaleString(), icon: <TrendingUp className="w-5 h-5 text-green-500" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Instructor Dashboard</h1>
      <div className="flex gap-4 mb-8 border-b">
        {(['overview', 'courses', 'create'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'create' ? 'Create Course' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(stat => (
              <Card key={stat.label}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg">{stat.icon}</div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>Monthly Enrollments</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={mockChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="enrollments" fill="#9333ea" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'courses' && (
        <div>
          <h2 className="text-xl font-bold mb-4">My Courses ({myCourses.length})</h2>

          {isLoadingCourses && (
            <p className="text-sm text-gray-600">Loading course list...</p>
          )}

          {!isLoadingCourses && myCourses.length === 0 && (
            <p className="text-sm text-gray-600">No courses yet.</p>
          )}

          {!isLoadingCourses && myCourses.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3">Course</th>
                    <th className="text-left py-3">Base Price</th>
                    <th className="text-left py-3">Discount Price</th>
                    <th className="text-left py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myCourses.map(course => (
                    <Fragment key={course.id}>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="py-3 font-medium">
                          <div className="flex items-center gap-3">
                            <img
                              src={course.cover_img ?? 'https://placehold.co/120x70?text=No+Image'}
                              alt={course.title}
                              className="w-16 h-10 object-cover rounded border"
                            />
                            <div>
                              <p className="font-medium">{course.title}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">{course.desc}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">{Number(course.base_price).toLocaleString()}</td>
                        <td className="py-3">{Number(course.discount_price).toLocaleString()}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => startEditCourse(course)}>
                              Update
                            </Button>
                            <Button type="button" variant="outline" onClick={() => startCreateQuiz(course.id)}>
                              Create Quiz
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {editingCourseId === course.id && editForm && (
                        <tr className="border-b bg-gray-50">
                          <td colSpan={4} className="py-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Input
                                value={editForm.title}
                                onChange={e => setEditForm(prev => (prev ? { ...prev, title: e.target.value } : prev))}
                                placeholder="Title"
                              />
                              <Input
                                type="number"
                                min="0"
                                value={editForm.base_price}
                                onChange={e => setEditForm(prev => (prev ? { ...prev, base_price: Number(e.target.value) } : prev))}
                                placeholder="Base price"
                              />
                              <Input
                                type="number"
                                min="0"
                                value={editForm.discount_price}
                                onChange={e => setEditForm(prev => (prev ? { ...prev, discount_price: Number(e.target.value) } : prev))}
                                placeholder="Discount price"
                              />
                              <input
                                type="file"
                                accept="image/*"
                                className="w-full text-sm"
                                onChange={e => setEditForm(prev => (prev ? { ...prev, cover_img: e.target.files?.[0] ?? null } : prev))}
                              />
                              <div className="md:col-span-2">
                                <Textarea
                                  value={editForm.desc}
                                  onChange={e => setEditForm(prev => (prev ? { ...prev, desc: e.target.value } : prev))}
                                  placeholder="Description"
                                />
                              </div>
                            </div>

                            <div className="flex gap-2 mt-3">
                              <Button
                                type="button"
                                className="bg-purple-600 hover:bg-purple-700"
                                disabled={isUpdatingCourse}
                                onClick={handleUpdateCourse}
                              >
                                {isUpdatingCourse ? 'Updating...' : 'Save Update'}
                              </Button>
                              <Button type="button" variant="outline" onClick={cancelEditCourse}>
                                Cancel
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {quizCourseId === course.id && (
                        <tr className="border-b bg-gray-50">
                          <td colSpan={4} className="py-3">
                            <div className="space-y-3">
                              <p className="text-sm font-semibold">Create Quiz</p>

                              <select
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={quizUnitId}
                                onChange={e => {
                                  const unitId = e.target.value;
                                  setQuizUnitId(unitId);
                                  setQuizLessonId('');
                                }}
                              >
                                <option value="">Select a unit</option>
                                {quizUnitOptions.map(unit => (
                                  <option key={unit.id} value={unit.id}>
                                    {unit.label}
                                  </option>
                                ))}
                              </select>

                              <select
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={quizLessonId}
                                onChange={e => setQuizLessonId(e.target.value)}
                              >
                                <option value="">Select a lesson</option>
                                {filteredQuizLessonOptions.map(lesson => (
                                  <option key={lesson.id} value={lesson.id}>
                                    {lesson.label}
                                  </option>
                                ))}
                              </select>

                              <Input
                                placeholder="Quiz title"
                                value={quizForm.title}
                                onChange={e => setQuizForm(prev => ({ ...prev, title: e.target.value }))}
                              />
                              <Textarea
                                placeholder="Quiz description"
                                value={quizForm.description}
                                onChange={e => setQuizForm(prev => ({ ...prev, description: e.target.value }))}
                              />

                              {quizForm.questions.map((question, questionIndex) => (
                                <div key={questionIndex} className="rounded-md border p-3 bg-white space-y-2">
                                  <p className="text-xs font-semibold text-gray-600">Question {questionIndex + 1}</p>
                                  <Input
                                    placeholder="Question text"
                                    value={question.question_text}
                                    onChange={e => updateQuizQuestion(questionIndex, 'question_text', e.target.value)}
                                  />
                                  <Input
                                    type="number"
                                    min="1"
                                    value={question.points}
                                    onChange={e => updateQuizQuestion(questionIndex, 'points', Number(e.target.value))}
                                  />

                                  {question.variants.map((variant, variantIndex) => (
                                    <div key={variantIndex} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-center">
                                      <Input
                                        placeholder={`Variant ${variantIndex + 1}`}
                                        value={variant.text}
                                        onChange={e => updateQuizVariantText(questionIndex, variantIndex, e.target.value)}
                                      />
                                      <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                                        <input
                                          type="radio"
                                          name={`course-quiz-correct-${questionIndex}`}
                                          checked={variant.is_correct}
                                          onChange={() => setQuizCorrectVariant(questionIndex, variantIndex)}
                                        />
                                        Correct answer
                                      </label>
                                    </div>
                                  ))}

                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => addQuizVariant(questionIndex)}
                                  >
                                    Add Option
                                  </Button>
                                </div>
                              ))}

                              <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={addQuizQuestion}>
                                  Add Question
                                </Button>
                                <Button
                                  type="button"
                                  className="bg-purple-600 hover:bg-purple-700"
                                  disabled={isCreatingQuiz}
                                  onClick={handleCreateQuizzes}
                                >
                                  {isCreatingQuiz ? 'Creating...' : 'Create Quiz'}
                                </Button>
                                <Button type="button" variant="outline" onClick={cancelCreateQuiz}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <Card>
          <CardHeader><CardTitle>Create New Course</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4 max-w-3xl" onSubmit={handleCreateCourse}>
              <div className="space-y-2">
                <Label>Course Title</Label>
                <Input
                  placeholder="e.g. Complete React Developer Course"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Short description of the course"
                  value={form.desc}
                  onChange={e => setForm(prev => ({ ...prev, desc: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Price</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.base_price}
                    onChange={e => setForm(prev => ({ ...prev, base_price: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount Price</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.discount_price}
                    onChange={e => setForm(prev => ({ ...prev, discount_price: Number(e.target.value) }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.category}
                  onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Course Image</Label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-sm"
                  onChange={e => setForm(prev => ({ ...prev, cover_img: e.target.files?.[0] ?? null }))}
                  required
                />
              </div>

              {form.units.map((unit, unitIndex) => (
                <div key={unitIndex} className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold">Unit {unitIndex + 1}</h3>
                  <div className="space-y-2">
                    <Label>Unit Title</Label>
                    <Input
                      value={unit.title}
                      onChange={e => updateUnit(unitIndex, 'title', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Description</Label>
                    <Textarea
                      value={unit.desc}
                      onChange={e => updateUnit(unitIndex, 'desc', e.target.value)}
                      required
                    />
                  </div>

                  {unit.lessons.map((lesson, lessonIndex) => (
                    <div key={lessonIndex} className="border rounded-md p-3 space-y-2 bg-gray-50">
                      <p className="text-sm font-medium">Lesson {lessonIndex + 1}</p>
                      <Input
                        placeholder="Lesson title"
                        value={lesson.title}
                        onChange={e => updateLesson(unitIndex, lessonIndex, 'title', e.target.value)}
                        required
                      />
                      <Textarea
                        placeholder="Lesson description"
                        value={lesson.desc}
                        onChange={e => updateLesson(unitIndex, lessonIndex, 'desc', e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Additional task"
                        value={lesson.additional_task}
                        onChange={e => updateLesson(unitIndex, lessonIndex, 'additional_task', e.target.value)}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-600">Video (optional)</Label>
                          <input
                            type="file"
                            accept="video/*"
                            className="w-full text-sm"
                            onChange={e => updateLessonFile(unitIndex, lessonIndex, 'video', e.target.files?.[0] ?? null)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-600">Presentation (optional)</Label>
                          <input
                            type="file"
                            accept=".pdf,.ppt,.pptx,.key"
                            className="w-full text-sm"
                            onChange={e => updateLessonFile(unitIndex, lessonIndex, 'presentation', e.target.files?.[0] ?? null)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={() => addLesson(unitIndex)}>
                    Add Lesson
                  </Button>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addUnit}>
                Add Unit
              </Button>

              <div className="flex gap-3">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Course'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setActiveTab('courses')}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
