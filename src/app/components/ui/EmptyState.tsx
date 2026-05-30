import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from './button';

interface EmptyStateAction {
  label: string;
  to?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && (
        <div className="mb-4 text-gray-300">{icon}</div>
      )}
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">{description}</p>
      )}
      {action && (
        action.to ? (
          <Link to={action.to}>
            <Button className="bg-purple-600 hover:bg-purple-700">{action.label}</Button>
          </Link>
        ) : (
          <Button className="bg-purple-600 hover:bg-purple-700" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}
