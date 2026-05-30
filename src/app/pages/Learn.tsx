// Learn page — multi-kind lesson runner.
// Supports the new lesson taxonomy (VIDEO / ARTICLE / CHEATSHEET / EXERCISE /
// QUIZ / ASSIGNMENT / RESOURCE / DISCUSSION) and stays backwards-compatible
// with the legacy {video + quizzes} payload via inferKind().

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router';
import { type Course } from '@/app/data/courses';
import { courseQuizzes, type SectionQuiz } from '@/app/data/quizzes';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ErrorState } from '@/app/components/ui/ErrorState';
import {
  courseApi,
  resolveCourseId,
  type MyCourseDetailResponse,
} from '@/app/services/api';
import { useAuth } from '@/app/store/AuthContext';
import { currentUserScope } from '@/app/utils/userScope';
import { mapApiCourseToCourse } from '@/app/utils/courseMapper';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

import { type ApiLesson, KIND_META, inferKind, kindAllowsQuizAttach } from './learn/lessonKind';
import {
  ArticleLessonRenderer,
  AssignmentLessonRenderer,
  CheatsheetLessonRenderer,
  DiscussionLessonRenderer,
  ExerciseLessonRenderer,
  ResourceLessonRenderer,
  VideoLessonRenderer,
  type LessonRendererProps,
} from './learn/LessonRenderer';
import { LearnSidebar, type SidebarUnit } from './learn/LearnSidebar';
import {
  QuizIdle,
  QuizResults,
  QuizTaking,
  mapApiQuizToUi,
  resolveStars,
  type QuizSubmitData,
  type UiQuiz,
} from './learn/QuizPanels';

interface LectureProgress {
  completedLectures: string[];
}

interface QuizHistoryRecord {
  id: string;
  quizId: string;
  quizTitle: string;
  courseId: string;
  courseTitle: string;
  correctAnswers: number;
  wrongAnswers: number;
  totalQuestions: number;
  status: 'PASSED' | 'FAILED';
  stars: number;
  total: string;
  attempt: number;
  createdAt: string;
}

const QUIZ_HISTORY_STORAGE_PREFIX = 'da_quiz_history';

function getQuizHistoryStorageKey(userId: string) {
  return `${QUIZ_HISTORY_STORAGE_PREFIX}:${userId}`;
}

function loadQuizHistory(userId: string): QuizHistoryRecord[] {
  try {
    const raw = localStorage.getItem(getQuizHistoryStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QuizHistoryRecord[]) : [];
  } catch {
    return [];
  }
}

function saveQuizHistoryEntry(userId: string, entry: QuizHistoryRecord) {
  try {
    const existing = loadQuizHistory(userId);
    localStorage.setItem(getQuizHistoryStorageKey(userId), JSON.stringify([entry, ...existing]));
  } catch {
    // Best-effort only.
  }
}

type RendererComponent = (props: LessonRendererProps) => React.ReactNode;

const KIND_TO_RENDERER: Record<string, RendererComponent> = {
  VIDEO: VideoLessonRenderer,
  ARTICLE: ArticleLessonRenderer,
  CHEATSHEET: CheatsheetLessonRenderer,
  EXERCISE: ExerciseLessonRenderer,
  ASSIGNMENT: AssignmentLessonRenderer,
  RESOURCE: ResourceLessonRenderer,
  DISCUSSION: DiscussionLessonRenderer,
};

function lessonProgressKey(lesson: ApiLesson | undefined, unitIndex: number, lessonIndex: number) {
  return lesson?.id || `${unitIndex}-${lessonIndex}`;
}

function legacyLessonProgressKey(unitIndex: number, lessonIndex: number) {
  return `${unitIndex}-${lessonIndex}`;
}

function getAllLessonProgressKeys(units: SidebarUnit[]) {
  return units.flatMap((unit, unitIndex) =>
    unit.lessons.map((lesson, lessonIndex) => lessonProgressKey(lesson, unitIndex, lessonIndex)),
  );
}

function normalizeCompletedLectures(completed: string[], units: SidebarUnit[]) {
  const converted = completed.map((key) => {
    const match = /^(\d+)-(\d+)$/.exec(key);
    if (!match) return key;
    const unitIndex = Number(match[1]);
    const lessonIndex = Number(match[2]);
    return lessonProgressKey(units[unitIndex]?.lessons?.[lessonIndex], unitIndex, lessonIndex);
  });

  return Array.from(new Set(converted));
}

