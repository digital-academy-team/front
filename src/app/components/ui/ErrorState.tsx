import { AlertCircle } from 'lucide-react';
import { Button } from './button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry: () => void;
}

export function ErrorState({
  title = "Couldn't load this",
  description,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <AlertCircle className="w-12 h-12 text-red-400 mb-4" aria-hidden="true" />
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">{description}</p>
      )}
      <Button variant="outline" onClick={onRetry} className="mt-4">
        Try again
      </Button>
    </div>
  );
}
