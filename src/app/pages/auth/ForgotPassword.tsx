import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>();

  const onSubmit = async (_data: { email: string }) => {
    await new Promise(r => setTimeout(r, 800));
    setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Check your email</h2>
            <p className="text-gray-600 mb-6">We've sent a password reset link to your email address.</p>
            <Link to="/login"><Button className="bg-purple-600 hover:bg-purple-700">Back to Login</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Forgot your password?</CardTitle>
          <CardDescription>Enter your email and we'll send you a reset link</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register('email', { required: 'Email is required' })} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
          <p className="text-center text-sm text-gray-600 mt-4">
            <Link to="/login" className="text-purple-600 hover:underline">Back to login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
