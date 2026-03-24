import { Link } from 'react-router';
import { X } from 'lucide-react';
import { authApi } from '@/app/services/api';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';

export default function Signup() {
  const handleGoogleLogin = () => {
    window.location.href = authApi.getGoogleLoginUrl();
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Link to="/" className="absolute top-4 left-4 flex items-center gap-2 shrink-0">
        <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center">
          <span className="text-white text-xl font-bold">D</span>
        </div>
        <span className="font-bold text-lg sm:text-xl">Digital Academy</span>
      </Link>
      <Card className="w-full max-w-md">
        <div className="flex justify-end p-2 pb-0">
          <Link
            to="/"
            aria-label="Continue as guest"
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </Link>
        </div>
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-2">D</div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Sign up with Google to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin}>
            Continue with Google
          </Button>

          <p className="text-center text-sm text-gray-600 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-600 hover:underline font-medium">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
