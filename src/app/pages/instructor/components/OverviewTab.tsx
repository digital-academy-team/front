import { UserCourseItem } from '@/app/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, Star, TrendingUp } from 'lucide-react';
import { mockChartData } from '@/app/utils/instructorDashboard';

interface OverviewTabProps {
  courses: UserCourseItem[];
  loading?: boolean;
}

export function OverviewTab({ courses, loading = false }: OverviewTabProps) {
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i}>
              <CardContent className="p-6 flex items-center gap-4">
                <Skeleton className="w-9 h-9 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="w-16 h-16" />}
        title="Create your first course."
      />
    );
  }

  const totalCourses = courses.length;
  const totalBasePrice = courses.reduce((sum, course) => sum + Number(course.base_price || 0), 0);
  const totalDiscountPrice = courses.reduce((sum, course) => sum + Number(course.discount_price || 0), 0);
  const totalDiscountValue = totalBasePrice - totalDiscountPrice;

  const stats = [
    { label: 'Total Courses', value: totalCourses.toLocaleString(), icon: <BookOpen className="w-5 h-5 text-purple-500" /> },
    { label: 'Total Base Price', value: totalBasePrice.toLocaleString(), icon: <Users className="w-5 h-5 text-blue-500" /> },
    { label: 'Total Discount Price', value: totalDiscountPrice.toLocaleString(), icon: <Star className="w-5 h-5 text-yellow-500" /> },
    { label: 'Discount Value', value: totalDiscountValue.toLocaleString(), icon: <TrendingUp className="w-5 h-5 text-green-500" /> },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">{stat.icon}</div>
              <div>
                <p className="text-2xl font-bold dark:text-slate-100">{stat.value}</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Monthly Enrollments</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={mockChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="enrollments" fill="#9333ea" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
