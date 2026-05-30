import type { ReactNode } from 'react';
import { CourseCardSkeleton } from './CourseCardSkeleton';

interface ListSkeletonProps {
  rows: number;
  renderItem?: () => ReactNode;
}

export function ListSkeleton({ rows, renderItem }: ListSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}>{renderItem ? renderItem() : <CourseCardSkeleton />}</div>
      ))}
    </>
  );
}
