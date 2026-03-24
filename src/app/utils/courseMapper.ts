import { Course } from '@/app/data/courses';
import { UserPublicCourseItem } from '@/app/services/api';

function toFiniteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveInstructor(item: UserPublicCourseItem): string {
  const anyItem = item as any;
  return (
    item.instructor_name ||
    item.teacher_name ||
    anyItem?.teacher_full_name ||
    anyItem?.teacher?.full_name ||
    anyItem?.teacher?.name ||
    [anyItem?.teacher?.first_name, anyItem?.teacher?.last_name].filter(Boolean).join(' ') ||
    item.instructor ||
    'Digital Academy'
  );
}

export function mapApiCourseToCourse(item: UserPublicCourseItem): Course {
  const avgRating = Math.max(0, Math.min(5, toFiniteNumber(item.avg_rating, 0)));
  const reviewCount = Math.max(0, Math.round(toFiniteNumber(item.comments_count, 0)));
  const students = Math.max(0, Math.round(toFiniteNumber(item.students_count, 0)));

  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    instructor: resolveInstructor(item),
    rating: avgRating,
    reviewCount,
    price: item.discount_price ?? item.base_price,
    originalPrice: item.base_price,
    image: item.cover_img || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1080&q=80',
    category: 'development',
    level: 'All Levels',
    duration: '10 hours',
    students,
    description: item.desc,
    lastUpdated: '2026',
    language: 'English',
    whatYouWillLearn: [
      'Course content available after enrollment',
      'Practical lessons and tasks',
      'Step-by-step learning flow',
      'Certificate after completion',
    ],
    requirements: ['Internet connection', 'Learning motivation'],
    curriculum: [{ section: 'Main Content', lectures: 1, duration: '10h 00m' }],
  };
}
