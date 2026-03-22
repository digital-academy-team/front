import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/app/store/AuthContext';
import { useWishlist } from '@/app/store/WishlistContext';
import { courses, Course } from '@/app/data/courses';
import { courseApi, resolveCourseId } from '@/app/services/api';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { BookOpen, Heart, Receipt, Settings, Play } from 'lucide-react';
import { CourseCard } from '@/app/components/CourseCard';
import { mapApiCourseToCourse } from '@/app/utils/courseMapper';

type Tab = 'learning' | 'wishlist' | 'history' | 'settings';

interface SettingsForm {
  name: string;
  email: string;
  bio: string;
}

interface EnrolledCourseView {
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

export default function StudentDashboard() {
  const { user, updateUser, transactions } = useAuth();
  const { courseIds, toggle } = useWishlist();
  const [activeTab, setActiveTab] = useState<Tab>('learning');
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourseView[]>([]);
  const [loadingEnrolledCourses, setLoadingEnrolledCourses] = useState(true);
  const wishlistCourses = courses.filter(c => courseIds.includes(c.id));

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

        const list: EnrolledCourseView[] = (myCoursesRes.data ?? []).map((item) => {
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

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<SettingsForm>({
    defaultValues: { name: user?.name || '', email: user?.email || '', bio: user?.bio || '' }
  });

  const onSettingsSave = async (data: SettingsForm) => {
    await new Promise(r => setTimeout(r, 500));
    updateUser(data);
    toast.success('Profile updated!');
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'learning', label: 'My Learning', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'wishlist', label: 'Wishlist', icon: <Heart className="w-4 h-4" /> },
    { id: 'history', label: 'Purchase History', icon: <Receipt className="w-4 h-4" /> },
    { id: 'settings', label: 'Account Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
        <p className="text-gray-600">Continue your learning journey</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-3">
          {activeTab === 'learning' && (
            <div>
              <h2 className="text-xl font-bold mb-4">My Learning ({enrolledCourses.length})</h2>
              {loadingEnrolledCourses ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500">Loading my courses...</div>
              ) : enrolledCourses.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                  <p className="text-gray-600 mb-4">Start learning by enrolling in a course</p>
                  <Link to="/courses"><Button className="bg-purple-600 hover:bg-purple-700">Browse Courses</Button></Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {enrolledCourses.map(course => (
                    <Card key={course.enrollmentId}>
                      <CardContent className="p-4 flex gap-4">
                        <img src={course.image} alt={course.title} className="w-24 h-16 object-cover rounded-lg flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold line-clamp-1">{course.title}</h3>
                          <p className="text-sm text-gray-600">{course.instructor}</p>
                          <div className="mt-2 bg-gray-200 rounded-full h-2 w-full">
                            <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${course.progress}%` }} />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {course.progress}% complete
                            {course.totalLectures > 0
                              ? ` · ${Math.round((course.progress / 100) * course.totalLectures)}/${course.totalLectures} lectures`
                              : ''}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <Link to={`/learn/${course.enrollmentId}`}>
                            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                              <Play className="w-3 h-3 mr-1" /> Continue
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Wishlist ({wishlistCourses.length})</h2>
              {wishlistCourses.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl">
                  <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Your wishlist is empty</p>
                  <Link to="/courses"><Button className="bg-purple-600 hover:bg-purple-700">Browse Courses</Button></Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wishlistCourses.map(course => (
                    <div key={course.id} className="relative">
                      <CourseCard course={course} />
                      <button
                        onClick={() => toggle(course.id)}
                        className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow hover:bg-red-50"
                      >
                        <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Purchase History</h2>
              {transactions.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl">
                  <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No purchases yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 font-semibold">Date</th>
                        <th className="text-left py-3 font-semibold">Course</th>
                        <th className="text-left py-3 font-semibold">Amount</th>
                        <th className="text-left py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(tx => (
                        <tr key={tx.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 text-gray-600">{new Date(tx.date).toLocaleDateString()}</td>
                          <td className="py-3 max-w-xs truncate">{tx.courseTitle}</td>
                          <td className="py-3 font-medium">${tx.amount.toFixed(2)}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              tx.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>{tx.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Account Settings</h2>
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit(onSettingsSave)} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input {...register('name', { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" {...register('email', { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <textarea
                        {...register('bio')}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                    <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
