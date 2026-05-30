import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/app/store/AuthContext';
import { usePaymentMethods, formatCardNumberInput, formatExpiryInput, normalizeCardNumber, normalizeExpiry, normalizeCvv } from '@/app/store/PaymentMethodsContext';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { User, Lock, Eye, EyeOff, Camera, BookOpen, Receipt, Award, Play, Coins, Trophy, ClipboardList, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { authApi, courseApi, resolveCourseId, type Tier, type ProfileResponse } from '@/app/services/api';
import { type Course } from '@/app/data/courses';
import { Link, useSearchParams } from 'react-router';
import { mapApiCourseToCourse } from '@/app/utils/courseMapper';
import { PaymentMethodPicker } from '@/app/components/PaymentMethodPicker';

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

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'courses' | 'payments' | 'credentials' | 'security';

interface ProfileForm { name: string; email: string; bio: string; }
interface PasswordForm { currentPassword: string; newPassword: string; confirmPassword: string; }
interface PaymentMethodForm {
  nickname: string;
  holderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

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
  const { methods: paymentMethods, selectedMethodId, selectMethod, addMethod, removeMethod } = usePaymentMethods();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'profile';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatar || '');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<ProfileEnrolledCourse[]>([]);
  const [loadingEnrolledCourses, setLoadingEnrolledCourses] = useState(true);

  // Profile metadata state
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [remoteProfile, setRemoteProfile] = useState<ProfileResponse | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const profileForm = useForm<ProfileForm>({ defaultValues: { name: user?.name || '', email: user?.email || '', bio: user?.bio || '' } });
  const passwordForm = useForm<PasswordForm>();
  const paymentForm = useForm<PaymentMethodForm>({
    defaultValues: { nickname: '', holderName: '', cardNumber: '', expiry: '', cvv: '' },
  });

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

  // Fetch remote profile metadata once on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingProfile(true);
    authApi.getProfile().then((profile) => {
      if (cancelled) return;
      setRemoteProfile(profile);
    }).catch(() => {
      // Non-critical — profile metadata may still be unavailable during auth transitions.
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
        const localEnrolledIds = user?.enrolledCourseIds ?? [];

        const apiList: ProfileEnrolledCourse[] = await Promise.all((myCoursesRes.data ?? []).map(async (item) => {
          const courseId = resolveCourseId(item.course);
          const fromPublicApi = publicCoursesFromApi.find((c) => c.id === courseId || c.slug === courseId);
          const fromLocal = allSources.find((c) => c.id === courseId || c.slug === courseId);
          const detail = await courseApi.myEnrolledCourseDetail(item.id).catch(() => null);
          const detailData = detail?.data ?? null;
          const detailLessons = detailData?.course?.units?.flatMap((unit) => unit.lessons ?? []) ?? [];
          const detailTotalLectures = detailLessons.length;
          const publicTotalLectures = (fromPublicApi ?? fromLocal)?.curriculum?.reduce((s, sec) => s + sec.lectures, 0) ?? 0;
          const totalLectures = detailTotalLectures || publicTotalLectures;
          const completedLectures = Array.isArray(detailData?.completed_lectures)
            ? detailData.completed_lectures
            : Array.isArray(item.completed_lectures)
              ? item.completed_lectures
              : [];
          const validLessonIds = new Set(detailLessons.map((lesson) => String(lesson.id)).filter(Boolean));
          const completedCount = validLessonIds.size > 0
            ? new Set(completedLectures.map(String).filter((lessonId) => validLessonIds.has(lessonId))).size
            : completedLectures.length;
          const completedPercent = totalLectures
            ? Math.round((completedCount / totalLectures) * 100)
            : 0;
          const serverProgress = Math.max(0, Math.min(100, Number(detailData?.progress ?? item.progress) || 0));
          const progress = completedLectures.length > 0
            ? Math.max(0, Math.min(100, completedPercent))
            : serverProgress;
          const status = progress >= 100 ? 'COMPLETED' : (detailData?.status ?? item.status);

          return {
            enrollmentId: item.id,
            courseId,
            progress,
            status,
            title: fromPublicApi?.title ?? fromLocal?.title ?? 'Untitled course',
            instructor: fromPublicApi?.instructor ?? fromLocal?.instructor ?? 'Digital Academy',
            image: fromPublicApi?.image ?? fromLocal?.image ?? 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1080&q=80',
            totalLectures,
          };
        }));

        const fallbackList: ProfileEnrolledCourse[] = apiList.length > 0 || localEnrolledIds.length === 0
          ? apiList
          : localEnrolledIds.map((courseId) => {
              const fromPublicApi = publicCoursesFromApi.find((c) => c.id === courseId || c.slug === courseId);
              const fromLocal = allSources.find((c) => c.id === courseId || c.slug === courseId);
              const storedProgress = (() => {
                try {
                  const raw = localStorage.getItem(`progress_${courseId}`);
                  if (!raw) return 0;
                  const parsed = JSON.parse(raw) as { completedLectures?: string[] };
                  const total = (fromPublicApi ?? fromLocal)?.curriculum?.reduce((s, sec) => s + sec.lectures, 0) ?? 0;
                  if (!total) return 0;
                  return Math.min(100, Math.max(0, Math.round(((parsed.completedLectures?.length ?? 0) / total) * 100)));
                } catch {
                  return 0;
                }
              })();

              return {
                enrollmentId: courseId,
                courseId,
                progress: storedProgress,
                status: storedProgress >= 100 ? 'COMPLETED' : 'ENROLLED',
                title: fromPublicApi?.title ?? fromLocal?.title ?? 'Untitled course',
                instructor: fromPublicApi?.instructor ?? fromLocal?.instructor ?? 'Digital Academy',
                image: fromPublicApi?.image ?? fromLocal?.image ?? 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1080&q=80',
                totalLectures: (fromPublicApi ?? fromLocal)?.curriculum?.reduce((s, sec) => s + sec.lectures, 0) ?? 0,
              };
            });

        setEnrolledCourses(fallbackList);
      } catch {
        const localEnrolledIds = user?.enrolledCourseIds ?? [];
        setEnrolledCourses(localEnrolledIds.map((courseId) => {
          const storedProgress = (() => {
            try {
              const raw = localStorage.getItem(`progress_${courseId}`);
              if (!raw) return 0;
              const parsed = JSON.parse(raw) as { completedLectures?: string[] };
              return Math.min(100, Math.max(0, (parsed.completedLectures?.length ?? 0) * 10));
            } catch {
              return 0;
            }
          })();

          return {
            enrollmentId: courseId,
            courseId,
            progress: storedProgress,
            status: storedProgress >= 100 ? 'COMPLETED' : 'ENROLLED',
            title: 'Untitled course',
            instructor: 'Digital Academy',
            image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1080&q=80',
            totalLectures: 0,
          };
        }));
      } finally {
        setLoadingEnrolledCourses(false);
      }
    };

    loadMyCourses();
  }, [user?.enrolledCourseIds]);

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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
    { id: 'courses', label: 'My Courses', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments', icon: <Receipt className="w-4 h-4" /> },
    { id: 'credentials', label: 'Credentials', icon: <Award className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
  ];

  const onPaymentMethodSave = (data: PaymentMethodForm) => {
    addMethod(data);
    paymentForm.reset();
    setShowPaymentForm(false);
    toast.success('Payment method saved!');
  };

  const sidebarWidthClass = sidebarCollapsed ? 'lg:w-20' : 'lg:w-80';
  const sidebarButtonClass = sidebarCollapsed
    ? 'justify-center px-3'
    : 'justify-start px-4';
  const sidebarLabelClass = sidebarCollapsed ? 'lg:hidden' : 'lg:inline';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full px-0 py-0">
        <div className="flex items-start">
          {/* Sidebar */}
          <aside className={`sticky top-0 h-screen shrink-0 border-r border-gray-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[8px_0_40px_rgba(15,23,42,0.05)] ${sidebarWidthClass}`}>
            <div className={`h-full flex flex-col p-4 ${sidebarCollapsed ? 'items-center' : ''}`}>
              <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : 'justify-between'} mb-4`}>
                {!sidebarCollapsed && <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-slate-500">Account</p>}
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((prev) => !prev)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 dark:border-slate-800 dark:text-slate-400 dark:hover:border-purple-700 dark:hover:bg-purple-900/20 dark:hover:text-purple-300"
                  aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
              </div>

              {sidebarCollapsed ? (
                <div className="w-full flex justify-center py-2 mb-2">
                  <div className="w-10 h-10 rounded-2xl overflow-hidden bg-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm shadow-purple-600/20 ring-1 ring-purple-500/20">
                    {avatarPreview
                      ? <img src={avatarPreview} alt="avatar" loading="lazy" decoding="async" width={40} height={40} className="w-full h-full object-cover" />
                      : user?.name?.charAt(0).toUpperCase()}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-gray-200/80 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 p-4 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-purple-600 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-lg shadow-purple-600/20">
                      {avatarPreview
                        ? <img src={avatarPreview} alt="avatar" loading="lazy" decoding="async" width={64} height={64} className="w-full h-full object-cover" />
                        : user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">{user?.name}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400 capitalize">{user?.role}</p>
                      {user?.role === 'student' && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{enrolledCourses.length} course{enrolledCourses.length !== 1 ? 's' : ''} enrolled</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <nav className={`mt-6 space-y-2 ${sidebarCollapsed ? 'w-full' : ''}`}>
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    title={sidebarCollapsed ? tab.label : undefined}
                    aria-label={tab.label}
                    className={`group flex h-14 w-full items-center gap-3 rounded-2xl border text-sm font-medium transition-all ${sidebarButtonClass} ${activeTab === tab.id ? 'border-purple-200 bg-purple-50 text-purple-700 shadow-sm dark:border-purple-900/60 dark:bg-purple-900/20 dark:text-purple-300' : 'border-transparent text-gray-700 hover:border-gray-200 hover:bg-gray-50 dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-900/80'}`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${activeTab === tab.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-white dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-900'}`}>
                      {tab.icon}
                    </span>
                    <span className={`${sidebarLabelClass} truncate`}>{tab.label}</span>
                  </button>
                ))}
              </nav>

              <div className={`mt-6 border-t border-gray-200/80 dark:border-slate-800 pt-4 space-y-2 ${sidebarCollapsed ? 'w-full' : ''}`}>
                {!sidebarCollapsed && (
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-slate-500 px-1 pb-1">Gamification</p>
                )}
                <Link
                  to="/leaderboard"
                  aria-label="Go to Leaderboard"
                  title={sidebarCollapsed ? 'Leaderboard' : undefined}
                  className={`flex h-14 items-center gap-3 rounded-2xl border border-transparent px-4 text-sm font-medium text-gray-700 transition-colors hover:border-gray-200 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-900/80 ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <Trophy className="w-4 h-4 flex-shrink-0 text-yellow-500" />
                  <span className={`${sidebarLabelClass} flex-1`}>Leaderboard</span>
                  {!sidebarCollapsed && leaderboardPosition !== null && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700 rounded-full px-2 py-0.5 font-semibold">
                      #{leaderboardPosition}
                    </span>
                  )}
                </Link>
                <Link
                  to="/profile/quiz-history"
                  aria-label="Go to Quiz history"
                  title={sidebarCollapsed ? 'Quiz history' : undefined}
                  className={`flex h-14 items-center gap-3 rounded-2xl border border-transparent px-4 text-sm font-medium text-gray-700 transition-colors hover:border-gray-200 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-900/80 ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <ClipboardList className="w-4 h-4 flex-shrink-0 text-purple-500" />
                  <span className={sidebarLabelClass}>Quiz history</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0 px-6 py-8 lg:px-8">
            <div className="max-w-6xl space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-slate-100">My Account</h1>
              </div>

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

                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <textarea {...profileForm.register('bio')} rows={4}
                      className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      placeholder="Tell students about yourself..." />
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
                            <Link to={`/learn/${course.courseId}`} state={{ returnTo: '/profile?tab=courses' }}>
                              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 w-full">
                                <Play className="w-3 h-3 mr-1" />
                                {pct > 0 ? 'Continue' : 'Start'}
                              </Button>
                            </Link>
                            {pct === 100 && (
                              <Link to={`/certificate/${course.courseId}`}>
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
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Cards</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Add debit cards once and use them at checkout.</p>
                  </div>
                  <Button
                    type="button"
                    variant={showPaymentForm ? 'outline' : 'default'}
                    className={showPaymentForm ? '' : 'bg-purple-600 hover:bg-purple-700'}
                    onClick={() => setShowPaymentForm((prev) => !prev)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add debit card
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {showPaymentForm && (
                    <form onSubmit={paymentForm.handleSubmit(onPaymentMethodSave)} className="grid grid-cols-1 md:grid-cols-2 gap-4" noValidate>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="payment-nickname">Card name</Label>
                        <Input
                          id="payment-nickname"
                          placeholder="My Visa card"
                          aria-invalid={paymentForm.formState.errors.nickname ? 'true' : 'false'}
                          aria-describedby={paymentForm.formState.errors.nickname ? 'payment-nickname-error' : undefined}
                          {...paymentForm.register('nickname', { required: 'Card name is required' })}
                        />
                        {paymentForm.formState.errors.nickname && (
                          <p id="payment-nickname-error" className="text-sm text-red-500" role="alert">
                            {paymentForm.formState.errors.nickname.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="payment-holder">Cardholder full name</Label>
                        <Input
                          id="payment-holder"
                          placeholder="John Doe"
                          aria-invalid={paymentForm.formState.errors.holderName ? 'true' : 'false'}
                          aria-describedby={paymentForm.formState.errors.holderName ? 'payment-holder-error' : undefined}
                          {...paymentForm.register('holderName', { required: 'Cardholder name is required' })}
                        />
                        {paymentForm.formState.errors.holderName && (
                          <p id="payment-holder-error" className="text-sm text-red-500" role="alert">
                            {paymentForm.formState.errors.holderName.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="payment-card-number">Card number</Label>
                        <Input
                          id="payment-card-number"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="1234 5678 9012 3456"
                          aria-invalid={paymentForm.formState.errors.cardNumber ? 'true' : 'false'}
                          aria-describedby={paymentForm.formState.errors.cardNumber ? 'payment-card-number-error' : undefined}
                          {...paymentForm.register('cardNumber', {
                            required: 'Card number is required',
                            onChange: (event) => {
                              event.target.value = formatCardNumberInput(event.target.value);
                            },
                            validate: (value) => normalizeCardNumber(value).length === 16 || 'Enter a valid 16-digit card number',
                          })}
                          maxLength={19}
                        />
                        {paymentForm.formState.errors.cardNumber && (
                          <p id="payment-card-number-error" className="text-sm text-red-500" role="alert">
                            {paymentForm.formState.errors.cardNumber.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payment-expiry">Validity date</Label>
                        <Input
                          id="payment-expiry"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="MM/YY"
                          aria-invalid={paymentForm.formState.errors.expiry ? 'true' : 'false'}
                          aria-describedby={paymentForm.formState.errors.expiry ? 'payment-expiry-error' : undefined}
                          {...paymentForm.register('expiry', {
                            required: 'Expiry is required',
                            onChange: (event) => {
                              event.target.value = formatExpiryInput(event.target.value);
                            },
                            validate: (value) => {
                              const digits = normalizeExpiry(value);
                              return (/^(0[1-9]|1[0-2])$/.test(digits.slice(0, 2)) && digits.length === 4) || 'Use MM/YY format';
                            },
                          })}
                          maxLength={5}
                        />
                        {paymentForm.formState.errors.expiry && (
                          <p id="payment-expiry-error" className="text-sm text-red-500" role="alert">
                            {paymentForm.formState.errors.expiry.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payment-cvv">CVV</Label>
                        <Input
                          id="payment-cvv"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={3}
                          placeholder="123"
                          aria-invalid={paymentForm.formState.errors.cvv ? 'true' : 'false'}
                          aria-describedby={paymentForm.formState.errors.cvv ? 'payment-cvv-error' : undefined}
                          {...paymentForm.register('cvv', {
                            required: 'CVV is required',
                            onChange: (event) => {
                              event.target.value = normalizeCvv(event.target.value);
                            },
                            validate: (value) => normalizeCvv(value).length === 3 || 'Enter a valid 3-digit CVV',
                          })}
                        />
                        {paymentForm.formState.errors.cvv && (
                          <p id="payment-cvv-error" className="text-sm text-red-500" role="alert">
                            {paymentForm.formState.errors.cvv.message}
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-2 flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => { paymentForm.reset(); setShowPaymentForm(false); }}>
                          Cancel
                        </Button>
                        <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                          Save card
                        </Button>
                      </div>
                    </form>
                  )}

                  <PaymentMethodPicker
                    methods={paymentMethods}
                    selectedMethodId={selectedMethodId}
                    onSelect={selectMethod}
                    onRemove={(id) => {
                      removeMethod(id);
                      toast.success('Payment method removed.');
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {transactions.length === 0 ? (
                    <div className="px-6 pb-6">
                      <div className="bg-gray-50 dark:bg-slate-900 rounded-xl">
                        <EmptyState
                          icon={<Receipt className="w-16 h-16" />}
                          title="No purchases yet."
                        />
                      </div>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </CardContent>
              </Card>
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
                              <Link to={`/certificate/${course.courseId}`}>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                  <Award className="w-3 h-3 mr-1" /> View Certificate
                                </Button>
                              </Link>
                            ) : (
                              <Link to={`/learn/${course.courseId}`} state={{ returnTo: '/profile?tab=credentials' }}>
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

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
