import { useParams, Link, useNavigate, useLocation } from 'react-router';
import { type Course } from '../data/courses';
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
import { usePaymentMethods } from '@/app/store/PaymentMethodsContext';
import { courseApi } from '@/app/services/api';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { PaymentMethodPicker } from '@/app/components/PaymentMethodPicker';

interface CourseComment {
  id: string;
  user?: string | null;
  username?: string | null;
  full_name?: string | null;
  comment?: string | null;
  likes?: number | null;
  created_at?: string | null;
  createdAt?: string | null;
  rating?: number | null;
}

function getCommentAuthor(comment: CourseComment, fallbackIndex: number) {
  return comment.username ?? comment.user ?? comment.full_name ?? `User ${fallbackIndex + 1}`;
}

function getCommentText(comment: CourseComment) {
  return comment.comment ?? '';
}

function getCommentRating(comment: CourseComment) {
  const raw = Number(comment.rating ?? comment.likes ?? 0);
  return Number.isFinite(raw) ? Math.max(0, Math.min(5, Math.round(raw))) : 0;
}

function resolveInstructorName(
  detail: {
    instructor_name?: string | null;
    teacher_name?: string | null;
    instructor?: string | null;
    full_name?: string | null;
    teacher?: { full_name?: string | null } | null;
  },
  fallback?: string | null
) {
  return detail.instructor_name ?? detail.teacher_name ?? detail.full_name ?? detail.teacher?.full_name ?? detail.instructor ?? fallback ?? 'Digital Academy';
}

function resolveNumericValue(...values: Array<string | number | null | undefined>) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

