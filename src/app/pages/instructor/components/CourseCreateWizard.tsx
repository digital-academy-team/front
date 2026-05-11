import { Dispatch, FormEvent, SetStateAction } from 'react';
import { CategoryItem } from '@/app/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { CourseFormState, createEmptyLesson } from '@/app/utils/instructorDashboard';
import { LessonEditor } from './LessonEditor';

interface CourseCreateWizardProps {
  form: CourseFormState;
  setForm: Dispatch<SetStateAction<CourseFormState>>;
  categories: CategoryItem[];
  isCreating: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
}

export function CourseCreateWizard({
  form,
  setForm,
  categories,
  isCreating,
  onSubmit,
  onCancel,
}: CourseCreateWizardProps) {
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

  return (
    <Card>
      <CardHeader><CardTitle>Create New Course</CardTitle></CardHeader>
      <CardContent>
        <form className="space-y-4 max-w-3xl" onSubmit={onSubmit}>
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
              className="w-full h-10 rounded-md border border-input bg-background dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 px-3 py-2 text-sm"
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
            <div key={unitIndex} className="border dark:border-slate-700 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold dark:text-slate-200">Unit {unitIndex + 1}</h3>
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
                <LessonEditor
                  key={lessonIndex}
                  lesson={lesson}
                  lessonIndex={lessonIndex}
                  unitIndex={unitIndex}
                  onTextChange={updateLesson}
                  onFileChange={updateLessonFile}
                />
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
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
