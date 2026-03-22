import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CourseCard } from '../components/CourseCard';
import { courses, categories } from '../data/courses';
import { Button } from '../components/ui/button';
import { FilterSidebar } from '../components/FilterSidebar';
import { X, BookOpen } from 'lucide-react';
import { categoryApi, courseApi } from '@/app/services/api';
import { mapApiCourseToCourse } from '@/app/utils/courseMapper';
import { CategoryIconKey, getCategoryVisuals } from '@/app/utils/categoryVisuals';

interface CourseCategoryFilter {
  id: string;
  name: string;
  iconKey: CategoryIconKey;
}

export function CourseListing() {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category');
  const defaultPriceBounds: [number, number] = [0, 150];

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categoryFilter ? [categoryFilter] : []
  );
  const [priceBounds, setPriceBounds] = useState<[number, number]>(defaultPriceBounds);
  const [priceRange, setPriceRange] = useState<[number, number]>(defaultPriceBounds);
  const [apiCourses, setApiCourses] = useState(courses);
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

  useEffect(() => {
    let active = true;

    courseApi
      .userCourses({
        category: selectedCategories.length ? selectedCategories : undefined,
        price_min: priceRange[0] > priceBounds[0] ? priceRange[0] : undefined,
        price_max: priceRange[1] < priceBounds[1] ? priceRange[1] : undefined,
      })
      .then((response) => {
        if (!active || !Array.isArray(response?.data)) return;
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
          setPriceRange((prev) => {
            const isInitial = prev[0] === defaultPriceBounds[0] && prev[1] === defaultPriceBounds[1];
            if (isInitial) return bounds;
            const clampedMin = Math.max(bounds[0], prev[0]);
            const clampedMax = Math.min(bounds[1], prev[1]);
            if (clampedMin > clampedMax) return bounds;
            return [clampedMin, clampedMax];
          });
        }

        localStorage.setItem('da_public_courses_cache', JSON.stringify(mappedCourses));
      })
      .catch(() => {
        // Keep local fallback data if API is unavailable.
      });

    return () => {
      active = false;
    };
  }, [selectedCategories, priceRange]);

  const toggleCategory = (id: string) =>
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const resetFilters = () => {
    setSelectedCategories([]);
    setPriceRange(priceBounds);
  };

  const filteredCourses = apiCourses.filter((course) => {
    const price = Number(course.price);
    if (!Number.isFinite(price)) return true;
    return price >= priceRange[0] && price <= priceRange[1];
  });

  const activeCategoryNames = selectedCategories.map(id => availableCategories.find(c => c.id === id)?.name ?? id);
  const hasActiveFilters = selectedCategories.length > 0 || priceRange[0] > priceBounds[0] || priceRange[1] < priceBounds[1];

  return (
    <div className="min-h-screen bg-gray-50/40">
      {/* Page header */}
      <div className="bg-white border-b">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-8">
          <h1 className="text-3xl font-bold mb-1">All Courses</h1>
          <p className="text-gray-500 text-sm">
            Discover your next skill — {apiCourses.length} courses available
          </p>
          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-xs text-gray-500 font-medium">Active filters:</span>
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
              {(priceRange[0] > priceBounds[0] || priceRange[1] < priceBounds[1]) && (
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  ${priceRange[0]}–${priceRange[1]}
                  <button onClick={() => setPriceRange(priceBounds)}>
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
            priceRange={priceRange}
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
            <div className="flex items-center justify-between mb-6 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
              <p className="text-sm text-gray-600 font-medium">
                <span className="text-gray-900 font-bold">{filteredCourses.length}</span> courses found
              </p>
              <span className="text-xs text-gray-500">Filtered by backend</span>
            </div>

            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-5">
                {filteredCourses.map(course => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl text-center py-20 px-6 shadow-sm">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-7 h-7 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No courses found</h3>
                <p className="text-gray-500 text-sm mb-6">Try adjusting your filters to see more results.</p>
                <Button variant="outline" onClick={resetFilters} className="gap-2">
                  <X className="w-4 h-4" /> Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
