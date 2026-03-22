import { Course } from '@/app/data/courses';
import { UserPublicCourseItem } from '@/app/services/api';

function resolveInstructor(item: UserPublicCourseItem): string {
  return item.instructor_name || item.teacher_name || item.instructor || 'Digital Academy';
}

export function mapApiCourseToCourse(item: UserPublicCourseItem): Course {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    instructor: resolveInstructor(item),
    rating: 4.7,
    reviewCount: 0,
    price: item.discount_price ?? item.base_price,
    originalPrice: item.base_price,
    image: item.cover_img || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1080&q=80',
    category: 'development',
    level: 'All Levels',
    duration: '10 hours',
    students: 0,
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
