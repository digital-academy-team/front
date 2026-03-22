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

export const courses: Course[] = [
  {
    id: '1',
    title: 'The Complete Web Developer Bootcamp 2026',
    instructor: 'Dr. Angela Yu',
    rating: 4.7,
    reviewCount: 387420,
    price: 19.99,
    originalPrice: 129.99,
    image: 'https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWIlMjBkZXZlbG9wbWVudCUyMGNvZGluZ3xlbnwxfHx8fDE3NzE0MTE5OTR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    category: 'development',
    level: 'All Levels',
    duration: '62 hours',
    students: 850324,
    description: 'Master web development with HTML, CSS, JavaScript, React, Node.js, and more. Build real-world projects and become a professional developer.',
    lastUpdated: '2/2026',
    language: 'English',
    whatYouWillLearn: [
      'Build 15+ real-world websites and web apps',
      'Master HTML, CSS, and modern JavaScript',
      'Learn React for building interactive UIs',
      'Build backends with Node.js and Express',
      'Work with MongoDB and databases',
      'Deploy your applications to production',
    ],
    requirements: [
      'No programming experience needed',
      'A computer with internet connection',
      'Willingness to learn',
    ],
    curriculum: [
      { section: 'Front-End Web Development', lectures: 75, duration: '12h 30m' },
      { section: 'JavaScript Fundamentals', lectures: 45, duration: '8h 15m' },
      { section: 'React - The Complete Guide', lectures: 62, duration: '15h 45m' },
      { section: 'Backend Development with Node.js', lectures: 58, duration: '13h 20m' },
      { section: 'Databases & MongoDB', lectures: 35, duration: '7h 30m' },
      { section: 'Web3 and Blockchain Basics', lectures: 28, duration: '5h 40m' },
    ],
    bestseller: true,
  },
  {
    id: '2',
    title: 'Data Science and Machine Learning Bootcamp',
    instructor: 'Jose Portilla',
    rating: 4.8,
    reviewCount: 267543,
    price: 29.99,
    originalPrice: 149.99,
    image: 'https://images.unsplash.com/photo-1666875753105-c63a6f3bdc86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwc2NpZW5jZSUyMGFuYWx5dGljc3xlbnwxfHx8fDE3NzE0NjUwNzl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    category: 'development',
    level: 'Intermediate',
    duration: '44 hours',
    students: 532190,
    description: 'Learn Data Science with Python, NumPy, Pandas, Matplotlib, Seaborn, and Machine Learning algorithms. Get hired as a Data Scientist.',
    lastUpdated: '2/2026',
    language: 'English',
    whatYouWillLearn: [
      'Python programming for data science',
      'Data analysis with Pandas and NumPy',
      'Data visualization with Matplotlib',
      'Machine Learning algorithms',
      'Deep Learning with TensorFlow',
      'Real-world data science projects',
    ],
    requirements: [
      'Basic Python knowledge helpful',
      'High school level math',
    ],
    curriculum: [
      { section: 'Python Crash Course', lectures: 42, duration: '7h 30m' },
      { section: 'Data Analysis', lectures: 55, duration: '12h 15m' },
      { section: 'Machine Learning', lectures: 68, duration: '18h 45m' },
      { section: 'Deep Learning', lectures: 38, duration: '9h 30m' },
    ],
    bestseller: true,
  },
  {
    id: '3',
    title: 'Digital Marketing Masterclass - 23 Courses in 1',
    instructor: 'Phil Ebiner',
    rating: 4.6,
    reviewCount: 198765,
    price: 24.99,
    originalPrice: 134.99,
    image: 'https://images.unsplash.com/photo-1661286178389-e067299f907e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXJrZXRpbmclMjBzdHJhdGVneSUyMGRpZ2l0YWx8ZW58MXx8fHwxNzcxNDIzNTEzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    category: 'marketing',
    level: 'All Levels',
    duration: '42 hours',
    students: 445890,
    description: 'Master digital marketing: SEO, social media, email marketing, YouTube, Facebook ads, Google Ads, and more in this comprehensive course.',
    lastUpdated: '2/2026',
    language: 'English',
    whatYouWillLearn: [
      'Search Engine Optimization (SEO)',
      'Social media marketing strategies',
      'Google Ads and Facebook Ads',
      'Email marketing campaigns',
      'Content marketing',
      'Analytics and conversion optimization',
    ],
    requirements: [
      'No marketing experience needed',
      'Computer and internet access',
    ],
    curriculum: [
      { section: 'Digital Marketing Fundamentals', lectures: 42, duration: '7h 30m' },
      { section: 'SEO Mastery', lectures: 48, duration: '9h 45m' },
      { section: 'Social Media Marketing', lectures: 55, duration: '11h 20m' },
      { section: 'Paid Advertising', lectures: 38, duration: '8h 15m' },
      { section: 'Email Marketing', lectures: 32, duration: '6h 10m' },
    ],
    bestseller: true,
  },
  {
    id: '4',
    title: 'Graphic Design Masterclass - Learn GREAT Design',
    instructor: 'Lindsay Marsh',
    rating: 4.6,
    reviewCount: 89432,
    price: 22.99,
    originalPrice: 119.99,
    image: 'https://images.unsplash.com/photo-1689267166689-795f4f536819?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmFwaGljJTIwZGVzaWduJTIwY3JlYXRpdmV8ZW58MXx8fHwxNzcxNDc1OTQ0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    category: 'design',
    level: 'All Levels',
    duration: '18 hours',
    students: 245678,
    description: 'Master graphic design theory and practical application. Learn typography, color theory, layout design, and work with industry-standard tools.',
    lastUpdated: '12/2025',
    language: 'English',
    whatYouWillLearn: [
      'Master design principles and theory',
      'Create professional logos and branding',
      'Design for print and digital media',
      'Work with Adobe Creative Suite',
      'Build a stunning portfolio',
      'Understand typography and color',
    ],
    requirements: [
      'No prior design experience needed',
      'Access to design software (free alternatives provided)',
    ],
    curriculum: [
      { section: 'Design Fundamentals', lectures: 30, duration: '5h 45m' },
      { section: 'Logo Design & Branding', lectures: 25, duration: '4h 30m' },
      { section: 'Typography Mastery', lectures: 20, duration: '3h 15m' },
      { section: 'Color Theory', lectures: 18, duration: '2h 50m' },
      { section: 'Layout & Composition', lectures: 22, duration: '3h 40m' },
    ],
  },
  {
    id: '5',
    title: 'iOS & Swift - The Complete iOS App Development Bootcamp',
    instructor: 'Dr. Angela Yu',
    rating: 4.8,
    reviewCount: 234567,
    price: 24.99,
    originalPrice: 139.99,
    image: 'https://images.unsplash.com/photo-1633250391894-397930e3f5f2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2JpbGUlMjBhcHAlMjBkZXZlbG9wbWVudHxlbnwxfHx8fDE3NzE0OTA2MzF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    category: 'development',
    level: 'All Levels',
    duration: '55 hours',
    students: 589234,
    description: 'Learn iOS app development with Swift and SwiftUI. Build real apps and publish them to the App Store.',
    lastUpdated: '2/2026',
    language: 'English',
    whatYouWillLearn: [
      'Master Swift programming language',
      'Build iOS apps with SwiftUI',
      'Work with Core Data and APIs',
      'Implement ARKit and Machine Learning',
      'Design beautiful user interfaces',
      'Publish apps to the App Store',
    ],
    requirements: [
      'Mac computer with macOS',
      'No programming experience needed',
    ],
    curriculum: [
      { section: 'Swift Fundamentals', lectures: 58, duration: '11h 30m' },
      { section: 'iOS Development Basics', lectures: 62, duration: '13h 45m' },
      { section: 'SwiftUI Mastery', lectures: 55, duration: '12h 20m' },
      { section: 'Advanced iOS Features', lectures: 48, duration: '10h 15m' },
      { section: 'Publishing Your App', lectures: 25, duration: '4h 10m' },
    ],
    bestseller: true,
  },
];
