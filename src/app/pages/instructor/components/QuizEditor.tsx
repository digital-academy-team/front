import { UseInstructorCourseDetailResult } from '@/app/hooks/useInstructorCourseDetail';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';

type QuizEditorProps = Pick<
  UseInstructorCourseDetailResult,
  | 'quizUnitId'
  | 'quizUnitOptions'
  | 'filteredQuizLessonOptions'
  | 'quizLessonId'
  | 'quizForm'
  | 'isCreatingQuiz'
  | 'setQuizUnitId'
  | 'setQuizLessonId'
  | 'setQuizForm'
  | 'updateQuizQuestion'
  | 'addQuizQuestion'
  | 'updateQuizVariantText'
  | 'setQuizCorrectVariant'
  | 'addQuizVariant'
  | 'handleCreateQuizzes'
  | 'cancelCreateQuiz'
>;

export function QuizEditor({
  quizUnitId,
  quizUnitOptions,
  filteredQuizLessonOptions,
  quizLessonId,
  quizForm,
  isCreatingQuiz,
  setQuizUnitId,
  setQuizLessonId,
  setQuizForm,
  updateQuizQuestion,
  addQuizQuestion,
  updateQuizVariantText,
  setQuizCorrectVariant,
  addQuizVariant,
  handleCreateQuizzes,
  cancelCreateQuiz,
}: QuizEditorProps) {
  const selectClass =
    'w-full h-10 rounded-lg border border-slate-200 bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm p-5 space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
          Quiz
        </p>
        <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">Create a quiz</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Unit</label>
          <select
            className={selectClass}
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
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Lesson</label>
          <select
            className={selectClass}
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
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Quiz title</label>
        <Input
          placeholder="e.g. Module 1 knowledge check"
          value={quizForm.title}
          onChange={e => setQuizForm(prev => ({ ...prev, title: e.target.value }))}
          className="bg-white dark:bg-slate-900"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
        <Textarea
          placeholder="What does this quiz cover?"
          value={quizForm.description}
          onChange={e => setQuizForm(prev => ({ ...prev, description: e.target.value }))}
          className="bg-white dark:bg-slate-900"
        />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 space-y-2">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            checked={Number(quizForm.time_limit_min ?? 0) > 0}
            onChange={e =>
              setQuizForm(prev => ({
                ...prev,
                time_limit_min: e.target.checked ? 10 : 0,
                show_timer: e.target.checked ? prev.show_timer : true,
              }))
            }
          />
          Add a quiz timer
        </label>
        {Number(quizForm.time_limit_min ?? 0) > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Time limit (minutes)
              </label>
              <Input
                type="number"
                min="1"
                value={quizForm.time_limit_min}
                onChange={e =>
                  setQuizForm(prev => ({
                    ...prev,
                    time_limit_min: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                className="bg-white dark:bg-slate-900"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 self-end pb-2">
              Auto-submits at 0.
            </p>
          </div>
        )}
      </div>

      {quizForm.questions.map((question, questionIndex) => (
        <div key={questionIndex} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
            Question {questionIndex + 1}
          </p>
          <Input
            placeholder="Question text"
            value={question.question_text}
            onChange={e => updateQuizQuestion(questionIndex, 'question_text', e.target.value)}
            className="bg-white dark:bg-slate-900"
          />
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Points for this question
            </label>
            <Input
              type="number"
              min="1"
              value={question.points}
              onChange={e => updateQuizQuestion(questionIndex, 'points', Number(e.target.value))}
              className="bg-white dark:bg-slate-900"
            />
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Used to calculate the quiz score when questions have different weight.
            </p>
          </div>

          {question.variants.map((variant, variantIndex) => (
            <div key={variantIndex} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-center">
              <Input
                placeholder={`Option ${variantIndex + 1}`}
                value={variant.text}
                onChange={e => updateQuizVariantText(questionIndex, variantIndex, e.target.value)}
                className="bg-white dark:bg-slate-900"
              />
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name={`course-quiz-correct-${questionIndex}`}
                  className="w-4 h-4 border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
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
            size="sm"
            onClick={() => addQuizVariant(questionIndex)}
          >
            Add option
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
        <Button type="button" variant="outline" onClick={addQuizQuestion} className="mr-auto">
          Add question
        </Button>
        <Button type="button" variant="outline" onClick={cancelCreateQuiz}>
          Cancel
        </Button>
        <Button
          type="button"
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
          disabled={isCreatingQuiz}
          onClick={handleCreateQuizzes}
        >
          {isCreatingQuiz ? 'Creating…' : 'Create quiz'}
        </Button>
      </div>
    </div>
  );
}
