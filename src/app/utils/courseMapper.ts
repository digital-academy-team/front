import { Course } from '@/app/data/courses';
import { UserPublicCourseItem } from '@/app/services/api';

function resolveInstructor(item: UserPublicCourseItem): string {
  const teacher = (item as { teacher?: { full_name?: string | null } | null }).teacher;
  return (
    item.instructor_name ||
    item.teacher_name ||
    (item as { full_name?: string | null }).full_name ||
    teacher?.full_name ||
    item.instructor ||
    'Digital Academy'
  );
}

function resolveNumericValue(...values: Array<string | number | null | undefined>) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

export function mapApiCourseToCourse(item: UserPublicCourseItem): Course {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    instructor: resolveInstructor(item),
    rating: resolveNumericValue(
      item.avg_rating,
      (item as { average_rating?: number }).average_rating,
      (item as { rating?: number }).rating
    ),
    reviewCount: resolveNumericValue(
      (item as { review_count?: number }).review_count,
      (item as { reviews_count?: number }).reviews_count,
      (item as { ratings_count?: number }).ratings_count,
      (item as { comments_count?: number }).comments_count,
      item.students_count
    ),
    price: item.discount_price ?? item.base_price,
    originalPrice: item.base_price,
    image: item.cover_img || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1080&q=80',
    category: 'development',
    level: 'All Levels',
    duration: '10 hours',
    students: resolveNumericValue(item.students_count),
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
