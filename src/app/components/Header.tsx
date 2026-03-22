import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Search, User, LogOut, BookOpen,
  LayoutDashboard, HelpCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { courses } from '../data/courses';
import { useAuth } from '@/app/store/AuthContext';
import { toast } from 'sonner';

function loadSearchCourses() {
  try {
    const raw = localStorage.getItem('da_public_courses_cache');
    if (!raw) return courses;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? [...parsed, ...courses] : courses;
  } catch {
    return courses;
  }
}

export function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const availableCourses = loadSearchCourses();

  const searchResults = searchQuery.trim()
    ? availableCourses
        .filter(c =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setShowSearchDropdown(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchBlur = () => {
    setTimeout(() => setShowSearchDropdown(false), 150);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully.');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-3 md:gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center">
              <span className="text-white text-xl font-bold">D</span>
            </div>
            <span className="font-bold text-lg sm:text-xl hidden sm:inline">Digital Academy</span>
          </Link>

          {/* Search Bar (desktop) */}
          <div className="hidden md:block flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <Input
              type="search"
              placeholder="Search for anything"
              className="w-full pl-11 pr-4 py-2 border-gray-300 focus:border-purple-600"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => setShowSearchDropdown(true)}
              onBlur={handleSearchBlur}
            />
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-50 mt-1">
                {searchResults.map(course => (
                  <button
                    key={course.id}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b last:border-0"
                    onMouseDown={() => {
                      setShowSearchDropdown(false);
                      setSearchQuery('');
                      navigate(`/course/${course.slug ?? course.id}`);
                    }}
                  >
                    <img src={course.image} alt={course.title} className="w-10 h-8 object-cover rounded flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{course.title}</p>
                      <p className="text-xs text-gray-500">{course.instructor}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Side */}
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => navigate('/search')}
              aria-label="Open search"
            >
              <Search className="w-5 h-5" />
            </Button>

            {/* Help */}
            <Link to="/help">
              <Button variant="ghost" size="sm" className="hidden lg:flex gap-1.5 text-gray-600 hover:text-purple-700">
                <HelpCircle className="w-4 h-4" />
                Help
              </Button>
            </Link>

            {/* User Area */}
            {isAuthenticated ? (
            <DropdownMenu>
              {/* Use a plain <button> — avoids double-Slot issue with Button+asChild */}
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:ring-2 hover:ring-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all ml-1"
                  aria-label="Open user menu"
                >
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden select-none">
                    {user?.avatar
                      ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      : user?.name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-60 z-50">
                {/* User info header */}
                <div className="px-4 py-3 border-b">
                  <p className="font-semibold text-sm leading-tight">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1.5 inline-block font-medium ${
                    user?.role === 'instructor'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user?.role}
                  </span>
                </div>

                {/* Navigation items — use onClick+navigate to avoid asChild/Link issues */}
                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer py-2"
                  onClick={() => navigate('/profile')}
                >
                  <User className="w-4 h-4" />
                  My Profile
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer py-2"
                  onClick={() => navigate('/profile?tab=courses')}
                >
                  <BookOpen className="w-4 h-4" />
                  My Courses
                </DropdownMenuItem>

                {user?.role === 'instructor' && (
                  <DropdownMenuItem
                    className="flex items-center gap-2 cursor-pointer py-2"
                    onClick={() => navigate('/instructor')}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Instructor Dashboard
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {/* Log Out */}
                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer py-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            ) : (
            /* Not logged in — show Log In + Sign Up */
            <>
              <div className="hidden sm:flex items-center gap-2 ml-1">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Log In</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700">Sign Up</Button>
                </Link>
              </div>
              <Link to="/login" className="sm:hidden">
                <Button variant="ghost" size="sm">Log In</Button>
              </Link>
            </>
            )}
          </div>
        </div>

        {/* Search Bar (mobile) */}
        <div className="mt-3 md:hidden relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <Input
            type="search"
            placeholder="Search for anything"
            className="w-full pl-11 pr-4 py-2 border-gray-300 focus:border-purple-600"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => setShowSearchDropdown(true)}
            onBlur={handleSearchBlur}
          />
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-50 mt-1">
              {searchResults.map(course => (
                <button
                  key={course.id}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b last:border-0"
                onMouseDown={() => {
                  setShowSearchDropdown(false);
                  setSearchQuery('');
                  navigate(`/course/${course.slug ?? course.id}`);
                }}
              >
                  <img src={course.image} alt={course.title} className="w-10 h-8 object-cover rounded flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{course.title}</p>
                    <p className="text-xs text-gray-500">{course.instructor}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
