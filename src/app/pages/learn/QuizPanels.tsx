// Quiz panels: idle, taking, results.

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, ClipboardList, Clock, Eye, EyeOff, Lightbulb, Star, Trophy } from 'lucide-react';
import type { QuizSubmitResultResponseExtended } from '@/app/services/api';

export interface UiQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  variantIds?: string[];
}

export interface UiQuiz {
  id: string;
  title: string;
  sectionIndex: number;
  time_limit_min?: number | null;
  show_timer?: boolean | null;
  questions: UiQuizQuestion[];
}

export type QuizSubmitData = QuizSubmitResultResponseExtended['data'];

export function resolveStars(percent: number) {
  if (percent >= 90) return 3;
  if (percent >= 80) return 2;
  if (percent >= 70) return 1;
  return 0;
}

export function resultCopy({
  status,
  attempt,
  percent,
  hasTier,
  coinEarned,
}: {
  status: string;
  attempt: number;
  percent: number;
  hasTier: boolean;
  coinEarned: number;
}): string {
  if (status === 'PASSED' && attempt === 1 && hasTier) {
    return `You earned ${coinEarned} coin${coinEarned === 1 ? '' : 's'}!`;
  }
  if (status === 'PASSED' && attempt === 1 && !hasTier) {
    return 'Great score! Coins unlock once you have a weekly tier — finish more quizzes to climb to Bronze.';
  }
  if (attempt === 1 && percent < 70) {
    return 'No stars this attempt. Pass mark is 70% for stars, 60% for course progress. Try again.';
  }
  if (attempt > 1) {
    return 'Practice mode — coins are first-attempt only, but stars on the leaderboard track your best score per quiz.';
  }
  return '';
}

function StarRow({ filled, total = 3 }: { filled: number; total?: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${filled} out of ${total} stars`} role="img">
      {Array.from({ length: total }, (_, i) => (
        <Star
          key={i}
          className={`w-7 h-7 transition-all duration-400 ${
            i < filled
              ? 'fill-yellow-400 text-yellow-400 scale-100'
              : 'fill-slate-300 dark:fill-slate-700 text-slate-300 dark:text-slate-700 scale-90'
          }`}
          style={{ animationDelay: `${i * 100}ms` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function getQuizLimitSeconds(quiz: UiQuiz) {
  return Math.max(0, Math.round(Number(quiz.time_limit_min ?? 0) * 60));
}

function formatQuizTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function QuizIdle({ quiz, storageKey, onStart }: { quiz: UiQuiz; storageKey: string; onStart: () => void }) {
  const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
  const limitSeconds = getQuizLimitSeconds(quiz);
  const showTimer = limitSeconds > 0;
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 sm:p-10 text-center shadow-xl">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-300 ring-1 ring-inset ring-indigo-500/30 mb-5">
          <ClipboardList className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-white">{quiz.title}</h2>
        <p className="text-slate-400 text-sm mb-6">
          {quiz.questions.length} questions · Multiple choice · Pass with 60%
        </p>
        <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
          {showTimer && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-indigo-300" />
              {formatQuizTime(limitSeconds)} time limit
            </span>
          )}
          {stored && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              stored.passed
                ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/30'
            }`}>
              {stored.passed ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              Best: {stored.score}/{stored.total} ({Math.round((stored.score / stored.total) * 100)}%)
            </span>
          )}
        </div>
        <button
          onClick={onStart}
          className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-xl shadow-sm transition-colors"
        >
          {stored ? 'Retake quiz' : 'Start quiz'}
        </button>
      </div>
    </div>
  );
}

