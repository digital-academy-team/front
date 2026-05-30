import { Fragment, Dispatch, SetStateAction, useState } from 'react';
import { toast } from 'sonner';
import { courseApi, UserCourseItem } from '@/app/services/api';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Skeleton } from '@/app/components/ui/skeleton';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { FileInput } from '@/app/components/ui/FileInput';
import { Label } from '@/app/components/ui/label';
import { CourseEditFormState } from '@/app/utils/instructorDashboard';
import { UseInstructorCourseDetailResult } from '@/app/hooks/useInstructorCourseDetail';
import { LessonManager } from './LessonManager';
import { BookOpen, Trash2, AlertTriangle } from 'lucide-react';

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
  refetch: () => Promise<void>;
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
  refetch,
}: InstructorCourseListProps) {
  const [lessonManagerCourseId, setLessonManagerCourseId] = useState<string | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const startDelete = (id: string) => { setDeletingCourseId(id); setDeleteConfirm(''); };
  const cancelDelete = () => { setDeletingCourseId(null); setDeleteConfirm(''); };

  const handleDeleteCourse = async (course: UserCourseItem) => {
    if (deleteConfirm.trim() !== course.title.trim()) {
      toast.error('Type the exact course name to confirm.');
      return;
    }
    try {
      setDeleting(true);
      await courseApi.remove(course.id);
      toast.success(`“${course.title}” deleted.`);
      cancelDelete();
      await refetch();
    } catch (err) {
      toast.error((err as Error | undefined)?.message ?? 'Course could not be deleted.');
    } finally {
      setDeleting(false);
    }
  };

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
                        <Button type="button" variant="outline" onClick={() => setLessonManagerCourseId(course.id)}>
                          Add/Edit Lessons
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => startDelete(course.id)}
                          className="gap-1.5 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:hover:border-red-500/40"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {editingCourseId === course.id && editForm && (
                    <tr className="border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                      <td colSpan={4} className="p-4">
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm p-5">
                          <div className="mb-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                              Edit course
                            </p>
                            <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                              Update “{course.title}”
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                              <Label htmlFor={`edit-title-${course.id}`} className="text-slate-700 dark:text-slate-300">
                                Course title
                              </Label>
                              <Input
                                id={`edit-title-${course.id}`}
                                value={editForm.title}
                                onChange={e => setEditForm(prev => (prev ? { ...prev, title: e.target.value } : prev))}
                                placeholder="e.g. Modern React from Scratch"
                                className="bg-white dark:bg-slate-900"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor={`edit-base-${course.id}`} className="text-slate-700 dark:text-slate-300">
                                Base price
                              </Label>
                              <Input
                                id={`edit-base-${course.id}`}
                                type="number"
                                min="0"
                                value={editForm.base_price}
                                onChange={e => setEditForm(prev => (prev ? { ...prev, base_price: Number(e.target.value) } : prev))}
                                placeholder="0"
                                className="bg-white dark:bg-slate-900"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor={`edit-discount-${course.id}`} className="text-slate-700 dark:text-slate-300">
                                Discount price
                              </Label>
                              <Input
                                id={`edit-discount-${course.id}`}
                                type="number"
                                min="0"
                                value={editForm.discount_price}
                                onChange={e => setEditForm(prev => (prev ? { ...prev, discount_price: Number(e.target.value) } : prev))}
                                placeholder="0"
                                className="bg-white dark:bg-slate-900"
                              />
                            </div>

                            <div className="md:col-span-2 space-y-1.5">
                              <Label className="text-slate-700 dark:text-slate-300">Cover image</Label>
                              <FileInput
                                variant="image"
                                accept="image/*"
                                value={editForm.cover_img}
                                existingUrl={course.cover_img ?? undefined}
                                existingLabel="Current cover image"
                                label="Course cover image"
                                hint="JPG or PNG · 1280×720 recommended"
                                onChange={file => setEditForm(prev => (prev ? { ...prev, cover_img: file } : prev))}
                              />
                            </div>

                            <div className="md:col-span-2 space-y-1.5">
                              <Label htmlFor={`edit-desc-${course.id}`} className="text-slate-700 dark:text-slate-300">
                                Description
                              </Label>
                              <Textarea
                                id={`edit-desc-${course.id}`}
                                value={editForm.desc}
                                onChange={e => setEditForm(prev => (prev ? { ...prev, desc: e.target.value } : prev))}
                                placeholder="What will students learn in this course?"
                                className="min-h-[96px] bg-white dark:bg-slate-900"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <Button type="button" variant="outline" onClick={cancelEditCourse}>
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                              disabled={isUpdatingCourse}
                              onClick={handleUpdateCourse}
                            >
                              {isUpdatingCourse ? 'Saving…' : 'Save changes'}
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {deletingCourseId === course.id && (
                    <tr className="border-b dark:border-slate-700 bg-red-50/60 dark:bg-red-500/5">
                      <td colSpan={4} className="p-4">
                        <div className="rounded-2xl border border-red-300 dark:border-red-500/40 bg-white dark:bg-slate-950 shadow-sm p-5 max-w-xl">
                          <div className="flex items-start gap-3">
                            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 shrink-0">
                              <AlertTriangle className="w-5 h-5" />
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">Delete this course?</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                                This permanently deletes <strong className="text-slate-900 dark:text-slate-100">{course.title}</strong> with
                                all its units, lessons, quizzes and submissions. This cannot be undone.
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 space-y-1.5">
                            <Label className="text-slate-700 dark:text-slate-300">
                              Type <span className="font-semibold">{course.title}</span> to confirm
                            </Label>
                            <Input
                              value={deleteConfirm}
                              onChange={(e) => setDeleteConfirm(e.target.value)}
                              placeholder={course.title}
                              className="bg-white dark:bg-slate-900"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2 mt-4">
                            <Button type="button" variant="outline" onClick={cancelDelete}>Cancel</Button>
                            <Button
                              type="button"
                              disabled={deleting || deleteConfirm.trim() !== course.title.trim()}
                              onClick={() => handleDeleteCourse(course)}
                              className="bg-red-600 hover:bg-red-500 text-white shadow-sm disabled:bg-red-300 dark:disabled:bg-red-500/30"
                            >
                              {deleting ? 'Deleting…' : 'Delete course'}
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {lessonManagerCourseId === course.id && (
                    <tr className="border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60">
                      <td colSpan={4} className="py-3">
                        <LessonManager
                          course={course}
                          onClose={() => setLessonManagerCourseId(null)}
                          onChanged={refetch}
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
