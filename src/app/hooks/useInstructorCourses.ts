import { useEffect, useRef, useState } from 'react';
import { categoryApi, CategoryItem, courseApi, UserCourseItem } from '@/app/services/api';
import { toast } from 'sonner';

export interface UseInstructorCoursesResult {
  courses: UserCourseItem[];
  categories: CategoryItem[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useInstructorCourses(): UseInstructorCoursesResult {
  const didLoadRef = useRef(false);
  const [courses, setCourses] = useState<UserCourseItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = async () => {
    const response = await courseApi.myCourses();
    setCourses(response?.data ?? []);
  };

  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;

    const loadInitialData = async () => {
      setLoading(true);
      const [categoryResult, courseResult] = await Promise.allSettled([
        categoryApi.list(),
        courseApi.myCourses(),
      ]);

      if (categoryResult.status === 'fulfilled') {
        setCategories(categoryResult.value?.data ?? []);
      } else {
        toast.error('Failed to load categories.');
      }

      if (courseResult.status === 'fulfilled') {
        setCourses(courseResult.value?.data ?? []);
      } else {
        const message = (courseResult.reason as Error | undefined)?.message;
        toast.error(message ?? 'Failed to load course list.');
        setCourses([]);
      }

      if (categoryResult.status === 'rejected' && courseResult.status === 'rejected') {
        toast.error('Failed to load dashboard data.');
      }

      setLoading(false);
    };

    loadInitialData();
  }, []);

  return { courses, categories, loading, refetch };
}