export function QuizTaking({
  quiz,
  selectedAnswers,
  submitted,
  onSelect,
  onSubmit,
}: {
  quiz: UiQuiz;
  selectedAnswers: Record<string, number>;
  submitted: boolean;
  onSelect: (qId: string, optIdx: number) => void;
  onSubmit: () => void;
}) {
  const answered = Object.keys(selectedAnswers).length;
  const total = quiz.questions.length;
  const limitSeconds = getQuizLimitSeconds(quiz);
  const hasTimer = limitSeconds > 0;
  // Student-controlled: the countdown is on by default, but a student who
  // finds a visible timer stressful can hide it (auto-submit still fires).
  const [studentShowTimer, setStudentShowTimer] = useState(true);
  const [remaining, setRemaining] = useState(limitSeconds);

  useEffect(() => {
    setRemaining(limitSeconds);
  }, [quiz.id, limitSeconds]);

  useEffect(() => {
    if (!limitSeconds || submitted) return undefined;
    if (remaining <= 0) {
      onSubmit();
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [limitSeconds, remaining, submitted, onSubmit]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-lg font-bold text-white">{quiz.title}</h2>
        <div className="flex items-center gap-2">
          {hasTimer && studentShowTimer && (
            <span className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full border text-sm font-semibold ${
              remaining <= 30
                ? 'border-red-500/60 bg-red-900/30 text-red-200'
                : 'border-slate-600 bg-slate-800/70 text-slate-200'
            }`}>
              <Clock className="w-4 h-4" />
              {formatQuizTime(remaining)}
              <button
                type="button"
                onClick={() => setStudentShowTimer(false)}
                aria-label="Hide the countdown"
                title="Hide the countdown (it keeps running)"
                className="ml-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-white/10 cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </span>
          )}
          {hasTimer && !studentShowTimer && (
            <button
              type="button"
              onClick={() => setStudentShowTimer(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-600 bg-slate-800/70 text-slate-300 text-xs font-medium hover:text-white hover:border-slate-500 cursor-pointer"
              title="The timer is hidden but still running"
            >
              <Eye className="w-3.5 h-3.5" /> Show timer
            </button>
          )}
          <span className="text-sm text-gray-400">{answered}/{total} answered</span>
        </div>
      </div>
      {quiz.questions.map((q, idx) => {
        const selected = selectedAnswers[q.id];
        return (
          <div key={q.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <p className="font-medium mb-4 text-sm leading-relaxed text-white">
              <span className="text-indigo-300 font-bold mr-2">Q{idx + 1}.</span>
              {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oIdx) => {
                let cls = 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-indigo-400 hover:bg-slate-800 hover:text-white';
                if (submitted) {
                  if (oIdx === q.correctIndex) cls = 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200';
                  else if (selected === oIdx) cls = 'border-red-500/60 bg-red-500/10 text-red-200';
                  else cls = 'border-slate-800 text-slate-500';
                } else if (selected === oIdx) {
                  cls = 'border-indigo-500/60 bg-indigo-500/10 text-indigo-200 ring-1 ring-inset ring-indigo-500/30';
                }
                return (
                  <button
                    key={oIdx}
                    onClick={() => onSelect(q.id, oIdx)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${cls} ${
                      submitted ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    <span className="font-bold mr-2 opacity-70">{String.fromCharCode(65 + oIdx)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
            {submitted && q.explanation && (
              <div className="mt-3 text-xs text-slate-300 bg-slate-800/80 border border-slate-700 rounded-lg p-3 flex gap-2">
                <Lightbulb className="w-4 h-4 flex-shrink-0 text-amber-300 mt-0.5" />
                <span><strong className="text-white">Explanation:</strong> {q.explanation}</span>
              </div>
            )}
          </div>
        );
      })}
      {!submitted && (
        <button
          onClick={onSubmit}
          disabled={answered < total}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors shadow-sm"
        >
          {answered < total ? `Answer all questions (${answered}/${total})` : 'Submit quiz'}
        </button>
      )}
    </div>
  );
}

export function QuizResults({
  quiz,
  selectedAnswers,
  submitData,
  hasTier,
  onRetake,
  onContinue,
}: {
  quiz: UiQuiz;
  selectedAnswers: Record<string, number>;
  submitData: QuizSubmitData | null;
  hasTier: boolean;
  onRetake: () => void;
  onContinue: () => void;
}) {
  const localCorrect = quiz.questions.filter(q => selectedAnswers[q.id] === q.correctIndex).length;
  const localTotal = quiz.questions.length;

  const correct = submitData?.correct_answers ?? localCorrect;
  const total = submitData?.total_questions ?? localTotal;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const status = submitData?.status ?? (pct >= 60 ? 'PASSED' : 'FAILED');
  const passed = status === 'PASSED';
  const stars = submitData?.stars ?? 0;
  const attempt = submitData?.attempt ?? 1;
  const coinEarned = submitData?.coin_earned ?? 0;
  const totalPoints = submitData?.total ?? '';

  const copy = resultCopy({ status, attempt, percent: pct, hasTier, coinEarned });

  return (
    <div className="max-w-2xl mx-auto" role="status" aria-live="polite">
      <div className={`rounded-xl p-8 text-center mb-4 ${
        passed
          ? 'bg-green-900/30 border border-green-700'
          : 'bg-amber-900/30 border border-amber-700'
      }`}>
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide mb-4 ${
          passed ? 'bg-green-800/60 text-green-300' : 'bg-amber-800/60 text-amber-300'
        }`}>
          <Trophy className="w-4 h-4" />
          {passed ? 'Passed' : 'Failed'}
        </div>

        <h2 className="text-2xl font-bold mb-1 text-white">{quiz.title}</h2>
        <div className="text-5xl font-black mb-1 mt-3" style={{ color: passed ? '#4ade80' : '#fbbf24' }}>
          {pct}%
        </div>
        <p className="text-gray-400 text-sm mb-4">{correct} out of {total} correct</p>
        <div className="flex justify-center mb-4"><StarRow filled={stars} /></div>

        <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-700/70 text-slate-300 text-xs font-medium border border-slate-600">
            Attempt #{attempt}
          </span>
          {coinEarned > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-800/50 text-yellow-300 text-xs font-semibold border border-yellow-700">
              +{coinEarned} coin{coinEarned === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {copy && (
          <p className="text-sm text-slate-300 max-w-sm mx-auto mb-3 leading-relaxed">{copy}</p>
        )}
        {totalPoints && <p className="text-xs text-gray-500 mt-1">Points: {totalPoints}</p>}
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={onRetake}
          className="px-6 py-3 border border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800/60 rounded-xl font-medium transition-colors"
        >
          Retake quiz
        </button>
        <button
          onClick={onContinue}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-sm"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

interface RawApiQuiz {
  id: string;
  title: string;
  time_limit_min?: number | null;
  show_timer?: boolean | null;
  questions?: Array<{
    id: string;
    question_text: string;
    variants?: Array<{ id: string; text: string; is_correct: boolean }>;
  }>;
}

export function mapApiQuizToUi(
  quiz: RawApiQuiz | null | undefined,
  sectionIndex: number
): UiQuiz | null {
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) return null;
  const questions: UiQuizQuestion[] = [];
  for (const question of quiz.questions) {
    const variants = Array.isArray(question.variants) ? question.variants : [];
    const correctIndex = variants.findIndex((variant) => variant.is_correct);
    if (variants.length === 0 || correctIndex < 0) continue;
    questions.push({
      id: question.id,
      question: question.question_text,
      options: variants.map((variant) => variant.text),
      variantIds: variants.map((variant) => variant.id),
      correctIndex,
    });
  }
  if (questions.length === 0) return null;
  return {
    id: quiz.id,
    title: quiz.title,
    sectionIndex,
    time_limit_min: quiz.time_limit_min ?? 0,
    show_timer: quiz.show_timer ?? true,
    questions,
  };
}
