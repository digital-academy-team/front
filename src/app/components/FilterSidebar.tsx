import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';
import { Slider } from '@/app/components/ui/slider';
import { SlidersHorizontal, X, Code2, Briefcase, Palette, TrendingUp, Camera, Music2, Dumbbell, Sparkles, Tag } from 'lucide-react';
import { CategoryIconKey } from '@/app/utils/categoryVisuals';

interface CourseCategoryFilter {
  id: string;
  name: string;
  iconKey: CategoryIconKey;
}

function CategoryIcon({ iconKey }: { iconKey: CategoryIconKey }) {
  const className = 'w-4 h-4 text-gray-600';

  if (iconKey === 'code') return <Code2 className={className} />;
  if (iconKey === 'briefcase') return <Briefcase className={className} />;
  if (iconKey === 'palette') return <Palette className={className} />;
  if (iconKey === 'trending') return <TrendingUp className={className} />;
  if (iconKey === 'camera') return <Camera className={className} />;
  if (iconKey === 'music') return <Music2 className={className} />;
  if (iconKey === 'dumbbell') return <Dumbbell className={className} />;
  if (iconKey === 'sparkles') return <Sparkles className={className} />;
  return <Tag className={className} />;
}

interface FilterSidebarProps {
  categories: CourseCategoryFilter[];
  selectedCategories: string[];
  priceRange: number[];
  minPrice: number;
  maxPrice: number;
  onToggleCategory: (categoryId: string) => void;
  onPriceRangeChange: (value: number[]) => void;
  onReset: () => void;
}

const activeCount = (cats: string[], price: number[], minPrice: number, maxPrice: number) =>
  cats.length + (price[0] > minPrice || price[1] < maxPrice ? 1 : 0);

export function FilterSidebar({
  categories, selectedCategories, priceRange, minPrice, maxPrice,
  onToggleCategory, onPriceRangeChange, onReset,
}: FilterSidebarProps) {
  const count = activeCount(selectedCategories, priceRange, minPrice, maxPrice);

  return (
    <aside className="lg:w-64 shrink-0">
      <div className="sticky top-24">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-gray-600" />
              <h2 className="font-semibold text-sm">Filters</h2>
              {count > 0 && (
                <span className="w-5 h-5 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {count}
                </span>
              )}
            </div>
            {count > 0 && (
              <button
                onClick={onReset}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
              >
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>

          <div className="p-5 space-y-6">
            {/* Categories */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Category</h3>
              <div className="space-y-2">
                {categories.map(category => (
                  <div key={category.id} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`cat-${category.id}`}
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={() => onToggleCategory(category.id)}
                      className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />
                    <Label htmlFor={`cat-${category.id}`} className="text-sm cursor-pointer flex items-center gap-1.5 font-normal">
                      <span className="leading-none"><CategoryIcon iconKey={category.iconKey} /></span>
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Price Range</h3>
              <Slider
                min={minPrice} max={maxPrice} step={1}
                value={priceRange}
                onValueChange={onPriceRangeChange}
                className="mb-3"
              />
              <div className="flex justify-between">
                <span className="text-xs font-semibold bg-gray-100 px-2 py-1 rounded-md text-gray-700">${priceRange[0]}</span>
                <span className="text-xs font-semibold bg-gray-100 px-2 py-1 rounded-md text-gray-700">${priceRange[1]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
