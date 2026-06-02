import { CheckCircle } from 'lucide-react';
import { type ApiLesson, KIND_META, inferKind } from './lessonKind';

export interface SidebarUnit {
  id: string;
  title: string;
  lessons: ApiLesson[];
}

interface LearnSidebarProps {
  units: SidebarUnit[];
  currentUnit: number;
  currentLesson: number;
  completedKeys: string[];
  totalLessons: number;
  completedCount: number;
  onSelect: (unitIdx: number, lessonIdx: number) => void;
}

function lessonKey(lesson: ApiLesson, unitIndex: number, lessonIndex: number) {
  return lesson.id || `${unitIndex}-${lessonIndex}`;
}

function isLessonDone(completedKeys: string[], lesson: ApiLesson, unitIndex: number, lessonIndex: number) {
  return completedKeys.includes(lessonKey(lesson, unitIndex, lessonIndex)) || completedKeys.includes(`${unitIndex}-${lessonIndex}`);
}

export function LearnSidebar({
  units,
  currentUnit,
  currentLesson,
  completedKeys,
  totalLessons,
  completedCount,
  onSelect,
}: LearnSidebarProps) {
  return (
    <aside className="hidden xl:flex w-80 flex-col bg-slate-950/95 border-l border-slate-800/80 overflow-y-auto flex-shrink-0">
      <div className="px-5 py-4 border-b border-slate-800 sticky top-0 bg-slate-950/95 backdrop-blur z-10">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Course</p>
        <h3 className="font-semibold text-white text-sm mt-0.5">Content outline</h3>
        <p className="text-[11px] text-slate-500 mt-0.5">{completedCount} of {totalLessons} lessons done</p>
      </div>
      {units.map((unit, uIdx) => (
        <section key={unit.id ?? uIdx}>
          <header className="px-5 pt-4 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Unit {uIdx + 1}
            </p>
            <p className="font-medium text-sm text-slate-100 truncate">{unit.title}</p>
          </header>
          <ul className="px-2 pb-2 space-y-0.5">
            {unit.lessons.map((lesson, lIdx) => {
              const done = isLessonDone(completedKeys, lesson, uIdx, lIdx);
              const active = currentUnit === uIdx && currentLesson === lIdx;
              const kind = inferKind(lesson);
              const meta = KIND_META[kind];
              const Icon = meta.Icon;
              return (
                <li key={lesson.id ?? lIdx}>
                  <button
                    onClick={() => onSelect(uIdx, lIdx)}
                    aria-current={active ? 'true' : undefined}
                    className={[
                      'group w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all',
                      active
                        ? 'bg-indigo-500/15 ring-1 ring-inset ring-indigo-500/30'
                        : 'hover:bg-slate-800/60',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0 transition-colors',
                        done
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : active
                            ? `${meta.bgTint} ${meta.color}`
                            : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700',
                      ].join(' ')}
                    >
                      {done ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block truncate ${active ? 'text-white font-medium' : done ? 'text-slate-400' : 'text-slate-200'}`}>
                        {lesson.title || `Lesson ${lIdx + 1}`}
                      </span>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
                        {meta.label}
                        {typeof lesson.duration_min === 'number' && lesson.duration_min > 0 && (
                          <> · {lesson.duration_min} min</>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </aside>
  );
}
