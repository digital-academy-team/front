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

export const courses: Course[] = [];
