import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { X } from 'lucide-react';
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

  const onSubmit = async (data: LoginForm) => {
    try {
      const role = await login(data.identifier, data.password);
      toast.success('Welcome back!');
      navigate(role === 'instructor' ? '/instructor' : '/profile', { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? 'API error. Please try again.');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = authApi.getGoogleLoginUrl();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
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
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your Digital Academy account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or username</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="you@example.com or username"
                {...register('identifier', { required: 'Email or username is required' })}
              />
              {errors.identifier && <p className="text-sm text-red-500">{errors.identifier.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
              />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-purple-600 hover:underline">Forgot password?</Link>
            </div>
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin}>
              Continue with Google
            </Button>
          </form>
          <p className="text-center text-sm text-gray-600 mt-4">
            Don't have an account?{' '}
            <Link to="/signup" className="text-purple-600 hover:underline font-medium">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
