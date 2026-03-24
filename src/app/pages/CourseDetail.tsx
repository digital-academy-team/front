import { useParams, Link, useNavigate, useLocation } from 'react-router';
import { courses, Course } from '../data/courses';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Star,
  Clock,
  Users,
  Globe,
  Award,
  PlayCircle,
  FileText,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/store/AuthContext';
import { courseApi, CourseCommentItem } from '@/app/services/api';
import { toast } from 'sonner';

interface CourseReviewViewModel {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAtLabel: string;
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveReviewAuthor(review: CourseCommentItem): string {
  const user = review.user;
  const fullName = user?.full_name?.trim();
  if (fullName) return fullName;
  const firstLast = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  if (firstLast) return firstLast;
  if (user?.username?.trim()) return user.username.trim();
  return 'Student';
}

function formatReviewDate(value?: string): string {
  if (!value) return 'Recently';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recently';

  const diffMs = Date.now() - parsed.getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.max(0, Math.floor(diffMs / day));

  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;

  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function mapReview(item: CourseCommentItem): CourseReviewViewModel {
  const normalizedRating = Math.max(0, Math.min(5, Math.round(toFiniteNumber(item.likes, 0))));
  return {
    id: item.id,
    author: resolveReviewAuthor(item),
    rating: normalizedRating,
    comment: item.comment?.trim() || 'No comment text.',
    createdAtLabel: formatReviewDate(item.created_at),
  };
}

function resolveDetailInstructor(detail: any, fallback?: string): string {
  return (
    detail?.instructor_name ||
    detail?.teacher_name ||
    detail?.teacher_full_name ||
    detail?.teacher?.full_name ||
    detail?.teacher?.name ||
    [detail?.teacher?.first_name, detail?.teacher?.last_name].filter(Boolean).join(' ') ||
    detail?.instructor ||
    fallback ||
    'Digital Academy'
  );
}

export function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isBuyNowOpen, setIsBuyNowOpen] = useState(false);
  const [creditNumber, setCreditNumber] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [apiCourse, setApiCourse] = useState<Course | null>(null);
  const [courseReviews, setCourseReviews] = useState<CourseReviewViewModel[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const { isAuthenticated, user, enrollInCourse } = useAuth();
  const stateCourse = (location.state as { course?: Course } | null)?.course;
  const cachedCourses = (() => {
    try {
      const raw = localStorage.getItem('da_public_courses_cache');
      if (!raw) return [] as Course[];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Course[]) : [];
    } catch {
      return [] as Course[];
    }
  })();

  const course =
    (stateCourse && (stateCourse.id === id || stateCourse.slug === id) ? stateCourse : undefined) ??
    apiCourse ??
    cachedCourses.find((c) => c.id === id || c.slug === id) ??
    courses.find((c) => c.id === id);
  const isEnrolled = !!user?.enrolledCourseIds?.includes(course?.id ?? '');

  useEffect(() => {
    let active = true;

    const loadCourseDetail = async () => {
      if (!id || stateCourse) return;

      try {
        const detail = await courseApi.publicDetail(id);
        if (!active || !detail) return;

        const seed =
          cachedCourses.find((item) => item.id === id || item.slug === id) ??
          courses.find((item) => item.id === id);

        setApiCourse({
          id: detail.id ?? seed?.id ?? id,
          slug: detail.slug ?? seed?.slug ?? id,
          title: detail.title ?? seed?.title ?? 'Untitled course',
          instructor: resolveDetailInstructor(detail, seed?.instructor),
          rating: Math.max(0, Math.min(5, toFiniteNumber(detail.avg_rating, seed?.rating ?? 0))),
          reviewCount: Math.max(0, Math.round(toFiniteNumber(detail.comments_count, seed?.reviewCount ?? 0))),
          price: detail.discount_price ?? detail.base_price ?? seed?.price ?? 0,
          originalPrice: detail.base_price ?? seed?.originalPrice,
          image: detail.cover_img ?? seed?.image ?? 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1080&q=80',
          category: seed?.category ?? 'development',
          level: seed?.level ?? 'All Levels',
          duration: seed?.duration ?? 'Self-paced',
          students: Math.max(0, Math.round(toFiniteNumber(detail.students_count, seed?.students ?? 0))),
          description: detail.desc ?? seed?.description ?? '',
          lastUpdated: seed?.lastUpdated ?? '2026',
          language: seed?.language ?? 'English',
          whatYouWillLearn: seed?.whatYouWillLearn ?? ['Course content available after enrollment'],
          requirements: seed?.requirements ?? ['Internet connection'],
          curriculum: Array.isArray(detail.units) && detail.units.length > 0
            ? detail.units.map((unit: any) => ({
                section: unit.title,
                lectures: Array.isArray(unit.lessons) ? unit.lessons.length : 0,
                duration: '--',
              }))
            : (seed?.curriculum ?? [{ section: 'Main Content', lectures: 1, duration: '--' }]),
          bestseller: seed?.bestseller,
        });
      } catch {
        if (active) {
          setApiCourse(null);
        }
      }
    };

    loadCourseDetail();

    return () => {
      active = false;
    };
  }, [id, stateCourse]);

