import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/app/store/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { User, Lock, Bell, Eye, EyeOff, Camera, BookOpen, Receipt, Award, Play } from 'lucide-react';
import { authApi, courseApi, resolveCourseId } from '@/app/services/api';
import { courses, Course } from '@/app/data/courses';
import { Link, useSearchParams } from 'react-router';
import { mapApiCourseToCourse } from '@/app/utils/courseMapper';

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

export default function Profile() {
  const { user, updateUser, apiAvailable, transactions } = useAuth();
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

  useEffect(() => {
    const loadMyCourses = async () => {
      setLoadingEnrolledCourses(true);
      try {
        const [myCoursesRes, publicRes] = await Promise.all([
          courseApi.myEnrolledCourses(),
          courseApi.userCourses().catch(() => null),
        ]);

        const publicCoursesFromApi = publicRes?.data?.map(mapApiCourseToCourse) ?? [];

        const cached = loadCachedPublicCourses();
        const allSources = [...courses, ...cached];

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
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
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
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Account</h1>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                : user?.name?.charAt(0).toUpperCase()}
            </div>
            <p className="font-semibold mt-2 text-center">{user?.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 ${user?.role === 'instructor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {user?.role}
            </span>
            {user?.role === 'student' && (
              <p className="text-xs text-gray-500 mt-1">{enrolledCourses.length} course{enrolledCourses.length !== 1 ? 's' : ''} enrolled</p>
            )}
          </div>
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">

          {/* MY PROFILE TAB */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 mb-6 pb-6 border-b">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                    {avatarPreview
                      ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                      : user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium mb-1">Profile Photo</p>
                    <p className="text-sm text-gray-500 mb-3">JPG, PNG up to 5MB</p>
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
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      placeholder="Tell students about yourself..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm text-gray-600 capitalize">{user?.role}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Member Since</Label>
                      <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm text-gray-600">
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
                <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500">Loading my courses...</div>
              ) : enrolledCourses.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                  <p className="text-gray-600 mb-4">Start learning by enrolling in a course</p>
                  <Link to="/courses">
                    <Button className="bg-purple-600 hover:bg-purple-700">Browse Courses</Button>
                  </Link>
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
                          <img src={course.image} alt={course.title} className="w-28 h-18 object-cover rounded-lg flex-shrink-0" style={{ height: '72px' }} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold line-clamp-1">{course.title}</h3>
                            <p className="text-sm text-gray-500 mb-2">{course.instructor}</p>
                            <div className="bg-gray-200 rounded-full h-2 w-full mb-1">
                              <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-xs text-gray-500">
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
                <div className="text-center py-16 bg-gray-50 rounded-xl">
                  <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No purchases yet</h3>
                  <p className="text-gray-600 mb-4">Your payment history will appear here</p>
                  <Link to="/courses">
                    <Button className="bg-purple-600 hover:bg-purple-700">Browse Courses</Button>
                  </Link>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Course</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Amount</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map(tx => (
                            <tr key={tx.id} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                {new Date(tx.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </td>
                              <td className="px-4 py-3 max-w-xs">
                                <p className="truncate font-medium">{tx.courseTitle}</p>
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-800">${tx.amount.toFixed(2)}</td>
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
                    <div className="px-4 py-3 border-t bg-gray-50 flex justify-between text-sm">
                      <span className="text-gray-600">Total spent</span>
                      <span className="font-bold text-gray-800">
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
              <h2 className="text-xl font-bold mb-2">Credentials & Certificates</h2>
              <p className="text-gray-500 text-sm mb-6">Complete a course to earn a certificate of completion.</p>

              {loadingEnrolledCourses ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500">Loading credentials...</div>
              ) : enrolledCourses.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl">
                  <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No credentials yet</h3>
                  <p className="text-gray-600 mb-4">Enroll in and complete a course to earn certificates</p>
                  <Link to="/courses">
                    <Button className="bg-purple-600 hover:bg-purple-700">Browse Courses</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {enrolledCourses.map(course => {
                    const pct = course.progress;
                    const completed = pct === 100;
                    return (
                      <Card key={course.enrollmentId} className={completed ? 'border-green-200 bg-green-50/30' : ''}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                            <Award className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold line-clamp-1">{course.title}</h3>
                            <p className="text-sm text-gray-500">{course.instructor}</p>
                            {!completed && (
                              <div className="mt-2">
                                <div className="bg-gray-200 rounded-full h-1.5 w-full mb-1">
                                  <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-xs text-gray-400">{pct}% complete — keep going!</p>
                              </div>
                            )}
                            {completed && (
                              <p className="text-xs text-green-600 font-medium mt-1">Course completed</p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {completed ? (
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
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-2">
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
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input type="checkbox" className="sr-only peer"
                          checked={notifPrefs[item.key as keyof typeof notifPrefs]}
                          onChange={e => setNotifPrefs(p => ({ ...p, [item.key]: e.target.checked }))} />
                        <div className="w-11 h-6 bg-gray-200 peer-checked:bg-purple-600 rounded-full peer transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
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