export function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isBuyNowOpen, setIsBuyNowOpen] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [apiCourse, setApiCourse] = useState<Course | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [hasDetailError, setHasDetailError] = useState(false);
  const [comments, setComments] = useState<CourseComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const { isAuthenticated, user, enrollInCourse } = useAuth();
  const { methods: paymentMethods, selectedMethodId, selectedMethod, selectMethod, removeMethod } = usePaymentMethods();
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
    apiCourse ??
    (stateCourse && (stateCourse.id === id || stateCourse.slug === id) ? stateCourse : undefined) ??
    cachedCourses.find((c) => c.id === id || c.slug === id);
  const isEnrolled = !!user?.enrolledCourseIds?.includes(course?.id ?? '');
  const commentCount = comments.length;
  const averageRating = commentCount > 0
    ? comments.reduce((sum, comment) => sum + getCommentRating(comment), 0) / commentCount
    : Number(course?.rating ?? 0);

  useEffect(() => {
    let active = true;

    const loadComments = async () => {
      if (!course?.id) return;

      setIsLoadingComments(true);
      setComments([]);
      try {
        const response = await courseApi.reviews(course.id);
        const items = Array.isArray(response) ? response : [];
        if (!active) return;
        setComments(items as CourseComment[]);
      } catch {
        if (active) setComments([]);
      } finally {
        if (active) setIsLoadingComments(false);
      }
    };

    loadComments();

    return () => {
      active = false;
    };
  }, [course?.id]);

  useEffect(() => {
    let active = true;

    const loadCourseDetail = async () => {
      if (!id) return;

      // If we have the course from route state, skip fetch but mark loading done
      if (!stateCourse) {
        if (active) setIsLoadingDetail(true);
      } else if (active) {
        setIsLoadingDetail(false);
      }
      setHasDetailError(false);

      try {
        const seed = cachedCourses.find((item) => item.id === id || item.slug === id);
        const lookupId = seed?.slug ?? id;
        const detail = await courseApi.publicDetail(lookupId);
        const publicCourses = await courseApi.userCourses().catch(() => null);
        const publicSeed = publicCourses?.data?.find((item) => item.id === id || item.slug === id) ?? null;
        if (!active || !detail) return;

        const detailRecord = detail as {
          avg_rating?: number;
          average_rating?: number;
          rating?: number;
          students_count?: number;
          students?: number;
          review_count?: number;
          reviews_count?: number;
          ratings_count?: number;
          comments_count?: number;
        };

        setApiCourse({
          id: detail.id ?? seed?.id ?? id,
          slug: detail.slug ?? seed?.slug ?? id,
          title: detail.title ?? seed?.title ?? 'Untitled course',
          instructor: resolveInstructorName(
            {
              instructor_name: detail.instructor_name,
              teacher_name: detail.teacher_name,
              instructor: detail.instructor,
              full_name: (detail as { full_name?: string | null }).full_name,
              teacher: (detail as { teacher?: { full_name?: string | null } | null }).teacher,
            },
            publicSeed?.instructor_name ?? publicSeed?.teacher_name ?? seed?.instructor
          ),
          rating: resolveNumericValue(
            publicSeed?.avg_rating,
            detailRecord.avg_rating,
            detailRecord.average_rating,
            detailRecord.rating,
            seed?.rating
          ),
          reviewCount: resolveNumericValue(
            (publicSeed as { review_count?: number; reviews_count?: number; ratings_count?: number; comments_count?: number } | null)?.review_count,
            (publicSeed as { review_count?: number; reviews_count?: number; ratings_count?: number; comments_count?: number } | null)?.reviews_count,
            (publicSeed as { review_count?: number; reviews_count?: number; ratings_count?: number; comments_count?: number } | null)?.ratings_count,
            (publicSeed as { review_count?: number; reviews_count?: number; ratings_count?: number; comments_count?: number } | null)?.comments_count,
            detailRecord.review_count,
            detailRecord.reviews_count,
            detailRecord.ratings_count,
            detailRecord.comments_count,
            seed?.reviewCount,
            comments.length
          ),
          price: detail.discount_price ?? detail.base_price ?? seed?.price ?? 0,
          originalPrice: detail.base_price ?? seed?.originalPrice,
          image: detail.cover_img ?? seed?.image ?? 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1080&q=80',
          category: seed?.category ?? 'development',
          level: seed?.level ?? 'All Levels',
          duration: seed?.duration ?? 'Self-paced',
          students: resolveNumericValue(publicSeed?.students_count, detailRecord.students_count, detailRecord.students, seed?.students),
          description: detail.desc ?? seed?.description ?? '',
          lastUpdated: seed?.lastUpdated ?? '2026',
          language: seed?.language ?? 'English',
          whatYouWillLearn: seed?.whatYouWillLearn ?? ['Course content available after enrollment'],
          requirements: seed?.requirements ?? ['Internet connection'],
          curriculum: Array.isArray(detail.units) && detail.units.length > 0
            ? detail.units.map((unit: { title: string; lessons?: unknown[] }) => ({
                section: unit.title,
                lectures: Array.isArray(unit.lessons) ? unit.lessons.length : 0,
                duration: '--',
              }))
            : (seed?.curriculum ?? [{ section: 'Main Content', lectures: 1, duration: '--' }]),
          bestseller: seed?.bestseller,
        });
      } catch {
        if (active) {
          const localCourse = cachedCourses.find((item) => item.id === id || item.slug === id) ?? stateCourse ?? null;
          if (localCourse) {
            setApiCourse((current) => current ?? localCourse);
            setHasDetailError(false);
          } else {
            setHasDetailError(true);
          }
        }
      } finally {
        if (active) setIsLoadingDetail(false);
      }
    };

    loadCourseDetail();

    return () => {
      active = false;
    };
  }, [id, stateCourse]);

  if (isLoadingDetail) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-8">
        {/* Hero skeleton */}
        <div className="bg-gray-900 rounded-2xl p-8 mb-8">
          <Skeleton className="h-4 w-32 mb-6 bg-gray-700" />
          <Skeleton className="h-8 w-3/4 mb-3 bg-gray-700" />
          <Skeleton className="h-5 w-full mb-2 bg-gray-700" />
          <Skeleton className="h-5 w-2/3 mb-6 bg-gray-700" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24 bg-gray-700" />
            <Skeleton className="h-4 w-32 bg-gray-700" />
          </div>
        </div>
        {/* Curriculum skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (hasDetailError) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-16">
        <ErrorState
          title="Couldn't load this course"
          description="There was a problem fetching the course details."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Course Not Found</h1>
        <p className="text-gray-600 dark:text-slate-400 mb-8">The course you're looking for doesn't exist.</p>
        <Link to="/courses">
          <Button>Browse All Courses</Button>
        </Link>
      </div>
    );
  }

  const relatedCourses = cachedCourses
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

  const openCourseContents = () => {
    navigate(`/learn/${course.id}`);
  };

  const handleConfirmBuyNow = async () => {
    if (!selectedMethod) {
      setIsBuyNowOpen(false);
      navigate('/profile?tab=payments');
      return;
    }

    try {
      setIsBuyingNow(true);
      await enrollInCourse(course.id, course.title, course.price);
      setIsBuyNowOpen(false);
      toast.success(`Paid with ${selectedMethod.nickname}.`);
    } finally {
      setIsBuyingNow(false);
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
                  <span className="font-bold">{averageRating.toFixed(1)}</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(averageRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-purple-300">
                    ({commentCount.toLocaleString()} ratings)
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
                    loading="eager"
                    decoding="async"
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
                    {isEnrolled ? (
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="lg"
                        onClick={openCourseContents}
                      >
                        View Course Contents
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        size="lg"
                        onClick={handleBuyNow}
                      >
                        Buy Now
                      </Button>
                    )}
                  </div>

                  <p className="text-center text-sm text-gray-600 dark:text-slate-400 mb-4">
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
              Choose one of your saved payment methods to complete enrollment.
            </DialogDescription>
          </DialogHeader>

          <PaymentMethodPicker
            methods={paymentMethods}
            selectedMethodId={selectedMethodId}
            onSelect={selectMethod}
            onRemove={(id) => {
              removeMethod(id);
              toast.success('Payment method removed.');
            }}
            emptyAction={{
              label: 'Add payment method',
              onClick: () => {
                setIsBuyNowOpen(false);
                navigate('/profile?tab=payments');
              },
            }}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBuyNowOpen(false)} disabled={isBuyingNow}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBuyNow} disabled={isBuyingNow}>
              {isBuyingNow ? 'Processing...' : selectedMethod ? 'Confirm Enrollment' : 'Add payment method'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile CTA */}
      <div className="lg:hidden sticky bottom-0 bg-white dark:bg-slate-900 border-t dark:border-slate-700 p-4 shadow-lg z-40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold dark:text-slate-100">${course.price}</span>
              {course.originalPrice && (
                <span className="text-sm text-gray-500 dark:text-slate-400 line-through">
                  ${course.originalPrice}
                </span>
              )}
            </div>
          </div>
          <Button
            className={isEnrolled ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}
            onClick={isEnrolled ? openCourseContents : handleBuyNow}
          >
            {isEnrolled ? 'View Course Contents' : 'Buy Now'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-12">
        <div className="max-w-4xl">
          <section className="rounded-3xl border border-purple-100 dark:border-slate-700 bg-gradient-to-br from-white dark:from-slate-900 to-purple-50/40 dark:to-slate-900 p-5 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-semibold tracking-wider uppercase text-purple-600 mb-1">
                  Community feedback
                </p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Comments</h2>
              </div>
              <div className="inline-flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-800 px-4 py-3 border border-purple-100 dark:border-slate-700">
                <div className="text-3xl font-bold leading-none text-gray-900 dark:text-slate-100">
                  {averageRating.toFixed(1)}
                </div>
                <div>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(averageRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{commentCount.toLocaleString()} comments</p>
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
                    className="w-full border border-purple-100 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 rounded-xl p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-purple-200"
                    placeholder="Write your thoughts about this course..."
                  />
                  <Button
                    size="sm"
                    className="mt-3 bg-purple-600 hover:bg-purple-700"
                    disabled={isSubmittingComment || reviewComment.trim().length === 0 || reviewRating === 0}
                    onClick={async () => {
                      if (!course?.id) return;

                      try {
                        setIsSubmittingComment(true);

                        const savedComment = await courseApi.addReview(course.id, {
                          rating: reviewRating,
                          comment: reviewComment.trim(),
                        });

                        toast.success('Comment submitted!');
                        setReviewComment('');
                        setReviewRating(0);

                        const updated = await courseApi.reviews(course.id);
                        if (Array.isArray(updated) && updated.length > 0) {
                          setComments(updated as CourseComment[]);
                          return;
                        }

                        if (savedComment && typeof savedComment === 'object') {
                          setComments((current) => {
                            const nextComment = savedComment as CourseComment;
                            if (!nextComment.id) return current;
                            return [nextComment, ...current.filter((comment) => comment.id !== nextComment.id)];
                          });
                        }
                      } catch {
                        toast.error('Could not submit comment.');
                      } finally {
                        setIsSubmittingComment(false);
                      }
                    }}
                  >
                    {isSubmittingComment ? 'Submitting...' : 'Submit Comment'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isAuthenticated || !user?.enrolledCourseIds?.includes(course.id) ? (
              <Card className="mb-7 border-dashed border-purple-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90">
                <CardContent className="p-5 text-sm text-gray-600 dark:text-slate-400">
                  Only enrolled users can leave a comment.
                </CardContent>
              </Card>
            ) : null}

            <div className="space-y-4">
              {isLoadingComments ? (
                <Card className="border-purple-100/80 dark:border-slate-700">
                  <CardContent className="p-5 text-sm text-gray-500 dark:text-slate-400">Loading comments...</CardContent>
                </Card>
              ) : comments.length > 0 ? (
                comments.map((review, index) => {
                  const rating = getCommentRating(review);
                  const author = getCommentAuthor(review, index);
                  const createdAt = review.created_at ?? review.createdAt ?? '';
                  const dateLabel = createdAt ? new Date(createdAt).toLocaleDateString() : 'Recently';

                  return (
                    <Card key={review.id ?? `${author}-${index}`} className="border-purple-100/80 dark:border-slate-700 hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold shrink-0">
                            {author.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900 dark:text-slate-100">{author}</span>
                              <span className="text-xs text-gray-400 dark:text-slate-500">• {dateLabel}</span>
                            </div>
                            <div className="flex mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                              ))}
                            </div>
                            <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-300">
                              {getCommentText(review) || 'No comment text provided.'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card className="border-purple-100/80 dark:border-slate-700">
                  <CardContent className="p-5 text-sm text-gray-500 dark:text-slate-400">No comments yet.</CardContent>
                </Card>
              )}
            </div>
          </section>

          {/* Related Courses */}
          {relatedCourses.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold mb-6 dark:text-slate-100">More Courses You Might Like</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {relatedCourses.map((relatedCourse) => (
                  <Link key={relatedCourse.id} to={`/course/${relatedCourse.slug ?? relatedCourse.id}`}>
                    <Card className="hover:shadow-lg transition-shadow">
                      <div className="flex gap-4">
                        <img
                          src={relatedCourse.image}
                          alt={relatedCourse.title}
                          width={128}
                          height={128}
                          loading="lazy"
                          decoding="async"
                          className="w-32 h-32 object-cover rounded-l-lg"
                        />
                        <CardContent className="p-4 flex-1">
                          <h3 className="font-semibold mb-2 line-clamp-2">
                            {relatedCourse.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">{relatedCourse.instructor}</p>
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
