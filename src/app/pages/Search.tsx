import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { courses } from '@/app/data/courses';
import { CourseCard } from '@/app/components/CourseCard';

function loadSearchCourses() {
  try {
    const raw = localStorage.getItem('da_public_courses_cache');
    if (!raw) return courses;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? [...parsed, ...courses] : courses;
  } catch {
    return courses;
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">
        {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{q}&rdquo;
      </h1>
      {results.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 text-lg">No courses found matching &ldquo;{q}&rdquo;</p>
          <p className="text-gray-500 mt-2">Try different keywords or browse all courses</p>
        </div>
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
