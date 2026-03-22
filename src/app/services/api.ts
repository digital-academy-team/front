// Base URL from env variable, defaults to Django dev server
const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'https://api.digital-academy.live';

const TOKEN_KEY = 'da_access_token';
const REFRESH_KEY = 'da_refresh_token';
const CATEGORY_ENDPOINT_PATH = '/api/users/category/';
const TEACHER_COURSES_ENDPOINT = '/api/teachers/courses/';

const CATEGORY_CACHE_KEY = 'da_category_cache';
const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;

let categoriesInFlight: Promise<CategoryListResponse> | null = null;

type MaybeWrappedResponse<T> = T | { success?: boolean; status?: number; data?: T };

function unwrapApiData<T>(response: MaybeWrappedResponse<T> | null | undefined, fallback: T): T {
  if (response && typeof response === 'object' && 'data' in response && response.data !== undefined) {
    return response.data as T;
  }
  return (response as T | null | undefined) ?? fallback;
}

function wrapApiData<T>(response: MaybeWrappedResponse<T> | null | undefined, fallback: T) {
  return {
    success: true,
    status: 200,
    data: unwrapApiData(response, fallback),
  };
}

function extractApiErrorMessage(err: any): string | null {
  if (!err || typeof err !== 'object') return null;

  if (typeof err.detail === 'string' && err.detail.trim()) return err.detail;
  if (typeof err.message === 'string' && err.message.trim()) return err.message;
  if (typeof err.error === 'string' && err.error.trim()) return err.error;

  for (const value of Object.values(err)) {
    if (typeof value === 'string' && value.trim()) return value;
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === 'string' && first.trim()) return first;
    }
    if (value && typeof value === 'object') {
      const nested = extractApiErrorMessage(value);
      if (nested) return nested;
    }
  }

  return null;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return null;
  try {
    const res = await fetch(`${BASE_URL}/api/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.access);
    return data.access;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = getAccessToken();
  const isFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers ?? {});

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiRequest<T>(endpoint, options, false);
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const raw = await res.text();
    let message = `HTTP ${res.status}`;

    if (raw) {
      try {
        const err = JSON.parse(raw);
        message = extractApiErrorMessage(err) ?? message;
      } catch {
        message = `${message}: ${raw.slice(0, 220)}`;
      }
    }

    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;

  const raw = await res.text();
  if (!raw.trim()) return undefined as T;

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Some successful endpoints can return invalid JSON bodies.
      return undefined as T;
    }
  }

  return raw as T;
}

export async function apiRequestBlob(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<Blob> {
  const token = getAccessToken();
  const headers = new Headers(options.headers ?? {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiRequestBlob(endpoint, options, false);
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const raw = await res.text();
    let message = `HTTP ${res.status}`;

    if (raw) {
      try {
        const err = JSON.parse(raw);
        message = extractApiErrorMessage(err) ?? message;
      } catch {
        message = `${message}: ${raw.slice(0, 220)}`;
      }
    }

    throw new Error(message);
  }

  return res.blob();
}

export interface CreateUnitPayload {
  title: string;
  desc: string;
  lessons: Array<{
    title: string;
    desc: string;
    additional_task?: string;
    video?: File | null;
    presentation?: File | null;
  }>;
}

export interface CreateCoursePayload {
  title: string;
  desc: string;
  base_price: number;
  discount_price: number;
  category: string;
  cover_img: File | null;
  units: CreateUnitPayload[];
}

export interface CategoryItem {
  id: string;
  title: string;
  slug: string;
}

export interface CategoryListResponse {
  success: boolean;
  status: number;
  data: CategoryItem[];
}

export interface CreateLessonApiPayload {
  course_unit: string;
  title: string;
  desc: string;
  additional_task: string;
  video?: File | null;
  presentation?: File | null;
}

export interface CreateQuizVariantApiPayload {
  text: string;
  is_correct: boolean;
}

export interface CreateQuizQuestionApiPayload {
  question_text: string;
  points: number;
  variants: CreateQuizVariantApiPayload[];
}

export interface CreateQuizApiPayload {
  lesson: string;
  title: string;
  description: string;
  questions: CreateQuizQuestionApiPayload[];
}

export interface UserCourseItem {
  id: string;
  cover_img: string | null;
  title: string;
  desc: string;
  base_price: number;
  discount_price: number;
  units: Array<{
    id: string;
    title: string;
    desc: string;
    lessons: Array<{
      id: string;
      title: string;
      video: string | null;
      presentation: string | null;
      additional_task: string;
    }>;
  }>;
}

export interface UserCourseListResponse {
  success: boolean;
  status: number;
  data: UserCourseItem[];
}

export interface UserPublicCourseItem {
  id: string;
  cover_img: string | null;
  title: string;
  desc: string;
  base_price: number;
  discount_price: number | null;
  slug?: string;
  instructor?: string;
  instructor_name?: string;
  teacher_name?: string;
}

export interface UserPublicCourseListResponse {
  success: boolean;
  status: number;
  data: UserPublicCourseItem[];
}

export interface UserCoursesQueryParams {
  category?: string[];
  price_min?: number;
  price_max?: number;
}

export interface MyCourseListItem {
  id: string;
  course: string | { id?: string } | null;
  progress: number;
  status: string;
}

export interface MyCourseListResponse {
  success: boolean;
  status: number;
  data: MyCourseListItem[];
}

export interface MyCourseDetailResponse {
  success: boolean;
  status: number;
  data: {
    id: string;
    progress: number;
    status: string;
    course: {
      id: string;
      units: Array<{
        id: string;
        title: string;
        desc: string;
        lessons: Array<{
          id: string;
          title: string;
          video: string | null;
          presentation: string | null;
          additional_task: string;
          quizzes?: Array<{
            id: string;
            lesson: string;
            title: string;
            description: string;
            is_finished?: boolean;
            due_at?: string | null;
            questions?: Array<{
              id: string;
              question_text: string;
              points: number;
              variants: Array<{
                id: string;
                text: string;
                is_correct: boolean;
              }>;
            }>;
          }>;
        }>;
      }>;
    };
  };
}

export interface SubmitUserQuizAnswerItem {
  question: string;
  variant: string;
}

export interface SubmitUserQuizPayload {
  answers: SubmitUserQuizAnswerItem[];
}

export interface SubmitUserQuizResponse {
  success: boolean;
  status: number;
  data: {
    quiz: string;
    user: string | null;
    correct_answers: number;
    wrong_answers: number;
    total_questions: number;
    total: string;
    status: 'PASSED' | 'FAILED' | string;
    course_progress: number;
  };
}

export interface UpdateCoursePayload {
  title: string;
  desc: string;
  base_price: number;
  discount_price: number;
  cover_img?: File | null;
}

export interface CourseProgressApiResponse {
  success?: boolean;
  status_code?: number;
  status?: string | number;
  data?: {
    progress?: number;
    status?: string;
    completed_lectures?: string[];
  };
  progress?: number;
  status_text?: string;
  completed_lectures?: string[];
}

export interface UpdateCourseProgressPayload {
  progress?: number;
  status?: string;
  completed_lectures?: string[];
}

export interface OrderListItem {
  course_title: string;
  total_amount: string | null;
}

export interface OrderListResponse {
  success: boolean;
  status: number;
  data: OrderListItem[];
}

export function resolveCourseId(course: MyCourseListItem['course']): string {
  if (typeof course === 'string') return course;
  if (course && typeof course === 'object' && typeof course.id === 'string') return course.id;
  return '';
}

// ── Auth endpoints ─────────────────────────────────────────────────────────
export interface LoginApiResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    email: string;
  };
}

export const authApi = {
  login: async (identifier: string, password: string) => {
    const primaryPayload = identifier.includes('@')
      ? { email: identifier, password }
      : { username: identifier, password };
    const fallbackPayload = identifier.includes('@')
      ? { username: identifier, password }
      : { email: identifier, password };

    try {
      return await apiRequest<LoginApiResponse>('/api/users/auth/login/', {
        method: 'POST',
        body: JSON.stringify(primaryPayload),
      });
    } catch {
      return apiRequest<LoginApiResponse>('/api/users/auth/login/', {
        method: 'POST',
        body: JSON.stringify(fallbackPayload),
      });
    }
  },

  getGoogleLoginUrl: () => `${BASE_URL}/api/users/auth/google/login/`,

  setInitialPassword: (userId: string, newPassword: string) =>
    apiRequest<{ message: string }>(`/api/users/auth/set-password/${userId}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        new_password1: newPassword,
        new_password2: newPassword,
      }),
    }),

  register: async (_data: { name: string; email: string; password: string; role: string }) => {
    throw new Error('Registration endpoint was removed in backend. Use Google login or admin-created accounts.');
  },

  verifyCode: async (_email: string, _code: string) => {
    throw new Error('Verification endpoint was removed in backend.');
  },

  logout: async () => undefined,

  getProfile: async () => null,

  updateProfile: async (data: Partial<{ name: string; email: string; bio: string; avatar: string }>) => data,

  changePassword: async (_data: { old_password: string; new_password: string }) => {
    throw new Error('Password change endpoint is not available in current backend auth API.');
  },
};

