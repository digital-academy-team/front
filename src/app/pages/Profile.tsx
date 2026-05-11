import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/app/store/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { User, Lock, Bell, Eye, EyeOff, Camera, BookOpen, Receipt, Award, Play, Coins, Trophy, ClipboardList } from 'lucide-react';
import { authApi, courseApi, resolveCourseId, type Tier, type ProfileResponse } from '@/app/services/api';
import { type Course } from '@/app/data/courses';
import { Link, useSearchParams } from 'react-router';
import { mapApiCourseToCourse } from '@/app/utils/courseMapper';

// ── Tier chip (mirrors Leaderboard.tsx) ───────────────────────────────────────

const TIER_COLORS: Record<Tier, string> = {
  BRONZE:
    'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700',
  SILVER:
    'bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
  GOLD:
    'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-700',
  PLATINUM:
    'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-900/40 dark:text-cyan-200 dark:border-cyan-700',
};

function TierChip({ tier }: { tier: Tier }) {
  const label = tier.charAt(0) + tier.slice(1).toLowerCase();
  return (
    <span
      role="img"
      aria-label={`${label} tier`}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${TIER_COLORS[tier]}`}
    >
      {label}
    </span>
  );
}

// ── Username validation ────────────────────────────────────────────────────────

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const validateUsername = (v: string): string | null => {
  if (v.length < 3) return 'Username must be at least 3 characters.';
  if (v.length > 50) return 'Username must be 50 characters or fewer.';
  if (!USERNAME_REGEX.test(v)) return 'Use only letters, digits, and underscores.';
  return null;
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'courses' | 'payments' | 'credentials' | 'security' | 'notifications';

interface ProfileForm { name: string; email: string; bio: string; }
interface PasswordForm { currentPassword: string; newPassword: string; confirmPassword: string; }

interface ProfileEnrolledCourse {
  enrollmentId: string;
  courseId: string;
  progress: number;
  status: string;
  title: string;
  instructor: string;
  image: string;
  totalLectures: number;
}

function loadCachedPublicCourses(): Course[] {
  try {
    const raw = localStorage.getItem('da_public_courses_cache');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Course[]) : [];
  } catch {
    return [];
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Profile() {
  const { user, updateUser, apiAvailable, transactions, coin, tier, leaderboardPosition, refreshGamification } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'profile';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatar || '');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notifPrefs, setNotifPrefs] = useState({ courseUpdates: true, enrollments: true, promotional: false, weeklyDigest: true });
  const [enrolledCourses, setEnrolledCourses] = useState<ProfileEnrolledCourse[]>([]);
  const [loadingEnrolledCourses, setLoadingEnrolledCourses] = useState(true);

  // Username state
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [remoteProfile, setRemoteProfile] = useState<ProfileResponse | null>(null);
  const [usernameValue, setUsernameValue] = useState('');
  const [usernameInitial, setUsernameInitial] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSaving, setUsernameSaving] = useState(false);

  const profileForm = useForm<ProfileForm>({ defaultValues: { name: user?.name || '', email: user?.email || '', bio: user?.bio || '' } });
  const passwordForm = useForm<PasswordForm>();

  useEffect(() => {
    profileForm.reset({
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
    });
    setAvatarPreview(user?.avatar || '');
  }, [user?.name, user?.email, user?.bio, user?.avatar]);

  // Sync tab from URL param when it changes
  useEffect(() => {
    const tab = searchParams.get('tab') as Tab;
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  // Fetch remote profile for username (once on mount)
  useEffect(() => {
    let cancelled = false;
    setLoadingProfile(true);
    authApi.getProfile().then((profile) => {
      if (cancelled) return;
      setRemoteProfile(profile);
      const uname = profile?.username ?? '';
      setUsernameValue(uname);
      setUsernameInitial(uname);
    }).catch(() => {
      // Non-critical — username field will just stay empty
    }).finally(() => {
      if (!cancelled) setLoadingProfile(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const loadMyCourses = async () => {
      setLoadingEnrolledCourses(true);
      try {
        const [myCoursesRes, publicRes] = await Promise.all([
          courseApi.myEnrolledCourses(),
          courseApi.userCourses().catch(() => null),
        ]);

        const publicCoursesFromApi = publicRes?.data?.map(mapApiCourseToCourse) ?? [];

        const allSources = [...publicCoursesFromApi, ...loadCachedPublicCourses()];

        const list: ProfileEnrolledCourse[] = (myCoursesRes.data ?? []).map((item) => {
          const courseId = resolveCourseId(item.course);
          const fromPublicApi = publicCoursesFromApi.find((c) => c.id === courseId || c.slug === courseId);
          const fromLocal = allSources.find((c) => c.id === courseId || c.slug === courseId);

          return {
            enrollmentId: item.id,
            courseId,
            progress: Math.max(0, Math.min(100, Number(item.progress) || 0)),
            status: item.status,
            title: fromPublicApi?.title ?? fromLocal?.title ?? 'Untitled course',
            instructor: fromPublicApi?.instructor ?? fromLocal?.instructor ?? 'Digital Academy',
            image: fromPublicApi?.image ?? fromLocal?.image ?? 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1080&q=80',
            totalLectures: (fromPublicApi ?? fromLocal)?.curriculum?.reduce((s, sec) => s + sec.lectures, 0) ?? 0,
          };
        });

        setEnrolledCourses(list);
      } catch {
        setEnrolledCourses([]);
      } finally {
        setLoadingEnrolledCourses(false);
      }
    };

    loadMyCourses();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onProfileSave = async (data: ProfileForm) => {
    await new Promise(r => setTimeout(r, 400));
    updateUser({ ...data, avatar: avatarPreview });
    toast.success('Profile updated successfully!');
  };

  const onPasswordSave = async (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (data.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!apiAvailable) { toast.info('Password change requires a live backend connection.'); return; }
    try {
      await authApi.changePassword({ old_password: data.currentPassword, new_password: data.newPassword });
      toast.success('Password changed successfully!');
      passwordForm.reset();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password');
    }
  };

  const handleUsernameBlur = async () => {
    const trimmed = usernameValue.trim();
    const error = validateUsername(trimmed);
    if (error) { setUsernameError(error); return; }
    setUsernameError(null);
    if (trimmed === usernameInitial) return; // unchanged

    setUsernameSaving(true);
    try {
      await authApi.updateProfile({ username: trimmed });
      setUsernameInitial(trimmed);
      toast.success('Username updated!');
      await refreshGamification();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update username');
      setUsernameValue(usernameInitial); // revert on failure
      setUsernameError(err instanceof Error ? err.message : 'Failed to update username');
    } finally {
      setUsernameSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
    { id: 'courses', label: 'My Courses', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments', icon: <Receipt className="w-4 h-4" /> },
    { id: 'credentials', label: 'Credentials', icon: <Award className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 dark:bg-slate-950 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 dark:text-slate-100">My Account</h1>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" loading="lazy" decoding="async" width={80} height={80} className="w-full h-full object-cover" />
                : user?.name?.charAt(0).toUpperCase()}
            </div>
            <p className="font-semibold mt-2 text-center dark:text-slate-100">{user?.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 ${user?.role === 'instructor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {user?.role}
            </span>
            {user?.role === 'student' && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{enrolledCourses.length} course{enrolledCourses.length !== 1 ? 's' : ''} enrolled</p>
            )}
          </div>
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-purple-50 text-purple-700 dark:bg-slate-800 dark:text-purple-400' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </nav>

          {/* Gamification nav links */}
          <div className="mt-6 border-t border-gray-100 dark:border-slate-800 pt-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 px-4 pb-1">Gamification</p>
            <Link
              to="/leaderboard"
              aria-label="Go to Leaderboard"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-colors"
            >
              <Trophy className="w-4 h-4 flex-shrink-0 text-yellow-500" />
              <span className="flex-1">Leaderboard</span>
              {leaderboardPosition !== null && (
                <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700 rounded-full px-2 py-0.5 font-semibold">
                  #{leaderboardPosition}
                </span>
              )}
            </Link>
            <Link
              to="/profile/quiz-history"
              aria-label="Go to Quiz history"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-colors"
            >
              <ClipboardList className="w-4 h-4 flex-shrink-0 text-purple-500" />
              <span>Quiz history</span>
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">

          {/* COIN CARD + TIER BADGE — always visible regardless of tab */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Coin card */}
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
                  <Coins className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Coins</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 leading-tight">{coin}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Earned by passing quizzes on first attempt.</p>
                </div>
              </CardContent>
            </Card>

            {/* Tier badge */}
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Tier</p>
                  {tier ? (
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <TierChip tier={tier} />
                      {leaderboardPosition !== null && (
                        <span className="text-xs text-gray-500 dark:text-slate-400">Position #{leaderboardPosition}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Unranked — complete a quiz this week.</p>
                  )}
                  {tier && (
                    <Link
                      to="/leaderboard"
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline mt-1 inline-block"
                    >
                      View leaderboard
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MY PROFILE TAB */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 mb-6 pb-6 border-b">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                    {avatarPreview
                      ? <img src={avatarPreview} alt="avatar" loading="lazy" decoding="async" width={96} height={96} className="w-full h-full object-cover" />
                      : user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium mb-1 dark:text-slate-100">Profile Photo</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">JPG, PNG up to 5MB</p>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Camera className="w-4 h-4 mr-2" /> Upload Photo
                    </Button>
                  </div>
                </div>
                <form onSubmit={profileForm.handleSubmit(onProfileSave)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input {...profileForm.register('name', { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input type="email" {...profileForm.register('email', { required: true })} />
                    </div>
                  </div>

                  {/* Username field */}
                  <div className="space-y-2">
                    <Label htmlFor="username-input">Username</Label>
                    {loadingProfile ? (
                      <Skeleton className="h-9 w-full rounded-md" />
                    ) : (
                      <Input
                        id="username-input"
                        value={usernameValue}
                        disabled={usernameSaving}
                        placeholder="e.g. john_doe"
                        onChange={e => {
                          setUsernameValue(e.target.value);
                          setUsernameError(null);
                        }}
                        onBlur={handleUsernameBlur}
                        aria-describedby={usernameError ? 'username-error' : undefined}
                        aria-invalid={usernameError ? true : undefined}
                        className={usernameError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                    )}
                    {usernameError && (
                      <p id="username-error" className="text-sm text-red-500">{usernameError}</p>
                    )}
                    {!loadingProfile && remoteProfile && !usernameError && (
                      <p className="text-xs text-gray-400 dark:text-slate-500">Shown on the leaderboard. Letters, digits, and underscores only.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <textarea {...profileForm.register('bio')} rows={4}
                      className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      placeholder="Tell students about yourself..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <div className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border dark:border-slate-700 rounded-md text-sm text-gray-600 dark:text-slate-300 capitalize">{user?.role}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Member Since</Label>
                      <div className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border dark:border-slate-700 rounded-md text-sm text-gray-600 dark:text-slate-300">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={profileForm.formState.isSubmitting}>
                    {profileForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* MY COURSES TAB */}
          {activeTab === 'courses' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">My Courses ({enrolledCourses.length})</h2>
                <Link to="/courses">
                  <Button size="sm" variant="outline">Browse More Courses</Button>
                </Link>
              </div>
              {loadingEnrolledCourses ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex gap-4 p-4 border rounded-xl">
                      <Skeleton className="w-28 h-[72px] rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-2 w-full rounded-full" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : enrolledCourses.length === 0 ? (
                <div className="bg-gray-50 dark:bg-slate-900 rounded-xl">
                  <EmptyState
                    icon={<BookOpen className="w-16 h-16" />}
                    title="You haven't enrolled in anything yet."
                    action={{ label: 'Browse courses', to: '/courses' }}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {enrolledCourses.map(course => {
                    const pct = course.progress;
                    const total = course.totalLectures;
                    const completed = total > 0 ? Math.round((pct / 100) * total) : 0;
                    return (
                      <Card key={course.enrollmentId}>
                        <CardContent className="p-4 flex gap-4">
                          <img src={course.image} alt={course.title} loading="lazy" decoding="async" width={112} height={72} className="w-28 object-cover rounded-lg flex-shrink-0" style={{ height: '72px' }} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold line-clamp-1">{course.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">{course.instructor}</p>
                            <div className="bg-gray-200 dark:bg-slate-700 rounded-full h-2 w-full mb-1">
                              <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {pct}% complete{total > 0 ? ` · ${completed}/${total} lectures` : ''}
                            </p>
                          </div>
                          <div className="flex-shrink-0 flex flex-col gap-2">
                            <Link to={`/learn/${course.enrollmentId}`}>
                              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 w-full">
                                <Play className="w-3 h-3 mr-1" />
                                {pct > 0 ? 'Continue' : 'Start'}
                              </Button>
                            </Link>
                            {pct === 100 && (
                              <Link to={`/certificate/${course.enrollmentId}`}>
                                <Button size="sm" variant="outline" className="w-full text-xs border-green-500 text-green-700 hover:bg-green-50">
                                  <Award className="w-3 h-3 mr-1" />
                                  Certificate
                                </Button>
                              </Link>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'payments' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Payment History</h2>
              {transactions.length === 0 ? (
                <div className="bg-gray-50 dark:bg-slate-900 rounded-xl">
                  <EmptyState
                    icon={<Receipt className="w-16 h-16" />}
                    title="No purchases yet."
                  />
                </div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-slate-300">Date</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-slate-300">Course</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-slate-300">Amount</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-slate-300">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map(tx => (
                            <tr key={tx.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                              <td className="px-4 py-3 text-gray-600 dark:text-slate-400 whitespace-nowrap">
                                {new Date(tx.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </td>
                              <td className="px-4 py-3 max-w-xs">
                                <p className="truncate font-medium">{tx.courseTitle}</p>
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-800 dark:text-slate-200">${tx.amount.toFixed(2)}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  tx.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>{tx.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-3 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-slate-400">Total spent</span>
                      <span className="font-bold text-gray-800 dark:text-slate-200">
                        ${transactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* CREDENTIALS TAB */}
          {activeTab === 'credentials' && (
            <div>
              <h2 className="text-xl font-bold mb-2 dark:text-slate-100">Credentials & Certificates</h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">Complete a course to earn a certificate of completion.</p>

              {loadingEnrolledCourses ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-xl">
                      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : enrolledCourses.length === 0 ? (
                <div className="bg-gray-50 dark:bg-slate-900 rounded-xl">
                  <EmptyState
                    icon={<Award className="w-16 h-16" />}
                    title="Finish a course to earn your first certificate."
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {enrolledCourses.map(course => {
                    const pct = course.progress;
                    const isCompleted = pct === 100;
                    return (
                      <Card key={course.enrollmentId} className={isCompleted ? 'border-green-200 bg-green-50/30' : ''}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                            <Award className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold line-clamp-1">{course.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">{course.instructor}</p>
                            {!isCompleted && (
                              <div className="mt-2">
                                <div className="bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 w-full mb-1">
                                  <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-xs text-gray-400 dark:text-slate-500">{pct}% complete — keep going!</p>
                              </div>
                            )}
                            {isCompleted && (
                              <p className="text-xs text-green-600 font-medium mt-1">Course completed</p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {isCompleted ? (
                              <Link to={`/certificate/${course.enrollmentId}`}>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                  <Award className="w-3 h-3 mr-1" /> View Certificate
                                </Button>
                              </Link>
                            ) : (
                              <Link to={`/learn/${course.enrollmentId}`}>
                                <Button size="sm" variant="outline">
                                  <Play className="w-3 h-3 mr-1" /> Continue
                                </Button>
                              </Link>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                {!apiAvailable && (
                  <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-700 rounded px-3 py-2 mt-2">
                    Password change requires a live backend connection. Running in offline/demo mode.
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSave)} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <div className="relative">
                      <Input type={showCurrentPw ? 'text' : 'password'} {...passwordForm.register('currentPassword', { required: true })} className="pr-10" />
                      <button type="button" onClick={() => setShowCurrentPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <div className="relative">
                      <Input type={showNewPw ? 'text' : 'password'}
                        {...passwordForm.register('newPassword', { required: true, minLength: { value: 8, message: 'Minimum 8 characters' } })}
                        className="pr-10" />
                      <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-sm text-red-500">{passwordForm.formState.errors.newPassword.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <Input type="password" {...passwordForm.register('confirmPassword', { required: true })} />
                  </div>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={passwordForm.formState.isSubmitting}>
                    {passwordForm.formState.isSubmitting ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {[
                    { key: 'courseUpdates', label: 'Course Updates', desc: 'Get notified when courses you\'re enrolled in are updated' },
                    { key: 'enrollments', label: 'New Enrollments', desc: 'Notifications when students enroll in your courses (instructors)' },
                    { key: 'promotional', label: 'Promotions & Offers', desc: 'Receive emails about deals, discounts, and new courses' },
                    { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'A weekly summary of your learning progress and recommendations' },
                  ].map(item => (
                    <div key={item.key} className="flex items-start justify-between gap-4 pb-5 border-b last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium text-sm dark:text-slate-100">{item.label}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input type="checkbox" className="sr-only peer"
                          checked={notifPrefs[item.key as keyof typeof notifPrefs]}
                          onChange={e => setNotifPrefs(p => ({ ...p, [item.key]: e.target.checked }))} />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-checked:bg-purple-600 rounded-full peer transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                      </label>
                    </div>
                  ))}
                </div>
                <Button className="mt-6 bg-purple-600 hover:bg-purple-700" onClick={() => toast.success('Notification preferences saved!')}>
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
