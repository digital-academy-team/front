import { Fragment, Dispatch, SetStateAction } from 'react';
import { UserCourseItem } from '@/app/services/api';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Skeleton } from '@/app/components/ui/skeleton';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { CourseEditFormState } from '@/app/utils/instructorDashboard';
import { UseInstructorCourseDetailResult } from '@/app/hooks/useInstructorCourseDetail';
import { QuizEditor } from './QuizEditor';
import { BookOpen } from 'lucide-react';

interface InstructorCourseListProps {
  courses: UserCourseItem[];
  loading: boolean;
  editingCourseId: string | null;
  editForm: CourseEditFormState | null;
  isUpdatingCourse: boolean;
  setEditForm: Dispatch<SetStateAction<CourseEditFormState | null>>;
  startEditCourse: (course: UserCourseItem) => void;
  cancelEditCourse: () => void;
  handleUpdateCourse: () => Promise<void>;
  quizDetail: UseInstructorCourseDetailResult;
}

export function InstructorCourseList({
  courses,
  loading,
  editingCourseId,
  editForm,
  isUpdatingCourse,
  setEditForm,
  startEditCourse,
  cancelEditCourse,
  handleUpdateCourse,
  quizDetail,
}: InstructorCourseListProps) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4 dark:text-slate-100">My Courses ({courses.length})</h2>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b">
              <Skeleton className="w-16 h-10 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24 rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && courses.length === 0 && (
        <EmptyState
          icon={<BookOpen className="w-16 h-16" />}
          title="Create your first course."
        />
      )}

      {!loading && courses.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-slate-700">
                <th className="text-left py-3 dark:text-slate-300">Course</th>
                <th className="text-left py-3 dark:text-slate-300">Base Price</th>
                <th className="text-left py-3 dark:text-slate-300">Discount Price</th>
                <th className="text-left py-3 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(course => (
                <Fragment key={course.id}>
                  <tr className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="py-3 font-medium dark:text-slate-100">
                      <div className="flex items-center gap-3">
                        <img
                          src={course.cover_img ?? 'https://placehold.co/120x70?text=No+Image'}
                          alt={course.title}
                          loading="lazy"
                          decoding="async"
                          width={64}
                          height={40}
                          className="w-16 h-10 object-cover rounded border"
                        />
                        <div>
                          <p className="font-medium">{course.title}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1">{course.desc}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 dark:text-slate-300">{Number(course.base_price).toLocaleString()}</td>
                    <td className="py-3 dark:text-slate-300">{Number(course.discount_price).toLocaleString()}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => startEditCourse(course)}>
                          Update
                        </Button>
                        <Button type="button" variant="outline" onClick={() => quizDetail.startCreateQuiz(course.id, courses)}>
                          Create Quiz
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {editingCourseId === course.id && editForm && (
                    <tr className="border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60">
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

                  {quizDetail.quizCourseId === course.id && (
                    <tr className="border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60">
                      <td colSpan={4} className="py-3">
                        <QuizEditor
                          quizUnitId={quizDetail.quizUnitId}
                          quizUnitOptions={quizDetail.quizUnitOptions}
                          filteredQuizLessonOptions={quizDetail.filteredQuizLessonOptions}
                          quizLessonId={quizDetail.quizLessonId}
                          quizForm={quizDetail.quizForm}
                          isCreatingQuiz={quizDetail.isCreatingQuiz}
                          setQuizUnitId={quizDetail.setQuizUnitId}
                          setQuizLessonId={quizDetail.setQuizLessonId}
                          setQuizForm={quizDetail.setQuizForm}
                          updateQuizQuestion={quizDetail.updateQuizQuestion}
                          addQuizQuestion={quizDetail.addQuizQuestion}
                          updateQuizVariantText={quizDetail.updateQuizVariantText}
                          setQuizCorrectVariant={quizDetail.setQuizCorrectVariant}
                          addQuizVariant={quizDetail.addQuizVariant}
                          handleCreateQuizzes={quizDetail.handleCreateQuizzes}
                          cancelCreateQuiz={quizDetail.cancelCreateQuiz}
                        />
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
  );
}
