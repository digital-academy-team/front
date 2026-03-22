import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { courses } from '@/app/data/courses';
import { courseQuizzes, type SectionQuiz } from '@/app/data/quizzes';
import { Button } from '@/app/components/ui/button';
import { courseApi, resolveCourseId, type MyCourseDetailResponse } from '@/app/services/api';
import { ArrowLeft, CheckCircle, PlayCircle, Trophy, FileText, ClipboardList, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface LectureProgress {
  completedLectures: string[];
}

interface UiQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  variantIds?: string[];
}

interface UiQuiz {
  id: string;
  title: string;
  sectionIndex: number;
  questions: UiQuizQuestion[];
}

function mapApiQuizToUi(
  quiz: MyCourseDetailResponse['data']['course']['units'][number]['lessons'][number]['quizzes'][number] | undefined,
  sectionIndex: number
): UiQuiz | null {
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) return null;

  const questions: UiQuizQuestion[] = quiz.questions
    .map((question) => {
      const variants = Array.isArray(question.variants) ? question.variants : [];
      const correctIndex = variants.findIndex((variant) => variant.is_correct);
      if (variants.length === 0 || correctIndex < 0) return null;

      return {
        id: question.id,
        question: question.question_text,
        options: variants.map((variant) => variant.text),
        variantIds: variants.map((variant) => variant.id),
        correctIndex,
      };
    })
    .filter((question): question is UiQuizQuestion => question !== null);

  if (questions.length === 0) return null;

  return {
    id: quiz.id,
    title: quiz.title,
    sectionIndex,
    questions,
  };
}

function QuizIdle({ quiz, storageKey, onStart }: { quiz: UiQuiz; storageKey: string; onStart: () => void }) {
  const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-slate-800/70 border border-slate-600 rounded-2xl p-8 text-center shadow-xl">
        <div className="text-5xl mb-4">📝</div>
        <h2 className="text-2xl font-bold mb-2">{quiz.title}</h2>
        <p className="text-gray-400 mb-6">{quiz.questions.length} questions · Multiple choice · Pass with 60%</p>
        {stored && (
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 ${stored.passed ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
            {stored.passed ? '✅' : '⚠️'} Best score: {stored.score}/{stored.total} ({Math.round((stored.score / stored.total) * 100)}%)
          </div>
        )}
        <button onClick={onStart} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors">
          {stored ? 'Retake Quiz' : 'Start Quiz'}
        </button>
      </div>
    </div>
  );
}

