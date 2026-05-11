import { Link, useNavigate } from 'react-router';
import { ArrowLeft, BookOpen, Home as HomeIcon, LifeBuoy } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 py-16">
      <div className="text-center max-w-xl">
        <div
          className="text-[8rem] sm:text-[10rem] font-black leading-none bg-gradient-to-br from-purple-500 to-indigo-600 bg-clip-text text-transparent select-none"
          aria-hidden="true"
        >
          404
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 mt-2 mb-2">
          Page not found
        </h1>
        <p className="text-gray-600 dark:text-slate-400 mb-8">
          The page you're looking for doesn't exist or has been moved. Try one of these instead.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
            aria-label="Go to previous page"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Go back
          </Button>
          <Link to="/">
            <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
              <HomeIcon className="w-4 h-4" aria-hidden="true" />
              Home
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <Link
            to="/courses"
            className="group flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-purple-300 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <BookOpen className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-slate-100 group-hover:text-purple-700">
                Browse courses
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400">Explore the full catalogue.</p>
            </div>
          </Link>
          <Link
            to="/help"
            className="group flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-purple-300 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <LifeBuoy className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-slate-100 group-hover:text-purple-700">
                Help center
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400">FAQ and contact options.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
