import { Card, CardContent } from './card';
import { Skeleton } from './skeleton';

export function CourseCardSkeleton() {
  return (
    <Card className="overflow-hidden h-full flex flex-col border-gray-100">
      {/* 16:9 image block */}
      <Skeleton className="aspect-video w-full rounded-none" />

      <CardContent className="p-4 flex flex-col flex-1 gap-2">
        {/* Title — two lines */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />

        {/* Instructor */}
        <Skeleton className="h-3 w-1/2 mt-1" />

        {/* Rating row */}
        <div className="flex items-center gap-1.5 mt-1">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>

        {/* Footer row */}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}
