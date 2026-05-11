import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/store/AuthContext';
import { authApi } from '@/app/services/api';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';

interface LoginForm {
  identifier: string;
  password: string;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>();
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState && e.getModifierState('CapsLock'));
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      const role = await login(data.identifier, data.password);
      toast.success('Welcome back!');
      navigate(role === 'instructor' ? '/instructor' : '/profile', { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? 'API error. Please try again.');
    }
  };

  const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const handleGoogleLogin = () => {
    if (isLocalDev) {
      toast.error('Google login is disabled on localhost. Backend OAuth redirect points to production. Use email/password.');
      return;
    }
    window.location.href = authApi.getGoogleLoginUrl();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
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
          <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-2" aria-hidden="true">D</div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your Digital Academy account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or username</Label>
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder="you@example.com or username"
                aria-invalid={errors.identifier ? 'true' : 'false'}
                aria-describedby={errors.identifier ? 'identifier-error' : undefined}
                {...register('identifier', { required: 'Email or username is required' })}
              />
              {errors.identifier && (
                <p id="identifier-error" className="text-sm text-red-500" role="alert">
                  {errors.identifier.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-10"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : capsLockOn ? 'caps-lock-warning' : undefined}
                  onKeyDown={handlePasswordKey}
                  onKeyUp={handlePasswordKey}
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {capsLockOn && !errors.password && (
                <p id="caps-lock-warning" className="text-xs text-amber-600" role="status">
                  Caps Lock is on
                </p>
              )}
              {errors.password && (
                <p id="password-error" className="text-sm text-red-500" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-purple-600 hover:underline focus:outline-none focus:underline">
                Forgot password?
              </Link>
            </div>
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
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
            {isLocalDev && (
              <p className="text-center text-xs text-gray-500 dark:text-slate-400 mt-2">
                Google login disabled on localhost. Use email/password.
              </p>
            )}
          </form>
          <p className="text-center text-sm text-gray-600 mt-4">
            Don't have an account?{' '}
            <Link to="/signup" className="text-purple-600 hover:underline font-medium focus:outline-none focus:underline">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
