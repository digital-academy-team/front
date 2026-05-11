import { LessonFormItem } from '@/app/utils/instructorDashboard';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';

interface LessonEditorProps {
  lesson: LessonFormItem;
  lessonIndex: number;
  unitIndex: number;
  onTextChange: (unitIndex: number, lessonIndex: number, key: 'title' | 'desc' | 'additional_task', value: string) => void;
  onFileChange: (unitIndex: number, lessonIndex: number, key: 'video' | 'presentation', file: File | null) => void;
}

export function LessonEditor({ lesson, lessonIndex, unitIndex, onTextChange, onFileChange }: LessonEditorProps) {
  return (
    <div className="border dark:border-slate-700 rounded-md p-3 space-y-2 bg-gray-50 dark:bg-slate-800">
      <p className="text-sm font-medium dark:text-slate-200">Lesson {lessonIndex + 1}</p>
      <Input
        placeholder="Lesson title"
        value={lesson.title}
        onChange={e => onTextChange(unitIndex, lessonIndex, 'title', e.target.value)}
        required
      />
      <Textarea
        placeholder="Lesson description"
        value={lesson.desc}
        onChange={e => onTextChange(unitIndex, lessonIndex, 'desc', e.target.value)}
        required
      />
      <Input
        placeholder="Additional task"
        value={lesson.additional_task}
        onChange={e => onTextChange(unitIndex, lessonIndex, 'additional_task', e.target.value)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-gray-600 dark:text-slate-400">Video (optional)</Label>
          <input
            type="file"
            accept="video/*"
            className="w-full text-sm"
            onChange={e => onFileChange(unitIndex, lessonIndex, 'video', e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-600 dark:text-slate-400">Presentation (optional)</Label>
          <input
            type="file"
            accept=".pdf,.ppt,.pptx,.key"
            className="w-full text-sm"
            onChange={e => onFileChange(unitIndex, lessonIndex, 'presentation', e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
    </div>
  );
}