function countCompletedLessons(completed: string[], units: SidebarUnit[]) {
  const normalized = normalizeCompletedLectures(completed, units);
  return getAllLessonProgressKeys(units).filter((key) => normalized.includes(key)).length;
}

export default function Learn() {
  const { courseId: learningId } = useParams<{ courseId: string }>();
  const location = useLocation();
  const { user, tier, refreshGamification } = useAuth();
  const [myCourseDetail, setMyCourseDetail] = useState<MyCourseDetailResponse['data'] | null>(null);
  const [loadingMyCourse, setLoadingMyCourse] = useState(true);
  const [resolvedEnrollmentId, setResolvedEnrollmentId] = useState<string | null>(null);
  const [resolvedPublicCourse, setResolvedPublicCourse] = useState<Course | null>(null);

  const cachedCourses = useMemo(() => {
    try {
      const raw = localStorage.getItem('da_public_courses_cache');
      if (!raw) return [] as Course[];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Course[]) : [];
    } catch {
      return [] as Course[];
    }
  }, []);

  const enrollmentId = myCourseDetail?.id ?? resolvedEnrollmentId ?? learningId;
  const fallbackCourse = cachedCourses.find((c) => c.id === learningId || c.slug === learningId);
  const resolvedCourseId = myCourseDetail?.course?.id ?? fallbackCourse?.id ?? learningId;
  const resolvedCourseSlug = fallbackCourse?.slug ?? resolvedCourseId;
  const resolvedCourse =
    resolvedPublicCourse ?? cachedCourses.find((c) => c.id === resolvedCourseId || c.slug === resolvedCourseId);

  // Build sidebar units from API payload, falling back to public-course curriculum stubs.
  const units: SidebarUnit[] = useMemo(() => {
    if (myCourseDetail) {
      return myCourseDetail.course.units.map((u) => ({
        id: u.id,
        title: u.title,
        lessons: (u.lessons ?? []) as ApiLesson[],
      }));
    }
    if (resolvedCourse?.curriculum) {
      return resolvedCourse.curriculum.map((section, idx) => ({
        id: `stub-${idx}`,
        title: section.section,
        lessons: Array.from({ length: section.lectures }).map((_, lIdx) => ({
          id: `stub-${idx}-${lIdx}`,
          title: `Lecture ${lIdx + 1}`,
        })),
      }));
    }
    return [];
  }, [myCourseDetail, resolvedCourse]);

  const courseTitle = resolvedCourse?.title ?? 'My course';
  const [currentUnit, setCurrentUnit] = useState(0);
  const [currentLesson, setCurrentLesson] = useState(0);
  const currentLessonObj: ApiLesson | undefined = units[currentUnit]?.lessons?.[currentLesson];

  const [progress, setProgress] = useState<LectureProgress>(() => {
    try {
      const stored = localStorage.getItem(`progress_${currentUserScope()}_${resolvedCourseId}`);
      return stored ? JSON.parse(stored) : { completedLectures: [] };
    } catch {
      return { completedLectures: [] };
    }
  });

  // Quiz UI state: shared between standalone QUIZ kind and the attached quiz tab.
  const [activeView, setActiveView] = useState<'content' | 'quiz'>('content');
  const [quizState, setQuizState] = useState<'idle' | 'taking' | 'results'>('idle');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizSubmitData, setQuizSubmitData] = useState<QuizSubmitData | null>(null);

  useEffect(() => {
    const loadMyCourseDetail = async () => {
      if (!learningId) return;

      try {
        setLoadingMyCourse(true);
        let res: Awaited<ReturnType<typeof courseApi.myEnrolledCourseDetail>> | null = null;

        try {
          res = await courseApi.myEnrolledCourseDetail(learningId);
        } catch {
          const myCourses = await courseApi.myEnrolledCourses();
          const matchedCourse = (myCourses.data ?? []).find(
            (item) => item.id === learningId || resolveCourseId(item.course) === learningId
          );

          if (matchedCourse?.id) {
            setResolvedEnrollmentId(matchedCourse.id);
            res = await courseApi.myEnrolledCourseDetail(matchedCourse.id);
          } else {
            const publicCourses = await courseApi.userCourses();
            const matchedPublicCourse = publicCourses.data.find(
              (item) => item.id === learningId || item.slug === learningId
            );

            if (matchedPublicCourse) {
              setResolvedPublicCourse(mapApiCourseToCourse(matchedPublicCourse));
            } else {
              try {
                const detail = await courseApi.publicDetail(learningId);
                setResolvedPublicCourse({
                  id: detail.id ?? learningId,
                  slug: detail.slug ?? learningId,
                  title: detail.title ?? 'My course',
                  instructor: detail.instructor_name ?? detail.teacher_name ?? detail.instructor ?? 'Digital Academy',
                  rating: 4.7,
                  reviewCount: 0,
                  price: detail.discount_price ?? detail.base_price ?? 0,
                  originalPrice: detail.base_price,
                  image:
                    detail.cover_img ??
                    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1080&q=80',
                  category: 'development',
                  level: 'All Levels',
                  duration: 'Self-paced',
                  students: 0,
                  description: detail.desc ?? '',
                  lastUpdated: '2026',
                  language: 'English',
                  whatYouWillLearn: ['Course content available after enrollment'],
                  requirements: ['Internet connection'],
                  curriculum: Array.isArray(detail.units)
                    ? detail.units.map((unit: { title: string; lessons?: unknown[] }) => ({
                        section: unit.title,
                        lectures: Array.isArray(unit.lessons) ? unit.lessons.length : 0,
                        duration: '--',
                      }))
                    : [],
                });
              } catch {
                /* fall back to local/cache data */
              }
            }
          }
        }

        setMyCourseDetail(res?.data ?? null);
      } catch {
        setMyCourseDetail(null);
      } finally {
        setLoadingMyCourse(false);
      }
    };

    loadMyCourseDetail();
  }, [learningId]);

  useEffect(() => {
    if (!resolvedCourseId) return;
    localStorage.setItem(`progress_${currentUserScope()}_${resolvedCourseId}`, JSON.stringify(progress));
  }, [progress, resolvedCourseId]);

  useEffect(() => {
    const loadServerProgress = async () => {
      if (!enrollmentId && !resolvedCourseId) return;
      try {
        const res = await courseApi.getProgress({
          enrollmentId: enrollmentId ?? undefined,
          courseId: resolvedCourseId ?? undefined,
        });
        const payload = res?.data ?? res;

        if (Array.isArray(payload?.completed_lectures) && payload.completed_lectures.length > 0) {
          setProgress((current) => {
            const server = normalizeCompletedLectures(payload.completed_lectures, units);
            return { completedLectures: server };
          });
          return;
        }

        const percent = Number(payload?.progress ?? 0);
        if (!Number.isFinite(percent) || percent <= 0 || units.length === 0) return;

        const total = units.reduce((sum, u) => sum + u.lessons.length, 0);
        const estimatedCompleted = Math.min(total, Math.max(0, Math.round((percent / 100) * total)));

        const keys: string[] = [];
        for (let sIdx = 0; sIdx < units.length; sIdx += 1) {
          for (let lIdx = 0; lIdx < units[sIdx].lessons.length; lIdx += 1) {
            if (keys.length >= estimatedCompleted) break;
            keys.push(lessonProgressKey(units[sIdx].lessons[lIdx], sIdx, lIdx));
          }
          if (keys.length >= estimatedCompleted) break;
        }

        setProgress((current) => {
          const localCount = countCompletedLessons(current.completedLectures, units);
          return localCount >= keys.length ? current : { completedLectures: keys };
        });
      } catch {
        /* keep local */
      }
    };

    loadServerProgress();
  }, [enrollmentId, resolvedCourseId, units]);

  useEffect(() => {
    if (!units.length) return;
    if (currentUnit >= units.length) {
      setCurrentUnit(0);
      setCurrentLesson(0);
      return;
    }
    if (currentLesson >= units[currentUnit].lessons.length) {
      setCurrentLesson(0);
    }
  }, [units, currentUnit, currentLesson]);

  // Reset quiz state whenever the selected lesson changes.
  useEffect(() => {
    setActiveView('content');
    setQuizState('idle');
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizSubmitData(null);
  }, [currentUnit, currentLesson]);

  if (loadingMyCourse) {
    return (
      <div className="h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col overflow-hidden">
        <div className="bg-slate-900/90 px-4 py-3 flex items-center gap-4 border-b border-slate-700">
          <Skeleton className="h-8 w-20 bg-slate-700" />
          <Skeleton className="h-4 flex-1 bg-slate-700" />
          <Skeleton className="h-4 w-32 bg-slate-700" />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="hidden lg:flex w-80 flex-col border-r border-slate-700 bg-slate-900 p-4 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg bg-slate-700" />
            ))}
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
            <Skeleton className="w-full max-w-3xl aspect-video rounded-xl bg-slate-700" />
            <Skeleton className="h-4 w-64 bg-slate-700" />
          </div>
        </div>
      </div>
    );
  }

  if (!units.length) {
    return (
      <div className="h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <ErrorState
          title="Course not found"
          description="This course could not be loaded."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const totalLectures = units.reduce((sum, u) => sum + u.lessons.length, 0);
  const completedProgressKeys = normalizeCompletedLectures(progress.completedLectures, units);
  const completedCount = countCompletedLessons(completedProgressKeys, units);
  const completionPercent = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

  const lectureKey = lessonProgressKey(currentLessonObj, currentUnit, currentLesson);
  const legacyLectureKey = legacyLessonProgressKey(currentUnit, currentLesson);
  const isCompleted = completedProgressKeys.includes(lectureKey) || progress.completedLectures.includes(legacyLectureKey);
  const kind = currentLessonObj ? inferKind(currentLessonObj) : 'ARTICLE';
  const meta = KIND_META[kind];

  // Resolve the quiz for this lesson: prefer attached quiz, fall back to mock.
  const apiQuiz = mapApiQuizToUi(currentLessonObj?.quizzes?.[0], currentUnit);
  const fallbackQuiz = courseQuizzes[resolvedCourseId ?? '']?.[currentUnit] as SectionQuiz | undefined;
  const sectionQuiz: UiQuiz | null = apiQuiz
    ? apiQuiz
    : fallbackQuiz
    ? {
        id: `fallback-${fallbackQuiz.sectionIndex}`,
        title: fallbackQuiz.title,
        sectionIndex: fallbackQuiz.sectionIndex,
        questions: fallbackQuiz.questions.map((question) => ({
          id: String(question.id),
          question: question.question,
          options: question.options,
          correctIndex: question.correctIndex,
          explanation: question.explanation,
        })),
      }
    : null;

  const quizStorageKey = `quiz_${currentUserScope()}_${resolvedCourseId}_${currentUnit}_${currentLesson}`;
  const bestScore = sectionQuiz ? JSON.parse(localStorage.getItem(quizStorageKey) ?? 'null') : null;

  // Quiz is shown as a separate tab when (a) lesson kind is quiz-attachable
  // AND a quiz exists, OR (b) the lesson kind IS quiz (standalone).
  const showQuizTab = (kindAllowsQuizAttach(kind) && !!sectionQuiz) || kind === 'QUIZ';
  // When kind === 'QUIZ' we render quiz directly even if activeView stays 'content'.
  const effectiveView: 'content' | 'quiz' = kind === 'QUIZ' ? 'quiz' : activeView;

  const markComplete = () => {
    if (isCompleted) return;
    const next = Array.from(new Set([...completedProgressKeys, lectureKey]));
    setProgress({ completedLectures: next });
    const total = units.reduce((sum, u) => sum + u.lessons.length, 0);
    const completed = countCompletedLessons(next, units);
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const status = percent >= 100 ? 'COMPLETED' : 'IN_PROGRESS';

    courseApi
      .updateProgress({
        enrollmentId: enrollmentId ?? undefined,
        courseId: resolvedCourseId ?? undefined,
        data: { progress: percent, status, completed_lectures: next },
      })
      .catch(() => toast.error('Progress could not be saved to the server. Your local progress was kept.'));

    toast.success('Lesson completed!');
  };

  const submitQuiz = async () => {
    if (!sectionQuiz) return;
    setQuizSubmitted(true);

    let serverCorrect: number | null = null;
    let serverPassed: boolean | null = null;
    let serverData: QuizSubmitData | null = null;

    if (!sectionQuiz.id.startsWith('fallback-')) {
      try {
        const answers = sectionQuiz.questions
          .map((q) => {
            const idx = selectedAnswers[q.id];
            const variantId = typeof idx === 'number' ? q.variantIds?.[idx] : undefined;
            if (!variantId) return null;
            return { question: q.id, variant: variantId };
          })
          .filter((a): a is { question: string; variant: string } => a !== null);

        const resp = await courseApi.submitUserQuiz(sectionQuiz.id, { answers });
        serverData = resp?.data ?? null;
        serverCorrect = Number(serverData?.correct_answers);
        if (!Number.isFinite(serverCorrect)) serverCorrect = null;
        serverPassed = serverData?.status === 'PASSED';
        setQuizSubmitData(serverData);
        refreshGamification().catch(() => {});
      } catch (e) {
        console.error('Quiz submit failed:', e);
        toast.error('Quiz results could not be submitted to the server.');
      }
    }

    const correct = sectionQuiz.questions.filter((q) => selectedAnswers[q.id] === q.correctIndex).length;
    const total = sectionQuiz.questions.length;
    const finalCorrect = typeof serverCorrect === 'number' ? serverCorrect : correct;
    const passed = typeof serverPassed === 'boolean' ? serverPassed : finalCorrect / total >= 0.6;
    const pct = total > 0 ? (finalCorrect / total) * 100 : 0;

    const localHistory = user?.id ? loadQuizHistory(user.id) : [];
    const quizHistoryCourseId = resolvedCourseId ?? learningId ?? 'unknown-course';
    const nextAttempt =
      typeof serverData?.attempt === 'number'
        ? serverData.attempt
        : localHistory.filter((entry) => entry.quizId === sectionQuiz.id).length + 1;

    const existing = JSON.parse(localStorage.getItem(quizStorageKey) ?? '{}');
    if (!existing.passed || finalCorrect > (existing.correct ?? 0)) {
      localStorage.setItem(
        quizStorageKey,
        JSON.stringify({ score: finalCorrect, total, passed, correct: finalCorrect })
      );
    }

    if (user?.id) {
      saveQuizHistoryEntry(user.id, {
        id: crypto.randomUUID(),
        quizId: sectionQuiz.id,
        quizTitle: sectionQuiz.title,
        courseId: quizHistoryCourseId,
        courseTitle,
        correctAnswers: finalCorrect,
        wrongAnswers: Math.max(total - finalCorrect, 0),
        totalQuestions: total,
        status: passed ? 'PASSED' : 'FAILED',
        stars: typeof serverData?.stars === 'number' ? serverData.stars : resolveStars(pct),
        total: String(serverData?.total ?? finalCorrect),
        attempt: nextAttempt,
        createdAt: new Date().toISOString(),
      });
    }

    if (passed) {
      markComplete();
      toast.success('Quiz passed! Lesson completed.');
    }

    setTimeout(() => setQuizState('results'), 800);
  };

  const KindIcon = meta.Icon;
  const Renderer = KIND_TO_RENDERER[kind];
  const returnTo =
    typeof location.state?.returnTo === 'string'
      ? location.state.returnTo
      : resolvedCourseSlug
        ? `/course/${resolvedCourseSlug}`
        : '/courses';

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      <header className="bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center gap-4 border-b border-slate-800 flex-shrink-0">
        <Link to={returnTo}>
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate text-sm text-white">{courseTitle}</h1>
          <p className="text-[11px] text-slate-500 truncate">
            {meta.label}
            {currentLessonObj?.title ? ` · ${currentLessonObj.title}` : ''}
          </p>
        </div>

        {/* Single, redesigned progress indicator. Donut + count below. */}
        <div
          className="hidden sm:flex items-center gap-3 flex-shrink-0"
          aria-label={`${completionPercent}% of the course completed`}
        >
          <div className="text-right leading-tight">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Progress</p>
            <p className="text-xs font-medium text-slate-200 tabular-nums">
              {completedCount} <span className="text-slate-500">/ {totalLectures}</span>
            </p>
          </div>
          <div
            className="relative w-11 h-11 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(rgb(129 140 248) ${completionPercent * 3.6}deg, rgb(30 41 59) ${completionPercent * 3.6}deg)`,
            }}
          >
            <div className="absolute inset-1 rounded-full bg-slate-950 flex items-center justify-center">
              <span className="text-[11px] font-bold text-white tabular-nums">{completionPercent}%</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Tab bar appears only when a quiz tab is relevant alongside non-quiz content. */}
          {showQuizTab && kind !== 'QUIZ' && (
            <div className="flex gap-1 border-b border-slate-800 bg-slate-950 flex-shrink-0 px-3 sm:px-5 pt-2">
              <button
                onClick={() => {
                  setActiveView('content');
                  setQuizState('idle');
                }}
                className={`px-3 py-2 rounded-t-lg text-sm font-medium transition-all inline-flex items-center gap-2 ${
                  activeView === 'content'
                    ? `${meta.bgTint} ${meta.color}`
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <KindIcon className="w-4 h-4" /> {meta.label}
              </button>
              <button
                onClick={() => setActiveView('quiz')}
                className={`px-3 py-2 rounded-t-lg text-sm font-medium transition-all inline-flex items-center gap-2 ${
                  activeView === 'quiz'
                    ? 'bg-pink-500/10 text-pink-300 ring-1 ring-inset ring-pink-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <ClipboardList className="w-4 h-4" /> Quiz
                {bestScore?.passed && (
                  <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded-full ring-1 ring-inset ring-emerald-500/30">
                    {Math.round((bestScore.score / bestScore.total) * 100)}%
                  </span>
                )}
              </button>
            </div>
          )}

          {effectiveView === 'content' && currentLessonObj && Renderer && (
            <Renderer
              lesson={currentLessonObj}
              isCompleted={isCompleted}
              onMarkComplete={markComplete}
              hasFollowUpQuiz={kindAllowsQuizAttach(kind) && !!sectionQuiz}
              followUpQuizPassed={!!bestScore?.passed}
              onStartFollowUpQuiz={() => {
                setActiveView('quiz');
                setQuizState('idle');
              }}
            />
          )}

          {effectiveView === 'quiz' && (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-900/70 min-h-0">
              {!sectionQuiz ? (
                <div className="text-center py-20 max-w-md mx-auto">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pink-500/10 text-pink-300 ring-1 ring-inset ring-pink-500/30 mb-4">
                    <ClipboardList className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">No quiz available</h3>
                  <p className="text-sm text-slate-400 mt-2">
                    This quiz lesson has no questions attached yet. You can still mark it complete for local testing.
                  </p>
                  <Button
                    type="button"
                    className="mt-5 bg-indigo-600 hover:bg-indigo-500 text-white"
                    disabled={isCompleted}
                    onClick={markComplete}
                  >
                    {isCompleted ? 'Completed' : 'Mark as complete'}
                  </Button>
                </div>
              ) : quizState === 'idle' ? (
                <QuizIdle
                  quiz={sectionQuiz}
                  storageKey={quizStorageKey}
                  onStart={() => {
                    setQuizState('taking');
                    setSelectedAnswers({});
                    setQuizSubmitted(false);
                    setQuizSubmitData(null);
                  }}
                />
              ) : quizState === 'taking' ? (
                <QuizTaking
                  quiz={sectionQuiz}
                  selectedAnswers={selectedAnswers}
                  submitted={quizSubmitted}
                  onSelect={(qId, optIdx) =>
                    !quizSubmitted && setSelectedAnswers((prev) => ({ ...prev, [qId]: optIdx }))
                  }
                  onSubmit={submitQuiz}
                />
              ) : (
                <QuizResults
                  quiz={sectionQuiz}
                  selectedAnswers={selectedAnswers}
                  submitData={quizSubmitData}
                  hasTier={tier !== null}
                  onRetake={() => {
                    setQuizState('taking');
                    setSelectedAnswers({});
                    setQuizSubmitted(false);
                    setQuizSubmitData(null);
                  }}
                  onContinue={() => {
                    if (kind === 'QUIZ') {
                      // Jump to next lesson in the course on continue from a standalone quiz.
                      const flatTotal = units[currentUnit].lessons.length;
                      if (currentLesson + 1 < flatTotal) {
                        setCurrentLesson(currentLesson + 1);
                      } else if (currentUnit + 1 < units.length) {
                        setCurrentUnit(currentUnit + 1);
                        setCurrentLesson(0);
                      }
                    } else {
                      setActiveView('content');
                      setQuizState('idle');
                    }
                  }}
                />
              )}
            </div>
          )}
        </div>

        <LearnSidebar
          units={units}
          currentUnit={currentUnit}
          currentLesson={currentLesson}
          completedKeys={progress.completedLectures}
          totalLessons={totalLectures}
          completedCount={completedCount}
          onSelect={(uIdx, lIdx) => {
            setCurrentUnit(uIdx);
            setCurrentLesson(lIdx);
          }}
        />
      </div>
    </div>
  );
}
