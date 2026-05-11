import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { User, AuthState, Notification, Transaction } from '@/app/types';
import { authApi, courseApi, orderApi, leaderboardApi, resolveCourseId, setTokens, clearTokens, getAccessToken, Tier } from '@/app/services/api';

interface AuthContextType extends AuthState {
  apiAvailable: boolean;
  coin: number;
  tier: Tier | null;
  leaderboardPosition: number | null;
  refreshGamification: () => Promise<void>;
  login: (email: string, password: string) => Promise<'student' | 'instructor'>;
  authenticateWithTokens: (
    access: string,
    refresh: string,
    profileHint?: { email?: string; username?: string; fullName?: string; firstName?: string; lastName?: string }
  ) => Promise<'student' | 'instructor'>;
  register: (name: string, email: string, password: string, role: 'student' | 'instructor') => Promise<'verification_sent'>;
  verifyRegistration: (name: string, email: string, code: string, role: 'student' | 'instructor') => Promise<'student' | 'instructor'>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  enrollInCourse: (courseId: string, courseTitle: string, amount: number) => Promise<void>;
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  transactions: Transaction[];
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'digital_academy_auth';
const NOTIF_KEY = 'digital_academy_notifications';
const TX_KEY = 'digital_academy_transactions';
const GAMIFICATION_KEY = 'da_gamification';
const LAST_TIER_KEY = 'da_last_tier';

function load<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}

function mapApiRole(role?: string): 'student' | 'instructor' {
  const normalized = role?.toUpperCase();
  if (normalized === 'TEACHER' || normalized === 'ADMIN' || normalized === 'INSTRUCTOR') return 'instructor';
  return 'student';
}

