export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor';
  avatar?: string;
  bio?: string;
  enrolledCourseIds: string[];
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface CartItem {
  courseId: string;
  title: string;
  instructor: string;
  price: number;
  originalPrice?: number;
  image: string;
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface CourseProgress {
  completedLectures: string[];
}

export interface Transaction {
  id: string;
  date: string;
  courseTitle: string;
  amount: number;
  status: 'completed' | 'refunded';
}
