// Lesson-kind shared types + helpers.
// Used by Learn page renderers, Sidebar, and Instructor LessonEditor.

import { BookOpen, ClipboardList, FileText, FlaskConical, MessageCircle, Paperclip, PencilLine, PlayCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const LESSON_KINDS = [
  'VIDEO',
  'ARTICLE',
  'CHEATSHEET',
  'EXERCISE',
  'QUIZ',
  'ASSIGNMENT',
  'RESOURCE',
  'DISCUSSION',
] as const;

export type LessonKind = (typeof LESSON_KINDS)[number];

// Each hint has its own point-deduction percentage. Backend accepts plain
// strings too for backwards compatibility; the frontend normalises both shapes
// via `normalizeHints()` below.
export interface LessonExerciseHint {
  text: string;
  penalty_percent: number;
}

export interface LessonExercise {
  language: string;          // e.g. "python", "javascript", "sql"
  starter_code: string;
  /**
   * Solution body is intentionally NOT included in the normal student lesson
   * payload — the backend strips it in `StudentLessonsSerializer` and returns
   * it via `POST /api/users/exercise/<lesson_id>/solution/`. `has_solution`
   * tells the renderer whether the "Reveal solution" button should show.
   */
  solution?: string | null;
  has_solution?: boolean | null;
  /** Legacy default; per-hint values win. New code should ignore this. */
  hint_penalty_percent?: number;
  hints?: Array<LessonExerciseHint | string> | null;
}

export const DEFAULT_HINT_PENALTY_PERCENT = 5;

export function normalizeHints(
  hints: LessonExercise['hints'] | undefined,
  fallback = DEFAULT_HINT_PENALTY_PERCENT,
): LessonExerciseHint[] {
  if (!Array.isArray(hints)) return [];
  const out: LessonExerciseHint[] = [];
  for (const raw of hints) {
    if (typeof raw === 'string') {
      const text = raw.trim();
      if (text) out.push({ text, penalty_percent: fallback });
    } else if (raw && typeof raw === 'object') {
      const text = String(raw.text ?? '').trim();
      if (!text) continue;
      const penalty = Math.max(0, Math.min(100, Number(raw.penalty_percent ?? fallback) || 0));
      out.push({ text, penalty_percent: penalty });
    }
  }
  return out;
}

export interface LessonAttachment {
  id?: string;
  label: string;
  url: string;
}

// Shape returned by backend (forward-compatible).
// All new fields optional so old payloads still parse.
export interface ApiLesson {
  id: string;
  title: string;
  kind?: LessonKind | null;
  desc?: string | null;
  content_md?: string | null;
  duration_min?: number | null;
  video?: string | null;
  captions?: string | null;
  presentation?: string | null;
  additional_task?: string | null;
  external_url?: string | null;
  assignment_instructions?: string | null;
  assignment_due_at?: string | null;
  allow_multiple_files?: boolean | null;
  exercise?: LessonExercise | null;
  attachments?: LessonAttachment[] | null;
  quizzes?: Array<{
    id: string;
    lesson: string;
    title: string;
    description: string;
    time_limit_min?: number | null;
    show_timer?: boolean | null;
    is_finished?: boolean;
    due_at?: string | null;
    questions?: Array<{
      id: string;
      question_text: string;
      points: number;
      variants: Array<{ id: string; text: string; is_correct: boolean }>;
    }>;
  }> | null;
}

// Back-compat infer: when `kind` missing, deduce from existing data.
export function inferKind(lesson: ApiLesson): LessonKind {
  if (lesson.kind && LESSON_KINDS.includes(lesson.kind)) return lesson.kind;
  if (lesson.video) return 'VIDEO';
  if (lesson.exercise) return 'EXERCISE';
  if ((lesson.quizzes?.length ?? 0) > 0 && !lesson.video && !lesson.content_md) return 'QUIZ';
  if (lesson.assignment_instructions) return 'ASSIGNMENT';
  if (lesson.external_url) return 'RESOURCE';
  if (lesson.presentation && !lesson.content_md) return 'CHEATSHEET';
  return 'ARTICLE';
}

export interface KindMeta {
  label: string;
  Icon: LucideIcon;
  color: string;          // tailwind text class
  bgTint: string;         // tailwind bg class
  description: string;
}

// Accent palette is anchored on indigo/violet (the brand) and shifts hue
// per kind so the eye can instantly tell them apart in the sidebar / picker.
// `color` is for icons + labels; `bgTint` is a soft chip background that
// works on BOTH the light tutor surface and the dark student surface.
export const KIND_META: Record<LessonKind, KindMeta> = {
  VIDEO: {
    label: 'Video',
    Icon: PlayCircle,
    color: 'text-violet-600 dark:text-violet-300',
    bgTint: 'bg-violet-500/10 ring-1 ring-inset ring-violet-500/30',
    description: 'Watch a recorded lecture',
  },
  ARTICLE: {
    label: 'Reading',
    Icon: BookOpen,
    color: 'text-sky-600 dark:text-sky-300',
    bgTint: 'bg-sky-500/10 ring-1 ring-inset ring-sky-500/30',
    description: 'Read a written lesson',
  },
  CHEATSHEET: {
    label: 'Cheatsheet',
    Icon: FileText,
    color: 'text-amber-600 dark:text-amber-300',
    bgTint: 'bg-amber-500/10 ring-1 ring-inset ring-amber-500/30',
    description: 'Quick-reference summary',
  },
  EXERCISE: {
    label: 'Exercise',
    Icon: FlaskConical,
    color: 'text-emerald-600 dark:text-emerald-300',
    bgTint: 'bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/30',
    description: 'Hands-on practice with code or steps',
  },
  QUIZ: {
    label: 'Quiz',
    Icon: ClipboardList,
    color: 'text-pink-600 dark:text-pink-300',
    bgTint: 'bg-pink-500/10 ring-1 ring-inset ring-pink-500/30',
    description: 'Multiple-choice test',
  },
  ASSIGNMENT: {
    label: 'Assignment',
    Icon: PencilLine,
    color: 'text-orange-600 dark:text-orange-300',
    bgTint: 'bg-orange-500/10 ring-1 ring-inset ring-orange-500/30',
    description: 'Long-form deliverable to submit',
  },
  RESOURCE: {
    label: 'Resource',
    Icon: Paperclip,
    color: 'text-cyan-600 dark:text-cyan-300',
    bgTint: 'bg-cyan-500/10 ring-1 ring-inset ring-cyan-500/30',
    description: 'External link or downloadable file',
  },
  DISCUSSION: {
    label: 'Discussion',
    Icon: MessageCircle,
    color: 'text-indigo-600 dark:text-indigo-300',
    bgTint: 'bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/30',
    description: 'Prompt for a peer or self reflection',
  },
};

// Kinds that allow attaching an optional quiz alongside main content.
export const KINDS_QUIZ_ATTACHABLE: LessonKind[] = ['VIDEO', 'ARTICLE', 'CHEATSHEET', 'EXERCISE'];

export function kindAllowsQuizAttach(kind: LessonKind): boolean {
  return KINDS_QUIZ_ATTACHABLE.includes(kind);
}