// ── Course endpoints ───────────────────────────────────────────────────────
export const courseApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest<any[]>(`/api/users/courses/${qs}`);
  },

  create: (data: CreateCoursePayload) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('desc', data.desc);
    formData.append('base_price', String(data.base_price));
    formData.append('discount_price', String(data.discount_price));
    formData.append('category', data.category);
    if (data.cover_img) {
      formData.append('cover_img', data.cover_img);
    }

    const unitsPayload = data.units.map((unit, unitIndex) => ({
      title: unit.title,
      desc: unit.desc,
      lessons: unit.lessons.map((lesson, lessonIndex) => {
        const video = lesson.video ?? null;
        const presentation = lesson.presentation ?? null;

        const videoKey = `video_${unitIndex}_${lessonIndex}`;
        const presentationKey = `presentation_${unitIndex}_${lessonIndex}`;

        if (video) {
          formData.append(videoKey, video);
        }
        if (presentation) {
          formData.append(presentationKey, presentation);
        }

        return {
          title: lesson.title,
          desc: lesson.desc,
          additional_task: lesson.additional_task ?? '',
          // Backend expects field keys, not raw file names.
          video: video ? videoKey : null,
          presentation: presentation ? presentationKey : null,
        };
      }),
    }));

    formData.append('units', JSON.stringify(unitsPayload));

    return apiRequest<any>(TEACHER_COURSES_ENDPOINT, {
      method: 'POST',
      body: formData,
    });
  },

  createLesson: (data: CreateLessonApiPayload) => {
    const formData = new FormData();
    formData.append('course_unit', data.course_unit);
    formData.append('title', data.title);
    formData.append('desc', data.desc);
    formData.append('additional_task', data.additional_task);
    if (data.video) formData.append('video', data.video);
    if (data.presentation) formData.append('presentation', data.presentation);
    return apiRequest<any>('/api/teachers/lesson/', { method: 'POST', body: formData });
  },

  myCourses: async () => {
    return apiRequest<UserCourseListResponse>(TEACHER_COURSES_ENDPOINT);
  },

  update: (courseId: string, data: UpdateCoursePayload) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('desc', data.desc);
    formData.append('base_price', String(data.base_price));
    formData.append('discount_price', String(data.discount_price));
    if (data.cover_img) {
      formData.append('cover_img', data.cover_img);
    }

    return apiRequest<any>(`${TEACHER_COURSES_ENDPOINT}${courseId}/`, {
      method: 'PATCH',
      body: formData,
    });
  },

  detail: (id: string) => apiRequest<any>(`${TEACHER_COURSES_ENDPOINT}${id}/`),

  publicDetail: (slugOrId: string) => apiRequest<any>(`/api/users/courses/${slugOrId}/`),

  userCourses: async (params?: UserCoursesQueryParams) => {
    if (!params) {
      const response = await apiRequest<MaybeWrappedResponse<UserPublicCourseItem[]>>('/api/users/courses/');
      return wrapApiData(response, [] as UserPublicCourseItem[]);
    }

    const query = new URLSearchParams();
    if (Array.isArray(params.category)) {
      params.category.forEach((categoryId) => {
        if (categoryId) query.append('category', categoryId);
      });
    }
    if (typeof params.price_min === 'number') {
      query.append('price_min', String(params.price_min));
    }
    if (typeof params.price_max === 'number') {
      query.append('price_max', String(params.price_max));
    }

    const qs = query.toString();
    const endpoint = qs ? `/api/users/courses/?${qs}` : '/api/users/courses/';
    const response = await apiRequest<MaybeWrappedResponse<UserPublicCourseItem[]>>(endpoint);
    return wrapApiData(response, [] as UserPublicCourseItem[]);
  },

  myEnrolledCourses: async () => {
    const response = await apiRequest<MaybeWrappedResponse<MyCourseListItem[]>>('/api/users/my-courses/');
    return wrapApiData(response, [] as MyCourseListItem[]);
  },

  myEnrolledCourseDetail: async (id: string) => {
    const response = await apiRequest<MaybeWrappedResponse<MyCourseDetailResponse['data']>>(`/api/users/my-courses/${id}/`);
    return wrapApiData(response, null as MyCourseDetailResponse['data'] | null);
  },

  submitUserQuiz: (quizId: string, data: SubmitUserQuizPayload) =>
    apiRequest<SubmitUserQuizResponse>(`/api/users/quiz/${quizId}/submit/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  enroll: (id: string) =>
    apiRequest<void>('/api/users/enrolment/', {
      method: 'POST',
      body: JSON.stringify({ course: id }),
    }),

  reviews: (id: string) => apiRequest<any[]>(`/api/users/comments/?course=${id}`),

  addReview: (id: string, data: { rating: number; comment: string }) =>
    apiRequest<any>('/api/users/comments/', {
      method: 'POST',
      body: JSON.stringify({ course: id, comment: data.comment, likes: data.rating }),
    }),

  getProgress: async (params: { enrollmentId?: string; courseId?: string }) => {
    const { enrollmentId, courseId } = params;

    if (enrollmentId) {
      const detailResponse = await apiRequest<MaybeWrappedResponse<MyCourseDetailResponse['data']>>(`/api/users/my-courses/${enrollmentId}/`);
      const detail = unwrapApiData(detailResponse, null as MyCourseDetailResponse['data'] | null);

      return {
        success: true,
        status: 200,
        data: {
          progress: Number(detail?.progress ?? 0),
          status: detail?.status,
          completed_lectures: [],
        },
      } as CourseProgressApiResponse;
    }

    if (!courseId) {
      throw new Error('Progress endpoint requires enrollmentId or courseId');
    }

    const myCoursesResponse = await apiRequest<MaybeWrappedResponse<MyCourseListItem[]>>('/api/users/my-courses/');
    const myCourses = unwrapApiData(myCoursesResponse, [] as MyCourseListItem[]);
    const matched = myCourses.find((item) => resolveCourseId(item.course) === courseId);

    if (!matched) {
      return {
        success: true,
        status: 200,
        data: {
          progress: 0,
          status: undefined,
          completed_lectures: [],
        },
      } as CourseProgressApiResponse;
    }

    const detailResponse = await apiRequest<MaybeWrappedResponse<MyCourseDetailResponse['data']>>(`/api/users/my-courses/${matched.id}/`);
    const detail = unwrapApiData(detailResponse, null as MyCourseDetailResponse['data'] | null);

    return {
      success: true,
      status: 200,
      data: {
        progress: Number(detail?.progress ?? 0),
        status: detail?.status,
        completed_lectures: [],
      },
    } as CourseProgressApiResponse;
  },

  updateProgress: async (params: { enrollmentId?: string; courseId?: string; data: UpdateCourseProgressPayload }) => {
    const { enrollmentId, courseId, data } = params;

    if (!enrollmentId && !courseId) {
      throw new Error('Progress endpoint requires enrollmentId or courseId');
    }

    // Backend currently exposes read-only progress via my-courses detail.
    // Keep local progress state in sync and return a normalized response.
    return {
      success: true,
      status: 200,
      data,
    } as CourseProgressApiResponse;
  },

  getQuiz: (_courseId: string, quizId: number) =>
    apiRequest<any>(`/api/users/quiz/${quizId}/`),

  submitQuiz: async (_courseId: string, quizId: number, answers: Record<number, number>) => {
    const payload = {
      answers: Object.entries(answers).map(([question, variant]) => ({
        question: String(question),
        variant: String(variant),
      })),
    };

    const result = await apiRequest<{
      correct_answers?: number;
      total_questions?: number;
      status?: string;
    }>(`/api/users/quiz/${quizId}/submit/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const correct = Number(result?.correct_answers ?? 0);
    const total = Number(result?.total_questions ?? 0);
    const passed = String(result?.status ?? '').toUpperCase() === 'PASSED';

    return {
      score: correct,
      passed,
      correct,
      total,
    };
  },

  downloadCertificate: (enrollmentId: string) =>
    apiRequestBlob(`/api/users/my-courses/${enrollmentId}/certificate/`, {
      method: 'POST',
    }),
};

