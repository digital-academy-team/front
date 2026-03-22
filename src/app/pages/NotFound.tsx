import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <div className="text-9xl font-black text-purple-200 mb-4">404</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-600 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/"><Button className="bg-purple-600 hover:bg-purple-700">Go Home</Button></Link>
      </div>
    </div>
  );
}