function parseJwtClaims(token: string): Record<string, any> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function pickFirstString(...values: Array<unknown>): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function normalizeLoginPayload(payload: any): {
  access: string;
  refresh: string;
  user: { id?: string; email?: string; username?: string | null; role?: string };
} | null {
  if (!payload || typeof payload !== 'object') return null;

  const root = payload as Record<string, any>;
  const nested = (root.data && typeof root.data === 'object') ? root.data : null;

  const access =
    root.access ??
    root.access_token ??
    root.tokens?.access ??
    root.tokens?.access_token ??
    nested?.access ??
    nested?.access_token ??
    nested?.tokens?.access ??
    nested?.tokens?.access_token;

  const refresh =
    root.refresh ??
    root.refresh_token ??
    root.tokens?.refresh ??
    root.tokens?.refresh_token ??
    nested?.refresh ??
    nested?.refresh_token ??
    nested?.tokens?.refresh ??
    nested?.tokens?.refresh_token;

  const user = (root.user ?? nested?.user ?? {}) as {
    id?: string;
    email?: string;
    username?: string | null;
    role?: string;
  };

  if (!access || !refresh) return null;

  return {
    access: String(access),
    refresh: String(refresh),
    user,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => load(STORAGE_KEY, { user: null, isAuthenticated: false }));
  const [notifications, setNotifications] = useState<Notification[]>(() => load(NOTIF_KEY, []));
  const [transactions, setTransactions] = useState<Transaction[]>(() => load(TX_KEY, []));
  const [apiAvailable, setApiAvailable] = useState(() => Boolean(getAccessToken()));

  const _savedGamification = load<{ coin: number; tier: Tier | null; leaderboardPosition: number | null }>(
    GAMIFICATION_KEY,
    { coin: 0, tier: null, leaderboardPosition: null }
  );
  const [coin, setCoin] = useState<number>(_savedGamification.coin);
  const [tier, setTier] = useState<Tier | null>(_savedGamification.tier);
  const [leaderboardPosition, setLeaderboardPosition] = useState<number | null>(_savedGamification.leaderboardPosition);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => { localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem(TX_KEY, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => {
    localStorage.setItem(GAMIFICATION_KEY, JSON.stringify({ coin, tier, leaderboardPosition }));
  }, [coin, tier, leaderboardPosition]);

  const refreshGamification = async () => {
    if (!getAccessToken()) return;
    try {
      const profile = await authApi.getProfile();
      if (profile) setCoin(profile.coin ?? 0);
      const lb = await leaderboardApi.list();
      const rows = lb.data ?? [];
      const myUsername = profile?.username ?? state.user?.name ?? '';
      const me = rows.find(r => r.username === myUsername) ?? null;
      setTier(me?.tier ?? null);
      setLeaderboardPosition(me?.position ?? null);
      // Tier-up celebration
      const prevTier = localStorage.getItem(LAST_TIER_KEY) as Tier | null;
      if (me?.tier && me.tier !== prevTier) {
        const TIER_ORDER: Tier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
        const prevIdx = prevTier ? TIER_ORDER.indexOf(prevTier) : -1;
        const newIdx = TIER_ORDER.indexOf(me.tier);
        // Only celebrate a tier-up when the user already had a previous tier stored.
        // prevTier === null means first login or post-logout — no toast.
        if (prevTier !== null && newIdx > prevIdx) {
          toast.success(`You reached ${me.tier.charAt(0) + me.tier.slice(1).toLowerCase()} tier!`);
        }
        localStorage.setItem(LAST_TIER_KEY, me.tier);
      } else if (!me && prevTier) {
        // Demoted off leaderboard — silent, just clear cache
        localStorage.removeItem(LAST_TIER_KEY);
      }
    } catch {
      // Silent — gamification is non-critical, don't break auth flow
    }
  };

  const seedNotifications = (name: string, dest: string) => {
    setNotifications([
      { id: 'n1', message: `Welcome back, ${name}!`, read: false, createdAt: new Date().toISOString(), link: dest },
      { id: 'n2', message: 'New courses added in Web Development', read: false, createdAt: new Date(Date.now() - 86400000).toISOString(), link: '/courses' },
      { id: 'n3', message: 'Complete your profile to get personalized recommendations', read: true, createdAt: new Date(Date.now() - 172800000).toISOString(), link: '/profile' },
    ]);
  };

  const syncStudentData = async () => {
    const [myCoursesRes, ordersRes] = await Promise.all([
      courseApi.myEnrolledCourses(),
      orderApi.list().catch(() => ({ data: [] as Array<{ course_title: string; total_amount: string | null }> })),
    ]);

    const enrolledCourseIds = (myCoursesRes.data ?? []).map(item => resolveCourseId(item.course)).filter(Boolean);

    setState(prev => {
      if (!prev.user || prev.user.role !== 'student') return prev;
      return {
        ...prev,
        user: {
          ...prev.user,
          enrolledCourseIds,
        },
      };
    });

    if (Array.isArray(ordersRes.data) && ordersRes.data.length > 0) {
      setTransactions(
        ordersRes.data.map((item, idx) => ({
          id: `order-${idx}-${item.course_title}`,
          date: new Date().toISOString(),
          courseTitle: item.course_title,
          amount: Number(item.total_amount ?? 0),
          status: 'completed',
        }))
      );
    }
  };

  useEffect(() => {
    if (!state.isAuthenticated || !state.user || state.user.role !== 'student' || !getAccessToken()) return;

    setApiAvailable(true);
    syncStudentData().catch(() => {
      // Keep persisted local auth state if student sync fails.
    });
    refreshGamification();
  }, [state.isAuthenticated, state.user?.id, state.user?.role]);

  const login = async (email: string, password: string) => {
    try {
      const data = await authApi.login(email, password);
      const normalized = normalizeLoginPayload(data);

      if (!normalized) {
        throw new Error('API response is empty or invalid.');
      }

      setTokens(normalized.access, normalized.refresh);
      const claims = parseJwtClaims(normalized.access);
      const role = mapApiRole(
        (normalized.user?.role as string | undefined) ??
        (claims?.role as string | undefined) ??
        undefined
      );

      const resolvedEmail = normalized.user?.email ?? (claims?.email as string | undefined) ?? email;
      const u: User = {
        id: normalized.user.id ?? String(claims?.user_id ?? claims?.id ?? Date.now()),
        name: normalized.user.username ?? resolvedEmail.split('@')[0],
        email: resolvedEmail,
        role,
        enrolledCourseIds: [],
        createdAt: new Date().toISOString(),
      };
      setState({ user: u, isAuthenticated: true });
      seedNotifications(u.name, role === 'instructor' ? '/instructor' : '/profile');
      setApiAvailable(true);
      if (role === 'student') {
        await syncStudentData();
        await refreshGamification();
      }
      return role;
    } catch (err: any) {
      setApiAvailable(false);
      throw new Error(err?.message ?? 'API error');
    }
  };

  const authenticateWithTokens = async (
    access: string,
    refresh: string,
    profileHint?: { email?: string; username?: string; fullName?: string; firstName?: string; lastName?: string }
  ) => {
    const claims = parseJwtClaims(access);
    const role = mapApiRole((claims?.role as string | undefined) ?? undefined);
    const email = pickFirstString(
      profileHint?.email,
      claims?.email,
      claims?.username,
      state.user?.email
    );
    const nameFromHint = pickFirstString(
      profileHint?.fullName,
      [profileHint?.firstName, profileHint?.lastName].filter(Boolean).join(' '),
      profileHint?.username
    );
    const nameFromClaims = pickFirstString(
      claims?.full_name,
      claims?.name,
      [claims?.first_name, claims?.last_name].filter(Boolean).join(' '),
      claims?.username
    );
    const fallbackName = email ? email.split('@')[0] : 'student';
    const userId = String(claims?.user_id ?? claims?.id ?? Date.now());

    setTokens(access, refresh);

    const u: User = {
      id: userId,
      name: pickFirstString(nameFromHint, nameFromClaims, state.user?.name, fallbackName),
      email,
      role,
      enrolledCourseIds: [],
      createdAt: new Date().toISOString(),
    };

    setState({ user: u, isAuthenticated: true });
    seedNotifications(u.name, role === 'instructor' ? '/instructor' : '/profile');
    setApiAvailable(true);

    if (role === 'student') {
      await syncStudentData().catch(() => {});
      await refreshGamification();
    }

    return role;
  };

  const register = async (name: string, email: string, password: string, role: 'student' | 'instructor'): Promise<'verification_sent'> => {
    setApiAvailable(false);
    await authApi.register({ name, email, password, role });
    return 'verification_sent';
  };

  const verifyRegistration = async (_name: string, email: string, code: string, _role: 'student' | 'instructor'): Promise<'student' | 'instructor'> => {
    setApiAvailable(false);
    await authApi.verifyCode(email, code);
    return 'student';
  };

  const logout = () => {
    clearTokens();
    if (apiAvailable) authApi.logout().catch(() => {});
    setState({ user: null, isAuthenticated: false });
    setNotifications([]);
    setTransactions([]);
    setCoin(0);
    setTier(null);
    setLeaderboardPosition(null);
    localStorage.removeItem(GAMIFICATION_KEY);
    localStorage.removeItem(LAST_TIER_KEY);
  };

  const updateUser = (updates: Partial<User>) => {
    if (!state.user) return;
    const updated = { ...state.user, ...updates };
    setState(prev => ({ ...prev, user: updated }));
    if (apiAvailable) {
      authApi.updateProfile({
        first_name: updates.name,
        email: updates.email,
        avatar: updates.avatar ?? null,
      }).catch(() => {});
    }
    const users: User[] = load('da_users', []);
    const idx = users.findIndex(u => u.id === state.user!.id);
    if (idx >= 0) { users[idx] = updated; localStorage.setItem('da_users', JSON.stringify(users)); }
  };

  const enrollInCourse = async (courseId: string, courseTitle: string, amount: number) => {
    if (!state.user) return;
    if (apiAvailable) {
      try {
        await courseApi.enroll(courseId);
      } catch {
        // Fall back to local state below if enroll API is unavailable.
      }
    }

    const updatedEnrolled = Array.from(new Set([...(state.user.enrolledCourseIds || []), courseId]));
    const updated = { ...state.user, enrolledCourseIds: updatedEnrolled };
    setState(prev => ({ ...prev, user: updated }));
    const users: User[] = load('da_users', []);
    const idx = users.findIndex(u => u.id === state.user!.id);
    if (idx >= 0) { users[idx] = updated; localStorage.setItem('da_users', JSON.stringify(users)); }
    const tx: Transaction = { id: crypto.randomUUID(), date: new Date().toISOString(), courseTitle, amount, status: 'completed' };
    setTransactions(prev => [tx, ...prev]);
    setNotifications(prev => [{ id: crypto.randomUUID(), message: `You've enrolled in "${courseTitle}"!`, read: false, createdAt: new Date().toISOString(), link: '/dashboard' }, ...prev]);

    if (apiAvailable) {
      syncStudentData().catch(() => {
        // Keep optimistic transaction and enrollment state if sync fails.
      });
    }
  };

  const markNotificationRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllNotificationsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <AuthContext.Provider value={{ ...state, apiAvailable, coin, tier, leaderboardPosition, refreshGamification, login, authenticateWithTokens, register, verifyRegistration, logout, updateUser, enrollInCourse, notifications, markNotificationRead, markAllNotificationsRead, transactions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
