export interface Course {
  id: string;
  slug?: string;
  title: string;
  instructor: string;
  rating: number;
  reviewCount: number;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  level: string;
  duration: string;
  students: number;
  description: string;
  lastUpdated: string;
  language: string;
  whatYouWillLearn: string[];
  requirements: string[];
  curriculum: {
    section: string;
    lectures: number;
    duration: string;
  }[];
  bestseller?: boolean;
}

export const categories = [
  { id: 'development', name: 'Development', icon: '💻' },
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'design', name: 'Design', icon: '🎨' },
  { id: 'marketing', name: 'Marketing', icon: '📈' },
  { id: 'photography', name: 'Photography', icon: '📷' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'fitness', name: 'Fitness', icon: '💪' },
  { id: 'lifestyle', name: 'Lifestyle', icon: '🌟' },
];

export const courses: Course[] = [];