export const categoryApi = {
  list: async () => {
    if (categoriesInFlight) {
      return categoriesInFlight;
    }

    const loadCategories = async (): Promise<CategoryListResponse> => {
      const now = Date.now();

      try {
        const cachedRaw = localStorage.getItem(CATEGORY_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as { ts: number; data: CategoryItem[] };
          if (Array.isArray(cached.data) && now - Number(cached.ts ?? 0) < CATEGORY_CACHE_TTL_MS) {
            return wrapApiData(cached.data, [] as CategoryItem[]);
          }
        }
      } catch {
        // Ignore cache parsing issues and continue with network request.
      }

      try {
        const response = await apiRequest<MaybeWrappedResponse<CategoryItem[]>>(CATEGORY_ENDPOINT_PATH);
        const wrapped = wrapApiData(response, [] as CategoryItem[]);

        try {
          localStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify({ ts: now, data: wrapped.data }));
        } catch {
          // Ignore storage quota/access issues.
        }

        return wrapped;
      } catch (error: any) {
        try {
          const cachedRaw = localStorage.getItem(CATEGORY_CACHE_KEY);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw) as { data: CategoryItem[] };
            if (Array.isArray(cached.data)) {
              return wrapApiData(cached.data, [] as CategoryItem[]);
            }
          }
        } catch {
          // No usable cache.
        }

        throw error;
      }
    };

    categoriesInFlight = loadCategories().finally(() => {
      categoriesInFlight = null;
    });

    return categoriesInFlight;
  },
};

export const quizApi = {
  create: (data: CreateQuizApiPayload) =>
    apiRequest<any>('/api/teachers/quiz/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const orderApi = {
  list: async () => {
    const response = await apiRequest<MaybeWrappedResponse<OrderListItem[]>>('/api/users/enrolment/');
    return wrapApiData(response, [] as OrderListItem[]);
  },
};
