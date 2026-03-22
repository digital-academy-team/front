import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/store/AuthContext';

function parseUserIdFromJwt(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(json) as { user_id?: string; id?: string };
    return data.user_id ?? data.id ?? null;
  } catch {
    return null;
  }
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticateWithTokens } = useAuth();
  const handledRef = useRef(false);

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const access = query.get('access');
  const refresh = query.get('refresh');
  const hasPassword = query.get('has_password');
  const email = query.get('email');
  const username = query.get('username');
  const fullName = query.get('full_name') ?? query.get('name');
  const firstName = query.get('first_name');
  const lastName = query.get('last_name');

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const completeAuth = async () => {
      if (!access || !refresh) {
        toast.error('Google authentication failed. Missing tokens.');
        navigate('/login', { replace: true });
        return;
      }

      try {
        const role = await authenticateWithTokens(access, refresh, {
          email: email ?? undefined,
          username: username ?? undefined,
          fullName: fullName ?? undefined,
          firstName: firstName ?? undefined,
          lastName: lastName ?? undefined,
        });
        const userId = parseUserIdFromJwt(access);

        if (hasPassword === 'false' && userId) {
          navigate(`/set-password/${userId}`, { replace: true });
          return;
        }

        navigate(role === 'instructor' ? '/instructor' : '/profile', { replace: true });
      } catch (error: any) {
        toast.error(error?.message ?? 'Google authentication failed.');
        navigate('/login', { replace: true });
      }
    };

    completeAuth();
  }, [access, refresh, hasPassword, email, username, fullName, firstName, lastName, authenticateWithTokens, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
        <p className="mt-3 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