  useEffect(() => {
    const resolvedCourseId = apiCourse?.id ?? stateCourse?.id ?? id;
    if (!resolvedCourseId || !isAuthenticated) {
      setCourseReviews([]);
      return;
    }

    let active = true;

    const loadReviews = async () => {
      try {
        const response = await courseApi.reviews(resolvedCourseId);
        if (!active) return;
        const mapped = (response.data ?? []).map(mapReview);
        setCourseReviews(mapped);
      } catch {
        if (active) setCourseReviews([]);
      }
    };

    loadReviews();

    return () => {
      active = false;
    };
  }, [apiCourse?.id, stateCourse?.id, id, isAuthenticated]);

  if (!course) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Course Not Found</h1>
        <p className="text-gray-600 mb-8">The course you're looking for doesn't exist.</p>
        <Link to="/courses">
          <Button>Browse All Courses</Button>
        </Link>
      </div>
    );
  }

  const relatedCourses = [...cachedCourses, ...courses]
    .filter((c) => c.category === course.category && c.id !== course.id)
    .slice(0, 4);

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/course/${course.slug ?? course.id}` } } });
      return;
    }

    if (isEnrolled) {
      toast.info('You are already enrolled in this course.');
      return;
    }

    setIsBuyNowOpen(true);
  };

  const handlePrimaryAction = () => {
    if (isEnrolled) {
      navigate(`/learn/${course.id}`);
      return;
    }

    handleBuyNow();
  };

  const handleConfirmBuyNow = async () => {
    const normalizedCard = creditNumber.replace(/\D/g, '');
    const normalizedCode = securityCode.replace(/\D/g, '');

    if (normalizedCard.length < 12) {
      toast.error('Enter a valid credit card number.');
      return;
    }

    if (normalizedCode.length !== 3) {
      toast.error('Enter a valid 3-digit security code.');
      return;
    }

    try {
      setIsBuyingNow(true);
      await enrollInCourse(course.id, course.title, course.price);
      setIsBuyNowOpen(false);
      setCreditNumber('');
      setSecurityCode('');
      toast.success('Enrollment successful.');
    } finally {
      setIsBuyingNow(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated || !user?.enrolledCourseIds?.includes(course.id)) {
      toast.error('Only enrolled users can leave a comment.');
      return;
    }

    const targetCourseId = apiCourse?.id ?? stateCourse?.id ?? course.id;
    if (!targetCourseId) {
      toast.error('Course id is missing.');
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      toast.error('Choose a rating from 1 to 5 stars.');
      return;
    }

    const trimmedComment = reviewComment.trim();
    if (!trimmedComment) {
      toast.error('Write your comment before submitting.');
      return;
    }

    try {
      setIsSubmittingReview(true);
      await courseApi.addReview(targetCourseId, {
        rating: reviewRating,
        comment: trimmedComment,
      });

      const updatedReviews = await courseApi.reviews(targetCourseId);
      const mapped = (updatedReviews.data ?? []).map(mapReview);
      setCourseReviews(mapped);

      const total = mapped.length;
      const average = total > 0
        ? mapped.reduce((sum, item) => sum + item.rating, 0) / total
        : course.rating;

      setApiCourse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rating: Math.max(0, Math.min(5, average)),
          reviewCount: total,
        };
      });

      toast.success('Comment submitted!');
      setReviewComment('');
      setReviewRating(0);
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to submit comment.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-10 sm:py-12">
          <div className="flex flex-col xl:flex-row gap-8">
            {/* Left Content */}
            <div className="flex-1">
              <div className="mb-4">
                <Link
                  to="/courses"
                  className="text-purple-400 hover:text-purple-300 text-sm"
                >
                  ← Back to courses
                </Link>
              </div>

              {course.bestseller && (
                <Badge className="mb-4 bg-yellow-500 text-black hover:bg-yellow-600">
                  Bestseller
                </Badge>
              )}

              <h1 className="text-3xl sm:text-4xl font-bold mb-4">{course.title}</h1>
              <p className="text-lg sm:text-xl text-gray-300 mb-6">{course.description}</p>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{course.rating.toFixed(1)}</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(course.rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-purple-300">
                    ({course.reviewCount.toLocaleString()} ratings)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4" />
                  <span>{course.students.toLocaleString()} students</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm mb-6">
                <span>Created by</span>
                <span className="text-purple-400">{course.instructor}</span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  <span>Last updated {course.lastUpdated}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span>{course.language}</span>
                </div>
              </div>
            </div>

            {/* Right Card - Desktop */}
            <div className="hidden xl:block w-96">
              <Card className="sticky top-24">
                <div className="relative aspect-video">
                  <img
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover rounded-t-lg"
                  />
                  <button className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                      <PlayCircle className="w-8 h-8 text-purple-600" />
                    </div>
                  </button>
                </div>
                <CardContent className="p-6">
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-3xl font-bold">${course.price}</span>
                      {course.originalPrice && (
                        <span className="text-lg text-gray-500 line-through">
                          ${course.originalPrice}
                        </span>
                      )}
                    </div>
                    {course.originalPrice && (
                      <Badge variant="destructive">
                        {Math.round(
                          ((course.originalPrice - course.price) / course.originalPrice) * 100
                        )}
                        % OFF
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      size="lg"
                      onClick={handlePrimaryAction}
                    >
                      {isEnrolled ? 'View Course' : 'Buy Now'}
                    </Button>
                  </div>

                  <p className="text-center text-sm text-gray-600 mb-4">
                    30-Day Money-Back Guarantee
                  </p>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{course.duration} on-demand video</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>
                        {course.curriculum.reduce((acc, curr) => acc + curr.lectures, 0)} lectures
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      <span>Certificate of completion</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Full lifetime access</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isBuyNowOpen} onOpenChange={setIsBuyNowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy Now</DialogTitle>
            <DialogDescription>
              Enter your credit card number and 3-digit security code to complete enrollment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credit-number">Credit Number</Label>
              <Input
                id="credit-number"
                inputMode="numeric"
                placeholder="1234 5678 9012 3456"
                value={creditNumber}
                onChange={(e) => setCreditNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="security-code">3-digit Security Code</Label>
              <Input
                id="security-code"
                inputMode="numeric"
                maxLength={3}
                placeholder="123"
                value={securityCode}
                onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBuyNowOpen(false)} disabled={isBuyingNow}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBuyNow} disabled={isBuyingNow}>
              {isBuyingNow ? 'Processing...' : 'Confirm Enrollment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile CTA */}
      <div className="lg:hidden sticky bottom-0 bg-white border-t p-4 shadow-lg z-40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">${course.price}</span>
              {course.originalPrice && (
                <span className="text-sm text-gray-500 line-through">
                  ${course.originalPrice}
                </span>
              )}
            </div>
          </div>
          <Button
            className="bg-purple-600 hover:bg-purple-700"
            onClick={handlePrimaryAction}
          >
            {isEnrolled ? 'View Course' : 'Buy Now'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-12">
        <div className="max-w-4xl">
          <section className="rounded-3xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/40 p-5 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-semibold tracking-wider uppercase text-purple-600 mb-1">
                  Community feedback
                </p>
                <h2 className="text-3xl font-bold text-gray-900">Comments</h2>
              </div>
              <div className="inline-flex items-center gap-3 rounded-2xl bg-white px-4 py-3 border border-purple-100">
                <div className="text-3xl font-bold leading-none text-gray-900">{course.rating.toFixed(1)}</div>
                <div>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(course.rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{course.reviewCount.toLocaleString()} comments</p>
                </div>
              </div>
            </div>

            {isAuthenticated && user?.enrolledCourseIds?.includes(course.id) && (
              <Card className="mb-7 border-purple-100">
                <CardContent className="p-5 md:p-6">
                  <h3 className="font-semibold text-lg mb-3">Write a Comment</h3>
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" onClick={() => setReviewRating(star)}>
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full border border-purple-100 bg-white rounded-xl p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-purple-200"
                    placeholder="Write your thoughts about this course..."
                  />
                  <Button
                    size="sm"
                    className="mt-3 bg-purple-600 hover:bg-purple-700"
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview}
                  >
                    {isSubmittingReview ? 'Submitting...' : 'Submit Comment'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isAuthenticated || !user?.enrolledCourseIds?.includes(course.id) ? (
              <Card className="mb-7 border-dashed border-purple-200 bg-white/90">
                <CardContent className="p-5 text-sm text-gray-600">
                  Only enrolled users can leave a comment.
                </CardContent>
              </Card>
            ) : null}

            <div className="space-y-4">
              {courseReviews.length === 0 ? (
                <Card className="border-purple-100/80">
                  <CardContent className="p-5 text-sm text-gray-600">
                    No comments yet for this course.
                  </CardContent>
                </Card>
              ) : (
                courseReviews.map((review) => (
                  <Card key={review.id} className="border-purple-100/80 hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold shrink-0">
                          {review.author.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{review.author}</span>
                            <span className="text-xs text-gray-400">• {review.createdAtLabel}</span>
                          </div>
                          <div className="flex mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-sm leading-relaxed text-gray-700">{review.comment}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>

          {/* Related Courses */}
          {relatedCourses.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold mb-6">More Courses You Might Like</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {relatedCourses.map((relatedCourse) => (
                  <Link key={relatedCourse.id} to={`/course/${relatedCourse.slug ?? relatedCourse.id}`}>
                    <Card className="hover:shadow-lg transition-shadow">
                      <div className="flex gap-4">
                        <img
                          src={relatedCourse.image}
                          alt={relatedCourse.title}
                          className="w-32 h-32 object-cover rounded-l-lg"
                        />
                        <CardContent className="p-4 flex-1">
                          <h3 className="font-semibold mb-2 line-clamp-2">
                            {relatedCourse.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">{relatedCourse.instructor}</p>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-sm">
                              {relatedCourse.rating.toFixed(1)}
                            </span>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < Math.floor(relatedCourse.rating)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-lg font-bold">${relatedCourse.price}</span>
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
