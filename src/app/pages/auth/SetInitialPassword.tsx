import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { CheckCircle2, Circle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { authApi } from '@/app/services/api';

interface SetPasswordForm {
  password: string;
  confirmPassword: string;
}

export default function SetInitialPassword() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<SetPasswordForm>();
  const passwordValue = watch('password') ?? '';
  const confirmValue = watch('confirmPassword') ?? '';
  const livePasswordMismatch = Boolean(confirmValue) && passwordValue !== confirmValue;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState && e.getModifierState('CapsLock'));
  };

  const passwordChecks = {
    minLength: passwordValue.length >= 8,
    hasLetter: /[A-Za-z]/.test(passwordValue),
    hasNumber: /\d/.test(passwordValue),
    hasSpecial: /[^A-Za-z0-9]/.test(passwordValue),
    notOnlyDigits: !/^\d+$/.test(passwordValue),
    matches: passwordValue.length > 0 && passwordValue === confirmValue,
  };

  const isPasswordValid =
    passwordChecks.minLength &&
    passwordChecks.hasLetter &&
    passwordChecks.hasNumber &&
    passwordChecks.hasSpecial &&
    passwordChecks.notOnlyDigits &&
    passwordChecks.matches;

  const onSubmit = async (data: SetPasswordForm) => {
    if (!userId) {
      toast.error('Invalid password setup link.');
      return;
    }

    try {
      await authApi.setInitialPassword(userId, data.password);
      toast.success('Password set successfully.');
      navigate('/profile', { replace: true });
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message ?? 'Failed to set password.';
      if (/already|allaqachon/i.test(message)) {
        toast.info(message);
        navigate('/profile', { replace: true });
        return;
      }
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 py-8">
      <Card className="w-full max-w-md dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Set Your Password</CardTitle>
          <CardDescription>Create a password to finish activating your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  className="pr-10"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : capsLockOn ? 'caps-lock-warning' : undefined}
                  onKeyDown={handlePasswordKey}
                  onKeyUp={handlePasswordKey}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Minimum 8 characters' },
                    validate: {
                      hasLetterAndNumber: (value: string) =>
                        /[A-Za-z]/.test(value) && /\d/.test(value)
                          ? true
                          : 'Use at least one letter and one number',
                      hasSpecialCharacter: (value: string) =>
                        /[^A-Za-z0-9]/.test(value)
                          ? true
                          : 'Use at least one special character',
                      notOnlyDigits: (value: string) =>
                        /^\d+$/.test(value) ? 'Password cannot be only numbers' : true,
                    },
                  })}
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

              <div className="rounded-md border bg-gray-50 p-3 text-xs space-y-1.5">
                <RequirementRow ok={passwordChecks.minLength} label="At least 8 characters" />
                <RequirementRow ok={passwordChecks.hasLetter} label="Contains at least one letter" />
                <RequirementRow ok={passwordChecks.hasNumber} label="Contains at least one number" />
                <RequirementRow ok={passwordChecks.hasSpecial} label="Contains at least one special character" />
                <RequirementRow ok={passwordChecks.matches} label="Passwords match" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  className="pr-10"
                  aria-invalid={(errors.confirmPassword || livePasswordMismatch) ? 'true' : 'false'}
                  aria-describedby={(errors.confirmPassword || livePasswordMismatch) ? 'confirm-password-error' : capsLockOn ? 'caps-lock-warning' : undefined}
                  onKeyDown={handlePasswordKey}
                  onKeyUp={handlePasswordKey}
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (v: string) => v === watch('password') || 'Passwords do not match',
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(s => !s)}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  aria-pressed={showConfirm}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {(errors.confirmPassword || livePasswordMismatch) && (
                <p id="confirm-password-error" className="text-sm text-red-500" role="alert">
                  {errors.confirmPassword?.message ?? 'Passwords do not match'}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={isSubmitting || !isPasswordValid}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Set Password'}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}

function RequirementRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 ${ok ? 'text-green-700' : 'text-gray-500'}`}>
      {ok
        ? <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        : <Circle className="w-3.5 h-3.5" aria-hidden="true" />}
      <span>{label}</span>
    </div>
  );
}
