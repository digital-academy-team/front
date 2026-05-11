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
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold dark:text-slate-200">Create Quiz</p>

      <select
        className="w-full h-10 rounded-md border border-input bg-background dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 px-3 py-2 text-sm"
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
        className="w-full h-10 rounded-md border border-input bg-background dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 px-3 py-2 text-sm"
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
        <div key={questionIndex} className="rounded-md border dark:border-slate-700 p-3 bg-white dark:bg-slate-800 space-y-2">
          <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">Question {questionIndex + 1}</p>
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
              <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-slate-300">
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
  );
}
