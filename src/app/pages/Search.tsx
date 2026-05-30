import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { CourseCard } from '@/app/components/CourseCard';
import { EmptyState } from '@/app/components/ui/EmptyState';

function loadSearchCourses() {
  try {
    const raw = localStorage.getItem('da_public_courses_cache');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const availableCourses = loadSearchCourses();

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const lower = q.toLowerCase();
    return availableCourses.filter(c =>
      c.title.toLowerCase().includes(lower) ||
      c.description.toLowerCase().includes(lower) ||
      c.instructor.toLowerCase().includes(lower) ||
      c.category.toLowerCase().includes(lower)
    );
  }, [availableCourses, q]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 dark:bg-slate-950 min-h-screen">
      <h1 className="text-2xl font-bold mb-2 dark:text-slate-100">
        {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{q}&rdquo;
      </h1>
      {results.length === 0 ? (
        <EmptyState
          title={`No results for "${q}".`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
          {results.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
