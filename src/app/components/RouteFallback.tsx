import { Skeleton } from './ui/skeleton';

const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center p-8">
    <div className="w-full max-w-4xl space-y-3">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-6 w-2/3" />
    </div>
  </div>
);

export default RouteFallback;
