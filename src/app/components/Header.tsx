import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Search, User, LogOut, BookOpen,
  LayoutDashboard, HelpCircle, ShoppingCart,
  Sun, Moon, Coins,
} from 'lucide-react';
import { Tier } from '@/app/services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useAuth } from '@/app/store/AuthContext';
import { useCart } from '@/app/store/CartContext';
import { useTheme } from '@/app/store/ThemeContext';
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue';
import { toast } from 'sonner';

const TIER_COLORS: Record<Tier, string> = {
  BRONZE: 'bg-amber-700',
  SILVER: 'bg-slate-400',
  GOLD: 'bg-yellow-500',
  PLATINUM: 'bg-cyan-400',
};

const TIER_LABEL: Record<Tier, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
};

function loadSearchCourses() {
  try {
    const raw = localStorage.getItem('da_public_courses_cache');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, coin, tier, leaderboardPosition } = useAuth();
  const { items: cartItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const cartCount = cartItems.length;

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeRowRef = useRef<HTMLButtonElement | null>(null);
  const desktopInputRef = useRef<HTMLInputElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);

  const debouncedQuery = useDebouncedValue(searchQuery, 200);
  const availableCourses = loadSearchCourses();

  const searchResults = debouncedQuery.trim()
    ? availableCourses
        .filter(c =>
          c.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
          c.instructor.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
          c.category.toLowerCase().includes(debouncedQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  // Reset activeIndex whenever the raw query changes
  useEffect(() => {
    setActiveIndex(null);
  }, [searchQuery]);

  // Scroll active row into view
  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchResults.length === 0) return;
      setActiveIndex(prev =>
        prev === null ? 0 : Math.min(prev + 1, searchResults.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchResults.length === 0) return;
      setActiveIndex(prev =>
        prev === null ? searchResults.length - 1 : Math.max(prev - 1, 0)
      );
    } else if (e.key === 'Enter') {
      if (activeIndex !== null && searchResults[activeIndex]) {
        const course = searchResults[activeIndex];
        setShowSearchDropdown(false);
        setSearchQuery('');
        setActiveIndex(null);
        navigate(`/course/${course.slug ?? course.id}`);
      } else if (searchQuery.trim()) {
        setShowSearchDropdown(false);
        setActiveIndex(null);
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    } else if (e.key === 'Escape') {
      setShowSearchDropdown(false);
      setActiveIndex(null);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleSearchBlur = () => {
    setTimeout(() => {
      setShowSearchDropdown(false);
      setActiveIndex(null);
    }, 150);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully.');
  };

  const renderSearchDropdown = (inputId: string) =>
    showSearchDropdown && searchResults.length > 0 ? (
      <div
        id={inputId}
        role="listbox"
        aria-label="Course search results"
        className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-b-lg shadow-lg z-50 mt-1 max-h-72 overflow-y-auto"
      >
        {searchResults.map((course, index) => (
          <button
            key={course.id}
            id={`search-result-${index}`}
            ref={index === activeIndex ? activeRowRef : null}
            role="option"
            aria-selected={index === activeIndex}
            className={[
              'w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-0 focus:outline-none transition-colors',
              index === activeIndex
                ? 'bg-purple-50 dark:bg-slate-800'
                : 'hover:bg-gray-50 dark:hover:bg-slate-800 focus:bg-gray-50 dark:focus:bg-slate-800',
            ].join(' ')}
            onMouseDown={() => {
              setShowSearchDropdown(false);
              setSearchQuery('');
              setActiveIndex(null);
              navigate(`/course/${course.slug ?? course.id}`);
            }}
          >
            <img
              src={course.image}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-10 h-8 object-cover rounded flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium line-clamp-1 dark:text-slate-100">{course.title}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{course.instructor}</p>
            </div>
          </button>
        ))}
      </div>
    ) : null;

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-3 md:gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Digital Academy home">
            <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center">
              <span className="text-white text-xl font-bold">D</span>
            </div>
            <span className="font-bold text-lg sm:text-xl hidden sm:inline dark:text-slate-100">Digital Academy</span>
          </Link>

          {/* Search Bar (desktop) */}
          <div className="hidden md:block flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" aria-hidden="true" />
            <Input
              ref={desktopInputRef}
              type="search"
              placeholder="Search for anything"
              aria-label="Search courses"
              role="combobox"
              aria-expanded={showSearchDropdown && searchResults.length > 0}
              aria-controls="search-results-desktop"
              aria-activedescendant={activeIndex !== null ? `search-result-${activeIndex}` : undefined}
              className="w-full pl-11 pr-4 py-2 border-gray-300 focus:border-purple-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => setShowSearchDropdown(true)}
              onBlur={handleSearchBlur}
            />
            {renderSearchDropdown('search-results-desktop')}
          </div>

          {/* Right Side */}
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden dark:hover:bg-slate-800 dark:text-slate-300"
              onClick={() => navigate('/search')}
              aria-label="Open search"
            >
              <Search className="w-5 h-5" />
            </Button>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              aria-pressed={theme === 'dark'}
              className="dark:hover:bg-slate-800 dark:text-slate-300"
            >
              {theme === 'dark'
                ? <Sun className="w-5 h-5" aria-hidden="true" />
                : <Moon className="w-5 h-5" aria-hidden="true" />}
            </Button>

            {/* Coin pill — authenticated students only, ≥ 360px */}
            {isAuthenticated && user?.role === 'student' && (
              <div
                className="hidden min-[360px]:flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                aria-label={`${coin} coins`}
              >
                <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <span className="text-sm font-medium text-amber-900 dark:text-amber-300">{coin}</span>
              </div>
            )}

            {/* Tier dot — authenticated students only, always visible */}
            {isAuthenticated && user?.role === 'student' && (
              <Link
                to="/leaderboard"
                aria-label={tier ? `${TIER_LABEL[tier]} tier, position ${leaderboardPosition ?? '—'}` : 'Unranked, view leaderboard'}
                title={tier ? `${TIER_LABEL[tier]} — #${leaderboardPosition ?? '—'}` : 'Unranked'}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:ring-2 hover:ring-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
              >
                <span
                  className={`w-3 h-3 rounded-full ${tier ? TIER_COLORS[tier] : 'bg-slate-300 dark:bg-slate-600'}`}
                  aria-hidden="true"
                />
              </Link>
            )}

            {/* Cart icon — visible to everyone, count from CartContext */}
            <Link to="/cart" aria-label={`Cart with ${cartCount} item${cartCount === 1 ? '' : 's'}`}>
              <Button variant="ghost" size="icon" className="relative dark:hover:bg-slate-800 dark:text-slate-300">
                <ShoppingCart className="w-5 h-5" aria-hidden="true" />
                {cartCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Help */}
            <Link to="/help">
              <Button variant="ghost" size="sm" className="hidden lg:flex gap-1.5 text-gray-600 dark:text-slate-300 hover:text-purple-700 dark:hover:bg-slate-800 dark:hover:text-purple-400">
                <HelpCircle className="w-4 h-4" aria-hidden="true" />
                Help
              </Button>
            </Link>

            {/* User Area */}
            {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:ring-2 hover:ring-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all ml-1"
                  aria-label="Open user menu"
                >
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden select-none">
                    {user?.avatar
                      ? <img src={user.avatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      : user?.name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-60 z-50">
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

                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer py-2"
                  onClick={() => navigate('/profile')}
                >
                  <User className="w-4 h-4" aria-hidden="true" />
                  My Profile
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer py-2"
                  onClick={() => navigate('/profile?tab=courses')}
                >
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                  My Courses
                </DropdownMenuItem>

                {user?.role === 'instructor' && (
                  <DropdownMenuItem
                    className="flex items-center gap-2 cursor-pointer py-2"
                    onClick={() => navigate('/instructor')}
                  >
                    <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
                    Instructor Dashboard
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer py-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            ) : (
            <>
              <div className="hidden sm:flex items-center gap-2 ml-1">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="dark:text-slate-300 dark:hover:bg-slate-800">Log In</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700">Sign Up</Button>
                </Link>
              </div>
              <Link to="/login" className="sm:hidden">
                <Button variant="ghost" size="sm" className="dark:text-slate-300 dark:hover:bg-slate-800">Log In</Button>
              </Link>
            </>
            )}
          </div>
        </div>

        {/* Search Bar (mobile) */}
        <div className="mt-3 md:hidden relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" aria-hidden="true" />
          <Input
            ref={mobileInputRef}
            type="search"
            placeholder="Search for anything"
            aria-label="Search courses"
            role="combobox"
            aria-expanded={showSearchDropdown && searchResults.length > 0}
            aria-controls="search-results-mobile"
            aria-activedescendant={activeIndex !== null ? `search-result-${activeIndex}` : undefined}
            className="w-full pl-11 pr-4 py-2 border-gray-300 focus:border-purple-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => setShowSearchDropdown(true)}
            onBlur={handleSearchBlur}
          />
          {renderSearchDropdown('search-results-mobile')}
        </div>
      </div>
    </header>
  );
}
