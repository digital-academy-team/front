import React from 'react';
import { Button } from '@/app/components/ui/button';

interface State { hasError: boolean; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center px-4">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">An unexpected error occurred.</p>
            <Button onClick={() => window.location.reload()} className="bg-purple-600 hover:bg-purple-700">Reload Page</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
