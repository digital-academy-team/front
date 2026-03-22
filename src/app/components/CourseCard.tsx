import { useState } from 'react';
import { Link } from 'react-router';
import { Star, Clock, Users, Heart } from 'lucide-react';
import { Course } from '../data/courses';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const [wishlisted, setWishlisted] = useState(false);
  const discount = course.originalPrice
    ? Math.round((1 - course.price / course.originalPrice) * 100)
    : null;

  return (
    <Link to={`/course/${course.slug ?? course.id}`} state={{ course }} className="group block h-full">
      <Card className="hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col group-hover:-translate-y-0.5 border-gray-100">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-gray-100 shrink-0">
          <img
            src={course.image}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {course.bestseller && (
            <Badge className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold border-0 shadow-sm">
              Bestseller
            </Badge>
          )}
          {discount && (
            <Badge className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold border-0 shadow-sm">
              -{discount}%
            </Badge>
          )}
          <button
            type="button"
            onClick={e => { e.preventDefault(); setWishlisted(w => !w); }}
            className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-200 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 ${wishlisted ? 'bg-red-500 text-white' : 'bg-white text-gray-500 hover:text-red-500 hover:bg-red-50'}`}
          >
            <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>

        <CardContent className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-base leading-snug line-clamp-2 mb-1.5 group-hover:text-purple-600 transition-colors">
            {course.title}
          </h3>
          <p className="text-sm text-gray-500 mb-2 truncate">{course.instructor}</p>

          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm font-bold text-amber-600">{course.rating.toFixed(1)}</span>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < Math.floor(course.rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
              ))}
            </div>
            <span className="text-sm text-gray-400">({course.reviewCount.toLocaleString()})</span>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-400 mb-3">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.duration}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{course.students.toLocaleString()}</span>
          </div>

          <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-gray-900">${course.price}</span>
              {course.originalPrice && (
                <span className="text-sm text-gray-400 line-through">${course.originalPrice}</span>
              )}
            </div>
            <Badge variant="secondary" className="text-sm">{course.level}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
