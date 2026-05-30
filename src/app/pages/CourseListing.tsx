import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { CourseCard } from '../components/CourseCard';
import { categories } from '../data/courses';
import { FilterSidebar } from '../components/FilterSidebar';
import { X, BookOpen } from 'lucide-react';
import { categoryApi, courseApi } from '@/app/services/api';
import { mapApiCourseToCourse } from '@/app/utils/courseMapper';
import { CategoryIconKey, getCategoryVisuals } from '@/app/utils/categoryVisuals';
import { ListSkeleton } from '../components/ui/ListSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';

interface CourseCategoryFilter {
  id: string;
  name: string;
  iconKey: CategoryIconKey;
}

const DEFAULT_PRICE_BOUNDS: [number, number] = [0, 150];

function clampPriceRange(range: [number, number], bounds: [number, number]): [number, number] {
  const lower = Math.min(range[0], range[1]);
  const upper = Math.max(range[0], range[1]);
  const minBound = Math.min(bounds[0], bounds[1]);
  const maxBound = Math.max(bounds[0], bounds[1]);
  const clampedMin = Math.min(Math.max(lower, minBound), maxBound);
  const clampedMax = Math.min(Math.max(upper, minBound), maxBound);

  return clampedMin <= clampedMax ? [clampedMin, clampedMax] : [minBound, maxBound];
}

export function CourseListing() {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category');

  const [priceBounds, setPriceBounds] = useState<[number, number]>(DEFAULT_PRICE_BOUNDS);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categoryFilter ? [categoryFilter] : []
  );
  const [apiCourses, setApiCourses] = useState<ReturnType<typeof mapApiCourseToCourse>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<CourseCategoryFilter[]>(
    categories.map((item) => ({
      id: item.id,
      name: item.name,
      iconKey: getCategoryVisuals(item.name, item.id).iconKey,
    }))
  );

  useEffect(() => {
    let active = true;

    categoryApi
      .list()
      .then((response) => {
        if (!active || !Array.isArray(response?.data) || response.data.length === 0) return;
        setAvailableCategories(
          response.data.map((item) => ({
            id: item.id,
            name: item.title,
            iconKey: getCategoryVisuals(item.title, item.slug).iconKey,
          }))
        );
      })
      .catch(() => {
        // Keep local category list if category API is unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  const fetchCourses = useCallback(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);

    const query: { category?: string[] } = {
      category: selectedCategories.length ? selectedCategories : undefined,
    };

    courseApi
      .userCourses(query)
      .then((response) => {
        if (!active) return;
        if (!Array.isArray(response?.data)) {
          setHasError(true);
          return;
        }
        const mappedCourses = response.data.map(mapApiCourseToCourse);
        setApiCourses(mappedCourses);

        const prices = mappedCourses
          .map((course) => Number(course.price))
          .filter((value) => Number.isFinite(value));

        if (prices.length > 0) {
          const nextMin = Math.floor(Math.min(...prices));
          const nextMax = Math.ceil(Math.max(...prices));
          const bounds: [number, number] = [nextMin, Math.max(nextMax, nextMin + 1)];
          setPriceBounds(bounds);
        }

        localStorage.setItem('da_public_courses_cache', JSON.stringify(mappedCourses));
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [selectedCategories]);

  useEffect(() => {
    const cleanup = fetchCourses();
    return cleanup;
  }, [fetchCourses]);

  const toggleCategory = (id: string) =>
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const resetFilters = () => {
    setSelectedCategories([]);
    setPriceRange(null);
  };

  const activePriceRange = priceRange ? clampPriceRange(priceRange, priceBounds) : null;

  const filteredCourses = apiCourses.filter((course) => {
    if (!activePriceRange) return true;
    const price = Number(course.price);
    if (!Number.isFinite(price)) return true;
    return price >= activePriceRange[0] && price <= activePriceRange[1];
  });

  const activeCategoryNames = selectedCategories.map(id => availableCategories.find(c => c.id === id)?.name ?? id);
  const isPriceFiltered = !!activePriceRange && (activePriceRange[0] > priceBounds[0] || activePriceRange[1] < priceBounds[1]);
  const hasActiveFilters = selectedCategories.length > 0 || isPriceFiltered;

  return (
    <div className="min-h-screen bg-gray-50/40 dark:bg-slate-950">
      {/* Page header */}
      <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-8">
          <h1 className="text-3xl font-bold mb-1 dark:text-slate-100">All Courses</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            Discover your next skill — {apiCourses.length} courses available
          </p>
          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">Active filters:</span>
              {activeCategoryNames.map(name => (
                <span key={name} className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  {name}
                  <button onClick={() => {
                    const category = availableCategories.find((item) => item.name === name);
                    if (category) toggleCategory(category.id);
                  }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {isPriceFiltered && activePriceRange && (
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  ${activePriceRange[0]}–${activePriceRange[1]}
                  <button onClick={() => setPriceRange(null)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button onClick={resetFilters} className="text-xs text-red-500 hover:text-red-700 font-medium ml-1">
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <FilterSidebar
            categories={availableCategories}
            selectedCategories={selectedCategories}
            priceRange={priceRange ?? priceBounds}
            minPrice={priceBounds[0]}
            maxPrice={priceBounds[1]}
            onToggleCategory={toggleCategory}
            onPriceRangeChange={(value) => {
              const min = Number(value[0]);
              const max = Number(value[1]);
              if (!Number.isFinite(min) || !Number.isFinite(max)) return;
              setPriceRange([min, max]);
            }}
            onReset={resetFilters}
          />

          <div className="flex-1 min-w-0">
            {/* Sort bar */}
            {!isLoading && !hasError && (
              <div className="flex items-center justify-between mb-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 shadow-sm">
                <p className="text-sm text-gray-600 dark:text-slate-300 font-medium">
                  <span className="text-gray-900 dark:text-slate-100 font-bold">{filteredCourses.length}</span> courses found
                </p>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-5">
                <ListSkeleton rows={9} />
              </div>
            ) : hasError ? (
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm">
                <ErrorState onRetry={fetchCourses} />
              </div>
            ) : filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-5">
                {filteredCourses.map(course => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm">
                <EmptyState
                  icon={<BookOpen className="w-16 h-16" />}
                  title="No courses match your filters."
                  description="Try clearing one or more filters."
                  action={{ label: 'Clear filters', onClick: resetFilters }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
