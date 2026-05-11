import { Link } from 'react-router';
import { X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/app/services/api';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';

export default function Signup() {
  const isLocalDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const handleGoogleLogin = () => {
    if (isLocalDev) {
      toast.error('Google sign-up is disabled on localhost. Backend OAuth redirects to production.');
      return;
    }
    window.location.href = authApi.getGoogleLoginUrl();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 py-8">
      <Card className="w-full max-w-md dark:bg-slate-900 dark:border-slate-800">
        <div className="flex justify-end p-2 pb-0">
          <Link
            to="/"
            aria-label="Continue as guest"
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
        <CardHeader className="text-center">
          <div
            className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-2"
            aria-hidden="true"
          >
            D
          </div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Sign up with Google to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {isLocalDev && (
            <div
              role="status"
              className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-3 text-sm text-amber-900 dark:text-amber-200"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Sign-up is OAuth-only and the backend redirects to the production frontend. For local testing, ask an admin
                to create an account, then sign in with email/password on{' '}
                <Link to="/login" className="underline font-medium">/login</Link>.
              </span>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isLocalDev}
            aria-disabled={isLocalDev}
            title={isLocalDev ? 'Disabled on localhost — backend OAuth redirects to production' : undefined}
          >
            Continue with Google
          </Button>

          <p className="text-center text-sm text-gray-600 dark:text-slate-400 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-600 hover:underline font-medium focus:outline-none focus:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
