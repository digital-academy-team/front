import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, ChevronUp, BookOpen, ShoppingCart, User, Play, Award, HelpCircle, GraduationCap, LayoutDashboard, Search } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

const faqSections: FAQSection[] = [
  {
    title: 'Getting Started',
    icon: <GraduationCap className="w-5 h-5" />,
    items: [
      {
        question: 'What is Digital Academy?',
        answer: 'Digital Academy is an online learning platform where you can browse thousands of courses taught by expert instructors. You can learn web development, data science, design, marketing, and much more — at your own pace, from anywhere.',
      },
      {
        question: 'Do I need to create an account to browse courses?',
        answer: 'No. You can browse and preview all courses without an account. You only need to create a free account when you want to enroll in courses, track progress, and access course content.',
      },
      {
        question: 'How do I create an account?',
        answer: 'Click "Sign Up" in the top navigation. Fill in your name, email, and password. Choose your role — Student (to learn) or Instructor (to teach). After signing up, you can immediately start browsing and enrolling in courses.',
      },
    ],
  },
  {
    title: 'Finding & Enrolling in Courses',
    icon: <Search className="w-5 h-5" />,
    items: [
      {
        question: 'How do I find a course?',
        answer: 'Use the search bar at the top to search by topic, keyword, or instructor name. You can also browse by category using the "Categories" dropdown or the quick links in the navigation bar (Development, Design, Marketing, etc.). On the Courses page, use the filters on the left to narrow results by category, difficulty level, or price.',
      },
      {
        question: 'How do I enroll in a course?',
        answer: 'Click on any course to view its details. If it\'s a paid course, click "Add to Cart" and proceed through the checkout. If it\'s free, you can enroll directly. Once enrolled, the course appears in "My Courses" in your profile, and you can start learning immediately.',
      },
      {
        question: 'Are there free courses?',
        answer: 'Yes! Some courses are available for free. Look for courses marked with a $0 price. You can filter by price on the course listing page to find free options.',
      },
      {
        question: 'What is a bestseller badge?',
        answer: 'Courses marked with a "Bestseller" badge are the most popular courses in their category based on enrollment numbers and ratings. These are great starting points if you\'re unsure which course to choose.',
      },
    ],
  },
  {
    title: 'Learning & Course Content',
    icon: <Play className="w-5 h-5" />,
    items: [
      {
        question: 'How do I access my enrolled courses?',
        answer: 'Click on your profile avatar (top right) and select "My Courses", or go to your Profile page and click the "My Courses" tab. From there, click "Start" or "Continue" to open the course learning page.',
      },
      {
        question: 'How does the learning interface work?',
        answer: 'The learning page has a video lecture area on the left and your course curriculum on the right sidebar. Click on any lecture in the sidebar to navigate directly to it. Use the "Mark Complete" button to track your progress. Each section also has a quiz you can access via the "Section Quiz" tab.',
      },
      {
        question: 'What are section quizzes?',
        answer: 'Each course section has a multiple-choice quiz to test your understanding of the material. You need to score at least 60% to pass. You can retake quizzes as many times as you want. Your best score is saved and shown on the quiz screen. Passed quizzes are marked with a green badge.',
      },
      {
        question: 'How is my progress tracked?',
        answer: 'Your progress is automatically saved as you mark lectures complete. The progress bar on the learning page and in "My Courses" shows your completion percentage. Progress is stored locally in your browser, so it persists between sessions on the same device.',
      },
      {
        question: 'Can I jump between sections and lectures?',
        answer: 'Yes! Use the course content sidebar on the right side of the learning page to jump to any section or lecture at any time. Completed lectures are marked with a green checkmark.',
      },
    ],
  },
  {
    title: 'Payments & Billing',
    icon: <ShoppingCart className="w-5 h-5" />,
    items: [
      {
        question: 'How do I purchase a course?',
        answer: 'Add the course to your cart by clicking "Add to Cart" on the course detail page. Go to your cart, review your order, and click "Proceed to Checkout". Fill in your payment details and complete the purchase. The course will instantly appear in your "My Courses".',
      },
      {
        question: 'What payment methods are accepted?',
        answer: 'Currently we support credit and debit cards. Payment processing is handled securely.',
      },
      {
        question: 'Where can I see my purchase history?',
        answer: 'Go to your Profile page and click the "Payments" tab. You\'ll see a full history of all your course purchases with dates, amounts, and statuses.',
      },
      {
        question: 'Can I get a refund?',
        answer: 'Refund requests can be submitted within 30 days of purchase if you\'re not satisfied. Contact our support team with your order details. Refunds are processed within 5-7 business days.',
      },
      {
        question: 'Are prices shown in USD?',
        answer: 'Yes, all prices on the platform are displayed in US Dollars (USD). Courses are frequently discounted, so you\'ll often see the original price crossed out with a lower sale price shown.',
      },
    ],
  },
  {
    title: 'Your Profile & Account',
    icon: <User className="w-5 h-5" />,
    items: [
      {
        question: 'How do I update my profile?',
        answer: 'Click on your avatar in the top navigation and select "My Profile", or go directly to the Profile page. You can update your name, email, bio, and profile photo from the "My Profile" tab. Click "Save Changes" to apply updates.',
      },
      {
        question: 'What information is in my profile?',
        answer: 'Your profile page has six sections: My Profile (personal info & photo), My Courses (all enrolled courses with progress), Payments (purchase history), Credentials (earned certificates), Security (change password), and Notifications (email preferences).',
      },
      {
        question: 'How do I change my password?',
        answer: 'Go to your Profile page and click the "Security" tab. Enter your current password and then your new password (minimum 8 characters). Click "Update Password". Password changes require a live backend connection.',
      },
      {
        question: 'How do I log out?',
        answer: 'Click on your avatar in the top navigation and select "Log Out" at the bottom of the dropdown menu.',
      },
    ],
  },
  {
    title: 'Certificates & Credentials',
    icon: <Award className="w-5 h-5" />,
    items: [
      {
        question: 'How do I earn a certificate?',
        answer: 'Complete all lectures in a course (mark each one as complete) to earn a certificate of completion. Once a course is 100% complete, a "View Certificate" button appears in your "My Courses" and "Credentials" tabs.',
      },
      {
        question: 'Where can I find my certificates?',
        answer: 'Go to your Profile page and click the "Credentials" tab. All your earned certificates are listed there. Courses not yet completed show your current progress so you can see how close you are.',
      },
      {
        question: 'Can I share my certificate?',
        answer: 'Yes! Certificates include a "Share on LinkedIn" button so you can directly add your achievement to your LinkedIn profile. You can also print or save the certificate as a PDF through your browser\'s print function.',
      },
    ],
  },
  {
    title: 'For Instructors',
    icon: <LayoutDashboard className="w-5 h-5" />,
    items: [
      {
        question: 'How do I become an instructor?',
        answer: 'Sign up and select "Instructor" as your role during registration. You\'ll gain access to the Instructor Dashboard where you can create and manage courses, view student analytics, and track your earnings.',
      },
      {
        question: 'What can I do in the Instructor Dashboard?',
        answer: 'The Instructor Dashboard gives you an overview of your courses, total students, revenue, and monthly enrollment trends with interactive charts. You can view your course list with individual performance stats and create new courses.',
      },
    ],
  },
];

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-sm pr-4">{item.question}</span>
            {openIndex === idx
              ? <ChevronUp className="w-4 h-4 text-purple-600 flex-shrink-0" />
              : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          </button>
          {openIndex === idx && (
            <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3 bg-gray-50">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Help() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = faqSections.map(section => ({
    ...section,
    items: section.items.filter(
      item =>
        !searchQuery ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(section => section.items.length > 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
          <HelpCircle className="w-8 h-8 text-purple-600" />
        </div>
        <h1 className="text-4xl font-bold mb-3">Help Center</h1>
        <p className="text-gray-600 text-lg max-w-xl mx-auto">
          Find answers to common questions about using Digital Academy
        </p>

        {/* Search */}
        <div className="mt-6 max-w-md mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>
      </div>

      {/* How It Works */}
      {!searchQuery && (
        <div className="mb-14">
          <h2 className="text-2xl font-bold mb-6 text-center">How Digital Academy Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', icon: <Search className="w-6 h-6" />, title: 'Find a Course', desc: 'Browse thousands of courses by category, or search for a specific topic or skill.' },
              { step: '2', icon: <ShoppingCart className="w-6 h-6" />, title: 'Enroll', desc: 'Add the course to your cart and complete checkout. Free courses are available instantly.' },
              { step: '3', icon: <Play className="w-6 h-6" />, title: 'Start Learning', desc: 'Access video lectures, take quizzes, and track your progress at your own pace.' },
              { step: '4', icon: <Award className="w-6 h-6" />, title: 'Earn a Certificate', desc: 'Complete all lectures to unlock your certificate of completion.' },
            ].map(item => (
              <div key={item.step} className="text-center p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 text-purple-600 rounded-full mb-4">
                  {item.icon}
                </div>
                <div className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-1">Step {item.step}</div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Section nav */}
        {!searchQuery && (
          <div className="lg:col-span-1">
            <div className="sticky top-28">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Topics</p>
              <nav className="space-y-1">
                {faqSections.map(section => (
                  <button
                    key={section.title}
                    onClick={() => {
                      setActiveSection(activeSection === section.title ? null : section.title);
                      document.getElementById(`section-${section.title}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                  >
                    <span className="text-purple-500">{section.icon}</span>
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* FAQ content */}
        <div className={searchQuery ? 'lg:col-span-4' : 'lg:col-span-3'}>
          {filteredSections.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <HelpCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No results found for "{searchQuery}"</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}
          {filteredSections.map(section => (
            <div key={section.title} id={`section-${section.title}`} className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-purple-600">{section.icon}</span>
                <h2 className="text-lg font-bold">{section.title}</h2>
              </div>
              <FAQAccordion items={section.items} />
            </div>
          ))}
        </div>
      </div>

      {/* Still need help */}
      <div className="mt-12 text-center p-8 bg-gray-50 rounded-2xl border border-gray-100">
        <h3 className="font-bold text-lg mb-2">Still have questions?</h3>
        <p className="text-gray-600 text-sm mb-4">
          Can't find what you're looking for? Browse all courses or create an account to start learning.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/courses">
            <Button variant="outline" className="gap-2">
              <BookOpen className="w-4 h-4" /> Browse Courses
            </Button>
          </Link>
          <Link to="/signup">
            <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
              <User className="w-4 h-4" /> Create Free Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