function QuizTaking({ quiz, selectedAnswers, submitted, onSelect, onSubmit }: {
  quiz: UiQuiz; selectedAnswers: Record<string, number>; submitted: boolean;
  onSelect: (qId: string, optIdx: number) => void; onSubmit: () => void;
}) {
  const answered = Object.keys(selectedAnswers).length;
  const total = quiz.questions.length;
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">{quiz.title}</h2>
        <span className="text-sm text-gray-400">{answered}/{total} answered</span>
      </div>
      {quiz.questions.map((q, idx) => {
        const selected = selectedAnswers[q.id];
        return (
          <div key={q.id} className="bg-slate-800/70 border border-slate-600 rounded-2xl p-5">
            <p className="font-medium mb-4 text-sm leading-relaxed">
              <span className="text-purple-400 font-bold mr-2">Q{idx + 1}.</span>{q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oIdx) => {
                let cls = 'border border-gray-600 text-gray-300 hover:border-purple-400 hover:text-white';
                if (submitted) {
                  if (oIdx === q.correctIndex) cls = 'border-green-500 bg-green-900/30 text-green-300';
                  else if (selected === oIdx) cls = 'border-red-500 bg-red-900/30 text-red-300';
                  else cls = 'border-gray-700 text-gray-500';
                } else if (selected === oIdx) {
                  cls = 'border-purple-500 bg-purple-900/30 text-purple-300';
                }
                return (
                  <button key={oIdx} onClick={() => onSelect(q.id, oIdx)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${cls} ${submitted ? 'cursor-default' : 'cursor-pointer'}`}>
                    <span className="font-bold mr-2">{String.fromCharCode(65 + oIdx)}.</span>{opt}
                  </button>
                );
              })}
            </div>
            {submitted && (
              <p className="mt-3 text-xs text-gray-400 bg-gray-800 rounded p-2">
                💡 <strong>Explanation:</strong> {q.explanation}
              </p>
            )}
          </div>
        );
      })}
      {!submitted && (
        <button onClick={onSubmit} disabled={answered < total}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors">
          {answered < total ? `Answer all questions (${answered}/${total})` : 'Submit Quiz'}
        </button>
      )}
    </div>
  );
}

function QuizResults({ quiz, selectedAnswers, courseId, sectionIdx, onRetake, onContinue }: {
  quiz: UiQuiz; selectedAnswers: Record<string, number>; courseId: string; sectionIdx: number;
  onRetake: () => void; onContinue: () => void;
}) {
  const correct = quiz.questions.filter(q => selectedAnswers[q.id] === q.correctIndex).length;
  const total = quiz.questions.length;
  const pct = Math.round((correct / total) * 100);
  const passed = pct >= 60;
  return (
    <div className="max-w-2xl mx-auto">
      <div className={`rounded-xl p-8 text-center mb-6 ${passed ? 'bg-green-900/30 border border-green-700' : 'bg-yellow-900/30 border border-yellow-700'}`}>
        <div className="text-5xl mb-3">{passed ? '🎉' : '📚'}</div>
        <h2 className="text-2xl font-bold mb-1">{passed ? 'Quiz Passed!' : 'Keep Studying!'}</h2>
        <p className="text-gray-400 mb-4">{quiz.title}</p>
        <div className="text-5xl font-black mb-2" style={{ color: passed ? '#4ade80' : '#facc15' }}>{pct}%</div>
        <p className="text-gray-400 text-sm">{correct} out of {total} correct</p>
        <p className="text-xs text-gray-500 mt-1">{passed ? 'Minimum 60% to pass' : 'You need 60% to pass — review the material and try again'}</p>
      </div>
      <div className="flex gap-3 justify-center">
        <button onClick={onRetake} className="px-6 py-3 border border-gray-600 text-gray-300 hover:border-white hover:text-white rounded-lg font-medium transition-colors">
          Retake Quiz
        </button>
        <button onClick={onContinue} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
          Continue Learning →
        </button>
      </div>
    </div>
  );
}

export default function Learn() {
  const { courseId: learningId } = useParams<{ courseId: string }>();
  const [myCourseDetail, setMyCourseDetail] = useState<MyCourseDetailResponse['data'] | null>(null);
  const [loadingMyCourse, setLoadingMyCourse] = useState(true);
  const [resolvedEnrollmentId, setResolvedEnrollmentId] = useState<string | null>(null);
  const cachedCourses = (() => {
    try {
      const raw = localStorage.getItem('da_public_courses_cache');
      if (!raw) return [] as typeof courses;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [] as typeof courses;
    }
  })();
  const enrollmentId = myCourseDetail?.id ?? resolvedEnrollmentId ?? learningId;
  const fallbackCourse = cachedCourses.find(c => c.id === learningId || c.slug === learningId) ?? courses.find(c => c.id === learningId);
  const resolvedCourseId = myCourseDetail?.course?.id ?? fallbackCourse?.id ?? learningId;
  const resolvedCourse = cachedCourses.find(c => c.id === resolvedCourseId || c.slug === resolvedCourseId) ?? courses.find(c => c.id === resolvedCourseId);
  const sections = myCourseDetail
    ? myCourseDetail.course.units.map((unit) => ({
        section: unit.title,
        lectures: unit.lessons.length,
        duration: '--',
      }))
    : (resolvedCourse?.curriculum ?? []);
  const courseTitle = resolvedCourse?.title ?? 'My Course';
  const [currentSection, setCurrentSection] = useState(0);
  const [currentLecture, setCurrentLecture] = useState(0);
  const currentLesson = myCourseDetail?.course.units?.[currentSection]?.lessons?.[currentLecture];
  const [progress, setProgress] = useState<LectureProgress>(() => {
    try {
      const stored = localStorage.getItem(`progress_${resolvedCourseId}`);
      return stored ? JSON.parse(stored) : { completedLectures: [] };
    } catch { return { completedLectures: [] }; }
  });

  const [activeView, setActiveView] = useState<'video' | 'quiz'>('video');
  const [quizState, setQuizState] = useState<'idle' | 'taking' | 'results'>('idle');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

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
          const matchedCourse = (myCourses.data ?? []).find((item) =>
            item.id === learningId || resolveCourseId(item.course) === learningId
          );

          if (matchedCourse?.id) {
            setResolvedEnrollmentId(matchedCourse.id);
            res = await courseApi.myEnrolledCourseDetail(matchedCourse.id);
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
    localStorage.setItem(`progress_${resolvedCourseId}`, JSON.stringify(progress));
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
          setProgress({ completedLectures: payload.completed_lectures });
          return;
        }

        const percent = Number(payload?.progress ?? 0);
        if (!Number.isFinite(percent) || percent <= 0 || sections.length === 0) return;

        const total = sections.reduce((sum, s) => sum + s.lectures, 0);
        const estimatedCompleted = Math.min(total, Math.max(0, Math.round((percent / 100) * total)));

        const estimatedKeys: string[] = [];
        for (let sIdx = 0; sIdx < sections.length; sIdx += 1) {
          for (let lIdx = 0; lIdx < sections[sIdx].lectures; lIdx += 1) {
            if (estimatedKeys.length >= estimatedCompleted) break;
            estimatedKeys.push(`${sIdx}-${lIdx}`);
          }
          if (estimatedKeys.length >= estimatedCompleted) break;
        }

        setProgress({ completedLectures: estimatedKeys });
      } catch {
        // Keep local progress when server progress is unavailable.
      }
    };

    loadServerProgress();
  }, [enrollmentId, resolvedCourseId, sections]);

  useEffect(() => {
    if (!sections.length) return;
    if (currentSection >= sections.length) {
      setCurrentSection(0);
      setCurrentLecture(0);
      return;
    }
    if (currentLecture >= sections[currentSection].lectures) {
      setCurrentLecture(0);
    }
  }, [sections, currentSection, currentLecture]);

  if (loadingMyCourse) return <div className="p-8 text-center">Loading course...</div>;
  if (!sections.length) return <div className="p-8 text-center">Course not found</div>;

  const totalLectures = sections.reduce((sum, s) => sum + s.lectures, 0);
  const completedCount = progress.completedLectures.length;
  const completionPercent = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

  const lectureKey = `${currentSection}-${currentLecture}`;
  const isCompleted = progress.completedLectures.includes(lectureKey);

  const markCompleteFromQuiz = () => {
    if (!isCompleted) {
      const nextCompletedLectures = [...progress.completedLectures, lectureKey];
      setProgress({ completedLectures: nextCompletedLectures });

      const total = sections.reduce((sum, s) => sum + s.lectures, 0);
      const percent = total > 0 ? Math.round((nextCompletedLectures.length / total) * 100) : 0;
      const status = percent >= 100 ? 'COMPLETED' : 'IN_PROGRESS';

      courseApi.updateProgress({
        enrollmentId: enrollmentId ?? undefined,
        courseId: resolvedCourseId ?? undefined,
        data: {
          progress: percent,
          status,
          completed_lectures: nextCompletedLectures,
        },
      }).catch(() => {
        toast.error('Progress could not be saved to the server. Your local progress was kept.');
      });

      toast.success('Lesson completed!');
    }
  };

  const apiQuiz = mapApiQuizToUi(currentLesson?.quizzes?.[0], currentSection);
  const fallbackQuiz = courseQuizzes[resolvedCourseId ?? '']?.[currentSection] as SectionQuiz | undefined;
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

  const quizStorageKey = `quiz_${resolvedCourseId}_${currentSection}_${currentLecture}`;

  const bestScore = sectionQuiz
    ? JSON.parse(localStorage.getItem(quizStorageKey) ?? 'null')
    : null;

  return (
    <div className="h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col overflow-hidden">
      {/* Top header bar */}
      <div className="bg-slate-900/90 backdrop-blur px-4 py-3 flex items-center gap-4 border-b border-slate-700 flex-shrink-0">
        <Link to={resolvedCourseId ? `/course/${resolvedCourseId}` : '/courses'}>
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate text-sm">{courseTitle}</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300 flex-shrink-0">
          <div className="w-24 bg-slate-700 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${completionPercent}%` }} />
          </div>
          <span>{completionPercent}% complete</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Tab bar */}
          <div className="flex border-b border-slate-700 bg-slate-900/70 flex-shrink-0 px-2 sm:px-4">
            <button onClick={() => { setActiveView('video'); setQuizState('idle'); }}
              className={`px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeView === 'video' ? 'border-purple-400 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
              📹 Video Lecture
            </button>
            <button onClick={() => setActiveView('quiz')}
              className={`px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeView === 'quiz' ? 'border-purple-400 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
              📝 Section Quiz
              {bestScore?.passed && (
                <span className="ml-2 text-xs bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded-full">
                  {Math.round((bestScore.score / bestScore.total) * 100)}%
                </span>
              )}
            </button>
          </div>

          {/* Video view */}
          {activeView === 'video' && (
            <>
              <div className="bg-black flex items-center justify-center flex-shrink-0" style={{ height: '60%' }}>
                {currentLesson?.video ? (
                  <video
                    key={currentLesson.video}
                    src={currentLesson.video}
                    controls
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <div className="text-center">
                    <PlayCircle className="w-20 h-20 text-purple-400 mx-auto mb-4" />
                    <p className="text-gray-400">
                      {sections[currentSection]?.section} — Lecture {currentLecture + 1}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">No video available</p>
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-900/70 overflow-y-auto flex-1 min-h-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
                        <div className="flex items-center gap-2 mb-2 text-slate-300">
                          <FileText className="w-4 h-4 text-purple-300" />
                          <span className="text-xs uppercase tracking-wider">Lesson Title</span>
                        </div>
                        <h2 className="text-lg font-semibold leading-snug text-white break-words">
                          {currentLesson?.title ?? `Lecture ${currentLecture + 1}`}
                        </h2>
                        <p className="text-xs text-slate-400 mt-2">
                          {sections[currentSection]?.section} • {currentLecture + 1} / {sections[currentSection]?.lectures}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
                        <div className="flex items-center gap-2 mb-2 text-slate-300">
                          <ClipboardList className="w-4 h-4 text-emerald-300" />
                          <span className="text-xs uppercase tracking-wider">Additional Task</span>
                        </div>
                        <p className="text-sm text-slate-100 leading-relaxed break-words min-h-12">
                          {currentLesson?.additional_task?.trim() || 'No additional task provided for this lesson.'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-800/80 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-400">Presentation</p>
                        <p className="text-sm text-slate-200 mt-1">
                          {currentLesson?.presentation ? 'Presentation file available' : 'No presentation available'}
                        </p>
                      </div>
                      {currentLesson?.presentation ? (
                        <a
                          href={currentLesson.presentation}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-medium transition-colors"
                        >
                          Open Presentation
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center px-3 py-2 rounded-xl bg-slate-700 text-slate-300 text-sm">
                          No File
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border ${isCompleted ? 'bg-emerald-900/50 border-emerald-700 text-emerald-300' : 'bg-slate-800 border-slate-600 text-slate-300'}`}>
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
                    {isCompleted ? 'Completed' : 'Complete by passing quiz'}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Quiz view */}
          {activeView === 'quiz' && (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-900/70 min-h-0">
              {!sectionQuiz ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-4">📝</p>
                  <p className="text-lg">No quiz is available for this lesson.</p>
                </div>
              ) : quizState === 'idle' ? (
                <QuizIdle quiz={sectionQuiz} storageKey={quizStorageKey} onStart={() => { setQuizState('taking'); setSelectedAnswers({}); setQuizSubmitted(false); }} />
              ) : quizState === 'taking' ? (
                <QuizTaking quiz={sectionQuiz} selectedAnswers={selectedAnswers} submitted={quizSubmitted}
                  onSelect={(qId, optIdx) => !quizSubmitted && setSelectedAnswers(prev => ({ ...prev, [qId]: optIdx }))}
                  onSubmit={async () => {
                    setQuizSubmitted(true);

                    let serverCorrectAnswers: number | null = null;
                    let serverPassed: boolean | null = null;

                    if (!sectionQuiz.id.startsWith('fallback-')) {
                      try {
                        const answers = sectionQuiz.questions
                          .map((question) => {
                            const selectedIndex = selectedAnswers[question.id];
                            const variantId =
                              typeof selectedIndex === 'number' ? question.variantIds?.[selectedIndex] : undefined;

                            if (!variantId) return null;
                            return {
                              question: question.id,
                              variant: variantId,
                            };
                          })
                          .filter((item): item is { question: string; variant: string } => item !== null);

                        const quizResponse = await courseApi.submitUserQuiz(sectionQuiz.id, { answers });
                        serverCorrectAnswers = Number(quizResponse?.data?.correct_answers);
                        if (!Number.isFinite(serverCorrectAnswers)) {
                          serverCorrectAnswers = null;
                        }
                        serverPassed = quizResponse?.data?.status === 'PASSED';
                        console.log('Quiz submit response:', quizResponse);
                      } catch (error) {
                        console.error('Quiz submit failed:', error);
                        toast.error('Quiz results could not be submitted to the server.');
                      }
                    }

                    const correct = sectionQuiz.questions.filter(q => selectedAnswers[q.id] === q.correctIndex).length;
                    const total = sectionQuiz.questions.length;
                    const finalCorrect = typeof serverCorrectAnswers === 'number' ? serverCorrectAnswers : correct;
                    const passed = typeof serverPassed === 'boolean' ? serverPassed : (finalCorrect / total >= 0.6);
                    const existing = JSON.parse(localStorage.getItem(quizStorageKey) ?? '{}');
                    if (!existing.passed || finalCorrect > (existing.correct ?? 0)) {
                      localStorage.setItem(quizStorageKey, JSON.stringify({ score: finalCorrect, total, passed, correct: finalCorrect }));
                    }

                    if (passed) {
                      markCompleteFromQuiz();
                      toast.success('Quiz passed! Lesson completed.');
                    }

                    setTimeout(() => setQuizState('results'), 800);
                  }} />
              ) : (
                <QuizResults quiz={sectionQuiz} selectedAnswers={selectedAnswers} courseId={resolvedCourseId!} sectionIdx={currentSection}
                  onRetake={() => { setQuizState('taking'); setSelectedAnswers({}); setQuizSubmitted(false); }}
                  onContinue={() => { setActiveView('video'); setQuizState('idle'); }} />
              )}
            </div>
          )}
        </div>

        {/* Sidebar: course content */}
        <div className="hidden xl:block w-80 bg-slate-900/70 border-l border-slate-700 overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-slate-700 sticky top-0 bg-slate-900/95 backdrop-blur">
            <h3 className="font-semibold">Course Content</h3>
            <p className="text-sm text-slate-400">{completedCount}/{totalLectures} completed</p>
          </div>
          {sections.map((section, sIdx) => (
            <div key={sIdx}>
              <div className="px-4 py-3 bg-slate-950 border-b border-slate-700">
                <p className="font-medium text-sm">{section.section}</p>
                <p className="text-xs text-slate-400">{section.lectures} lectures • {section.duration}</p>
              </div>
              {Array.from({ length: section.lectures }).map((_, lIdx) => {
                const key = `${sIdx}-${lIdx}`;
                const done = progress.completedLectures.includes(key);
                const active = currentSection === sIdx && currentLecture === lIdx;
                return (
                  <button
                    key={lIdx}
                    onClick={() => { setCurrentSection(sIdx); setCurrentLecture(lIdx); setActiveView('video'); setQuizState('idle'); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-800 transition-colors border-b border-slate-700/50 ${active ? 'bg-slate-800 border-l-2 border-purple-400' : ''}`}
                  >
                    {done
                      ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      : <PlayCircle className={`w-4 h-4 flex-shrink-0 ${active ? 'text-purple-400' : 'text-slate-500'}`} />
                    }
                    <span className={`${done ? 'text-slate-400' : ''} truncate`}>Lecture {lIdx + 1}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
