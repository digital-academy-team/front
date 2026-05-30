// Base URL: the production backend by default. For local dev, set
// VITE_API_URL=http://localhost:8000 in .env.local (never committed).
const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const BASE_URL = (API_URL && API_URL.length > 0 ? API_URL : 'https://api.digital-academy.live').replace(/\/+$/, '');

/**
 * Turn a media path into a clickable absolute URL. DRF returns `/media/...`
 * relative URLs when no request context is present; on the Vite dev origin
 * (:5173) those 404. Prefix the backend origin for any root-relative path.
 */
export function mediaUrl(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Human-readable file name from a media URL/path (basename, URI-decoded). */
export function fileNameFromUrl(path?: string | null): string {
  if (!path) return '';
  const clean = path.split('?')[0].split('#')[0];
  const base = clean.substring(clean.lastIndexOf('/') + 1);
  try {
    return decodeURIComponent(base);
  } catch {
    return base;
  }
}

/**
 * Friendly display name for a submission's student. Never returns the raw
 * student UUID — falls back to "Student" so the UI doesn't show an id.
 */
export function submissionStudentName(sub: {
  student_full_name?: string;
  student_username?: string;
  student_email?: string;
}): string {
  return (sub.student_full_name || sub.student_username || sub.student_email || 'Student').trim() || 'Student';
}

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

export type LessonKindPayload =
  | 'VIDEO'
  | 'ARTICLE'
  | 'CHEATSHEET'
  | 'EXERCISE'
  | 'QUIZ'
  | 'ASSIGNMENT'
  | 'RESOURCE'
  | 'DISCUSSION';

export interface LessonExercisePayload {
  language: string;
  starter_code: string;
  solution?: string | null;
  hint_penalty_percent?: number;
  hints?: string[];
}

export interface CreateLessonItemPayload {
  // Core
  kind?: LessonKindPayload;
  title: string;
  desc: string;
  duration_min?: number;
  // Rich body
  content_md?: string;
  additional_task?: string;
  // Files
  video?: File | null;
  captions?: File | null;
  presentation?: File | null;
  // Type-specific
  external_url?: string;
  assignment_instructions?: string;
  assignment_due_at?: string | null;
  allow_multiple_files?: boolean;
  exercise?: LessonExercisePayload | null;
  // Optional attached quiz, only valid when kind is quiz-attachable.
  attached_quiz?: {
    title: string;
    description: string;
    time_limit_min?: number;
    show_timer?: boolean;
    questions: CreateQuizQuestionApiPayload[];
  } | null;
}

export interface CreateUnitPayload {
  title: string;
  desc: string;
  lessons: CreateLessonItemPayload[];
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
  kind?: LessonKindPayload;
  title: string;
  desc: string;
  duration_min?: number;
  content_md?: string;
  additional_task?: string;
  external_url?: string;
  assignment_instructions?: string;
  assignment_due_at?: string | null;
  allow_multiple_files?: boolean;
  exercise?: LessonExercisePayload | null;
  video?: File | null;
  captions?: File | null;
  presentation?: File | null;
}

export type UpdateLessonApiPayload = Partial<CreateLessonApiPayload> & {
  course_unit?: string;
};

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
  time_limit_min?: number;
  show_timer?: boolean;
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
  avg_rating?: number;
  students_count?: number;
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
  completed_lectures?: string[];
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
    completed_lectures?: string[];
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
          // v2 lesson taxonomy fields — all optional for backwards compatibility.
          kind?: LessonKindPayload | null;
          desc?: string | null;
          content_md?: string | null;
          duration_min?: number | null;
          video: string | null;
          captions?: string | null;
          presentation: string | null;
          additional_task: string;
          external_url?: string | null;
          assignment_instructions?: string | null;
          assignment_due_at?: string | null;
          exercise?: LessonExercisePayload | null;
          attachments?: Array<{ id?: string; label: string; url: string }> | null;
          quizzes?: Array<{
            id: string;
            lesson: string;
            title: string;
            description: string;
            time_limit_min?: number | null;
            show_timer?: boolean | null;
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

// ── Gamification types ─────────────────────────────────────────────────────
export type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface ProfileResponse {
  id: string;
  avatar: string | null;
  email: string | null;
  first_name: string;
  last_name: string;
  username: string | null;
  coin: number;
  phone_number: string | null;
}

export interface ProfileUpdatePayload {
  avatar?: string | null;
  email?: string | null;
  first_name?: string;
  last_name?: string;
  username?: string | null;
  phone_number?: string | null;
}

export interface LeaderboardEntry {
  username: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  tier: Tier;
  total_stars: number;
  position: number | null;
  reward_coin: number;
}

export type LeaderboardListResponse = ReturnType<typeof wrapApiData<LeaderboardEntry[]>>;
export type QuizResultListResponse = ReturnType<typeof wrapApiData<QuizResultEntry[]>>;

export interface QuizResultEntry {
  id: string;
  quiz_title: string;
  correct_answers: number;
  wrong_answers: number;
  total_questions: number;
  status: 'PASSED' | 'FAILED';
  stars: number;
  total: string;
  attempt: number;
}

export interface QuizSubmitResultResponseExtended {
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
    stars?: number;
    attempt?: number;
    coin_earned?: number;
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

  getProfile: async () => {
    const response = await apiRequest<MaybeWrappedResponse<ProfileResponse>>('/api/users/auth/profile/');
    return unwrapApiData(response, null as ProfileResponse | null);
  },

  updateProfile: async (data: ProfileUpdatePayload) => {
    const response = await apiRequest<MaybeWrappedResponse<ProfileResponse>>('/api/users/auth/profile/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return unwrapApiData(response, null as ProfileResponse | null);
  },

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
        const captions = lesson.captions ?? null;
        const presentation = lesson.presentation ?? null;

        const videoKey = `video_${unitIndex}_${lessonIndex}`;
        const captionsKey = `captions_${unitIndex}_${lessonIndex}`;
        const presentationKey = `presentation_${unitIndex}_${lessonIndex}`;

        if (video) formData.append(videoKey, video);
        if (captions) formData.append(captionsKey, captions);
        if (presentation) formData.append(presentationKey, presentation);

        return {
          kind: lesson.kind ?? 'VIDEO',
          title: lesson.title,
          desc: lesson.desc,
          duration_min: lesson.duration_min ?? 0,
          content_md: lesson.content_md ?? '',
          additional_task: lesson.additional_task ?? '',
          external_url: lesson.external_url ?? '',
          assignment_instructions: lesson.assignment_instructions ?? '',
          assignment_due_at: lesson.assignment_due_at ?? null,
          allow_multiple_files: lesson.allow_multiple_files ?? false,
          exercise: lesson.exercise ?? null,
          attached_quiz: lesson.attached_quiz ?? null,
          // Backend expects field keys, not raw file names.
          video: video ? videoKey : null,
          captions: captions ? captionsKey : null,
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
    formData.append('kind', data.kind ?? 'VIDEO');
    formData.append('title', data.title);
    formData.append('desc', data.desc);
    if (typeof data.duration_min === 'number') {
      formData.append('duration_min', String(data.duration_min));
    }
    if (data.content_md !== undefined) formData.append('content_md', data.content_md);
    if (data.additional_task !== undefined) formData.append('additional_task', data.additional_task);
    if (data.external_url) formData.append('external_url', data.external_url);
    if (data.assignment_instructions) formData.append('assignment_instructions', data.assignment_instructions);
    if (data.assignment_due_at) formData.append('assignment_due_at', data.assignment_due_at);
    if (data.allow_multiple_files !== undefined) formData.append('allow_multiple_files', String(data.allow_multiple_files));
    if (data.exercise) formData.append('exercise', JSON.stringify(data.exercise));
    if (data.video) formData.append('video', data.video);
    if (data.captions) formData.append('captions', data.captions);
    if (data.presentation) formData.append('presentation', data.presentation);
    return apiRequest<any>('/api/teachers/lesson/', { method: 'POST', body: formData });
  },

  updateLesson: (lessonId: string, data: UpdateLessonApiPayload) => {
    const formData = new FormData();
    if (data.course_unit) formData.append('course_unit', data.course_unit);
    if (data.kind) formData.append('kind', data.kind);
    if (data.title !== undefined) formData.append('title', data.title);
    if (data.desc !== undefined) formData.append('desc', data.desc);
    if (typeof data.duration_min === 'number') {
      formData.append('duration_min', String(data.duration_min));
    }
    if (data.content_md !== undefined) formData.append('content_md', data.content_md);
    if (data.additional_task !== undefined) formData.append('additional_task', data.additional_task);
    if (data.external_url !== undefined) formData.append('external_url', data.external_url);
    if (data.assignment_instructions !== undefined) {
      formData.append('assignment_instructions', data.assignment_instructions);
    }
    if (data.assignment_due_at !== undefined && data.assignment_due_at !== null) {
      formData.append('assignment_due_at', data.assignment_due_at);
    }
    if (data.allow_multiple_files !== undefined) {
      formData.append('allow_multiple_files', String(data.allow_multiple_files));
    }
    if (data.exercise !== undefined) {
      formData.append('exercise', data.exercise ? JSON.stringify(data.exercise) : '');
    }
    if (data.video) formData.append('video', data.video);
    if (data.captions) formData.append('captions', data.captions);
    if (data.presentation) formData.append('presentation', data.presentation);
    return apiRequest<any>(`/api/teachers/lesson/${lessonId}/`, { method: 'PATCH', body: formData });
  },

  createUnit: (courseId: string, data: { title: string; desc: string }) =>
    apiRequest<any>(`${TEACHER_COURSES_ENDPOINT}${courseId}/units/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Edit an existing unit's title / description. */
  updateUnit: (courseId: string, unitId: string, data: { title?: string; desc?: string }) =>
    apiRequest<any>(`${TEACHER_COURSES_ENDPOINT}${courseId}/units/${unitId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** Persist a drag-and-drop reorder of units + lessons. */
  reorder: (courseId: string, units: Array<{ id: string; lessons: string[] }>) =>
    apiRequest<any>(`${TEACHER_COURSES_ENDPOINT}${courseId}/reorder/`, {
      method: 'POST',
      body: JSON.stringify({ units }),
    }),

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

  remove: (id: string) =>
    apiRequest<any>(`${TEACHER_COURSES_ENDPOINT}${id}/`, { method: 'DELETE' }),

  detail: (id: string) => apiRequest<any>(`${TEACHER_COURSES_ENDPOINT}${id}/`),

  publicDetail: (slugOrId: string) => apiRequest<any>(`/api/users/courses/${slugOrId}/`),

  userCourses: async (params?: UserCoursesQueryParams) => {
    if (!params) {
      const response = await apiRequest<MaybeWrappedResponse<UserPublicCourseItem[]>>('/api/users/courses/');
      const result = wrapApiData(response, [] as UserPublicCourseItem[]);
      try {
        localStorage.setItem('da_public_courses_cache', JSON.stringify(result.data));
      } catch { /* quota exceeded or private browsing — ignore */ }
      return result;
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

  submitUserQuiz: async (quizId: string, data: SubmitUserQuizPayload) => {
    const response = await apiRequest<MaybeWrappedResponse<QuizSubmitResultResponseExtended['data']>>(`/api/users/quiz/${quizId}/submit/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return wrapApiData(response, null as QuizSubmitResultResponseExtended['data'] | null);
  },

  enroll: (id: string) =>
    apiRequest<void>('/api/users/enrolment/', {
      method: 'POST',
      body: JSON.stringify({ course: id }),
    }),

  reviews: async (id: string) => {
    const response = await apiRequest<MaybeWrappedResponse<any[]>>(`/api/users/comments/?course=${id}`);
    return unwrapApiData(response, [] as any[]);
  },

  addReview: async (id: string, data: { rating: number; comment: string }) => {
    const response = await apiRequest<MaybeWrappedResponse<any>>('/api/users/comments/', {
      method: 'POST',
      body: JSON.stringify({
        course: id,
        comment: data.comment.trim(),
        rating: data.rating,
        likes: data.rating,
      }),
    });

    return unwrapApiData(response, null as any);
  },

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
          completed_lectures: Array.isArray(detail?.completed_lectures) ? detail.completed_lectures : [],
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
        completed_lectures: Array.isArray(detail?.completed_lectures) ? detail.completed_lectures : [],
      },
    } as CourseProgressApiResponse;
  },

  updateProgress: async (params: { enrollmentId?: string; courseId?: string; data: UpdateCourseProgressPayload }) => {
    const { enrollmentId, courseId, data } = params;

    if (!enrollmentId && !courseId) {
      throw new Error('Progress endpoint requires enrollmentId or courseId');
    }

    let targetEnrollmentId = enrollmentId;

    if (!targetEnrollmentId) {
      const myCoursesResponse = await apiRequest<MaybeWrappedResponse<MyCourseListItem[]>>('/api/users/my-courses/');
      const myCourses = unwrapApiData(myCoursesResponse, [] as MyCourseListItem[]);
      targetEnrollmentId = myCourses.find((item) => resolveCourseId(item.course) === courseId)?.id;
    }

    if (!targetEnrollmentId) {
      return {
        success: true,
        status: 200,
        data,
      } as CourseProgressApiResponse;
    }

    const response = await apiRequest<MaybeWrappedResponse<CourseProgressApiResponse['data']>>(
      `/api/users/my-courses/${targetEnrollmentId}/`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );

    return wrapApiData(response, data as CourseProgressApiResponse['data']) as CourseProgressApiResponse;
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
          if (Array.isArray(cached.data) && cached.data.length > 0 && now - Number(cached.ts ?? 0) < CATEGORY_CACHE_TTL_MS) {
            return wrapApiData(cached.data, [] as CategoryItem[]);
          }
        }
      } catch {
        // Ignore cache parsing issues and continue with network request.
      }

      try {
        const response = await apiRequest<MaybeWrappedResponse<CategoryItem[]>>(CATEGORY_ENDPOINT_PATH);
        const wrapped = wrapApiData(response, [] as CategoryItem[]);

        if (wrapped.data.length > 0) {
          try {
            localStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify({ ts: now, data: wrapped.data }));
          } catch {
            // Ignore storage quota/access issues.
          }
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

  update: (quizId: string, data: Omit<CreateQuizApiPayload, 'lesson'> & { lesson?: string }) =>
    apiRequest<any>(`/api/teachers/quiz/${quizId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ── Assignment submissions + exercise solution ─────────────────────────────
export interface AssignmentSubmissionApi {
  id: string;
  lesson: string;
  lesson_title?: string;
  course_id?: string;
  course_title?: string;
  student: string;
  student_username?: string;
  student_email?: string;
  student_full_name?: string;
  file: string | null;
  files?: Array<{ id: string; url: string; name: string }>;
  note: string;
  grade: string;
  feedback: string;
  status: 'SUBMITTED' | 'GRADED' | string;
  created_at: string;
  updated_at: string;
}

export const assignmentApi = {
  /** Student: upload a submission attempt with one or more files. */
  submit: async (lessonId: string, params: { files: File[]; note: string }) => {
    const formData = new FormData();
    for (const f of params.files ?? []) formData.append('files', f);
    formData.append('note', params.note ?? '');
    const res = await apiRequest<MaybeWrappedResponse<AssignmentSubmissionApi>>(
      `/api/users/assignment/${lessonId}/submit/`,
      { method: 'POST', body: formData },
    );
    return unwrapApiData(res, null as AssignmentSubmissionApi | null);
  },

  /** Student: full submission history for a lesson, newest first (may be empty). */
  mySubmissions: async (lessonId: string): Promise<AssignmentSubmissionApi[]> => {
    try {
      const res = await apiRequest<MaybeWrappedResponse<AssignmentSubmissionApi[]>>(
        `/api/users/assignment/${lessonId}/submission/`,
      );
      const data = unwrapApiData(res, [] as AssignmentSubmissionApi[]);
      if (Array.isArray(data)) return data;
      return data ? [data as AssignmentSubmissionApi] : [];
    } catch {
      return [];
    }
  },

  /** Tutor: list all submissions for a single lesson they own. */
  listForLesson: async (lessonId: string) => {
    const res = await apiRequest<MaybeWrappedResponse<AssignmentSubmissionApi[]>>(
      `/api/teachers/assignment/${lessonId}/submissions/`,
    );
    return unwrapApiData(res, [] as AssignmentSubmissionApi[]);
  },

  /** Tutor: every submission across all their courses (dashboard inbox). */
  tutorInbox: async (statusFilter?: 'SUBMITTED' | 'GRADED') => {
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    const res = await apiRequest<MaybeWrappedResponse<AssignmentSubmissionApi[]>>(
      `/api/teachers/assignment/submissions/${qs}`,
    );
    return unwrapApiData(res, [] as AssignmentSubmissionApi[]);
  },

  /** Tutor: grade + leave feedback. */
  grade: async (submissionId: string, data: { grade?: string; feedback?: string }) => {
    const res = await apiRequest<MaybeWrappedResponse<AssignmentSubmissionApi>>(
      `/api/teachers/assignment/submission/${submissionId}/grade/`,
      { method: 'PATCH', body: JSON.stringify(data) },
    );
    return unwrapApiData(res, null as AssignmentSubmissionApi | null) as AssignmentSubmissionApi;
  },
};

// ── Notifications ───────────────────────────────────────────────────────────
export type NotificationApiType = 'ASSIGNMENT_SUBMITTED' | 'ASSIGNMENT_GRADED' | 'GENERIC' | string;

export interface NotificationApiItem {
  id: string;
  type: NotificationApiType;
  title: string;
  message: string;
  link: string;
  meta: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  actor: string | null;
  actor_name: string;
  created_at: string;
}

export const notificationApi = {
  /** List recent notifications for the current user + the unread count. */
  list: async (): Promise<{ items: NotificationApiItem[]; unread: number }> => {
    const res = await apiRequest<any>('/api/users/notifications/');
    const items: NotificationApiItem[] = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : [];
    const unread =
      typeof res?.extra?.unread === 'number'
        ? res.extra.unread
        : items.filter((n) => !n.is_read).length;
    return { items, unread };
  },

  unreadCount: async (): Promise<number> => {
    const res = await apiRequest<any>('/api/users/notifications/unread-count/');
    return typeof res?.unread === 'number' ? res.unread : (res?.data?.unread ?? 0);
  },

  markRead: (id: string) =>
    apiRequest<any>(`/api/users/notifications/${id}/read/`, { method: 'POST', body: JSON.stringify({}) }),

  markAllRead: () =>
    apiRequest<any>('/api/users/notifications/read-all/', { method: 'POST', body: JSON.stringify({}) }),
};

export interface ExerciseSubmissionApi {
  id: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export const exerciseApi = {
  /** Reveal the reference solution for an EXERCISE lesson. */
  fetchSolution: async (lessonId: string): Promise<{ solution: string }> => {
    const res = await apiRequest<MaybeWrappedResponse<{ solution: string }>>(
      `/api/users/exercise/${lessonId}/solution/`,
      { method: 'POST', body: JSON.stringify({}) },
    );
    return unwrapApiData(res, { solution: '' });
  },

  /** Student: submit code for an EXERCISE lesson (upsert). */
  submit: async (lessonId: string, code: string) => {
    const res = await apiRequest<MaybeWrappedResponse<ExerciseSubmissionApi>>(
      `/api/users/exercise/${lessonId}/submit/`,
      { method: 'POST', body: JSON.stringify({ code }) },
    );
    return unwrapApiData(res, null as ExerciseSubmissionApi | null);
  },

  /** Student: fetch own submitted code (null if none). */
  mySubmission: async (lessonId: string) => {
    try {
      const res = await apiRequest<MaybeWrappedResponse<ExerciseSubmissionApi> | null>(
        `/api/users/exercise/${lessonId}/submission/`,
      );
      return unwrapApiData(res, null as ExerciseSubmissionApi | null);
    } catch {
      return null;
    }
  },
};

export interface DiscussionPostApi {
  id: string;
  author: string;
  author_name: string;
  text: string;
  created_at: string;
}

export const discussionApi = {
  list: async (lessonId: string): Promise<DiscussionPostApi[]> => {
    const res = await apiRequest<MaybeWrappedResponse<DiscussionPostApi[]>>(
      `/api/users/discussion/${lessonId}/posts/`,
    );
    return unwrapApiData(res, [] as DiscussionPostApi[]);
  },

  post: async (lessonId: string, text: string) => {
    const res = await apiRequest<MaybeWrappedResponse<DiscussionPostApi>>(
      `/api/users/discussion/${lessonId}/posts/`,
      { method: 'POST', body: JSON.stringify({ text }) },
    );
    return unwrapApiData(res, null as DiscussionPostApi | null);
  },
};

export const orderApi = {
  list: async () => {
    const response = await apiRequest<MaybeWrappedResponse<OrderListItem[]>>('/api/users/enrolment/');
    return wrapApiData(response, [] as OrderListItem[]);
  },
};

export const leaderboardApi = {
  list: async () => {
    const response = await apiRequest<MaybeWrappedResponse<LeaderboardEntry[]>>('/api/users/leaderboard/');
    return wrapApiData(response, [] as LeaderboardEntry[]);
  },

  detail: async (id: string) => {
    const response = await apiRequest<MaybeWrappedResponse<LeaderboardEntry>>(`/api/users/leaderboard/${id}/`);
    return unwrapApiData(response, null as LeaderboardEntry | null);
  },
};

export const quizResultApi = {
  list: async () => {
    const response = await apiRequest<MaybeWrappedResponse<QuizResultEntry[]>>('/api/users/quiz-result/');
    return wrapApiData(response, [] as QuizResultEntry[]);
  },

  detail: async (id: string) => {
    const response = await apiRequest<MaybeWrappedResponse<QuizResultEntry>>(`/api/users/quiz-result/${id}/`);
    return unwrapApiData(response, null as QuizResultEntry | null);
  },
};
