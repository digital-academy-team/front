import { Link, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { CourseCard } from '../components/CourseCard';
import { courses, categories } from '../data/courses';
import { ArrowRight, CheckCircle, GraduationCap, BookOpen, Globe, TrendingUp, DollarSign, Users, BarChart3, Code2, Briefcase, Palette, Camera, Music2, Dumbbell, Sparkles, Tag } from 'lucide-react';
import { useAuth } from '@/app/store/AuthContext';
import { categoryApi, courseApi } from '@/app/services/api';
import { mapApiCourseToCourse } from '@/app/utils/courseMapper';
import { CategoryIconKey, getCategoryVisuals } from '@/app/utils/categoryVisuals';

interface HomeCategoryItem {
  id: string;
  name: string;
  iconKey: CategoryIconKey;
  colorKey: string;
}

function CategoryIcon({ iconKey, className }: { iconKey: CategoryIconKey; className?: string }) {
  const iconClass = className ?? 'w-6 h-6';

  if (iconKey === 'code') return <Code2 className={iconClass} />;
  if (iconKey === 'briefcase') return <Briefcase className={iconClass} />;
  if (iconKey === 'palette') return <Palette className={iconClass} />;
  if (iconKey === 'trending') return <TrendingUp className={iconClass} />;
  if (iconKey === 'camera') return <Camera className={iconClass} />;
  if (iconKey === 'music') return <Music2 className={iconClass} />;
  if (iconKey === 'dumbbell') return <Dumbbell className={iconClass} />;
  if (iconKey === 'sparkles') return <Sparkles className={iconClass} />;
  return <Tag className={iconClass} />;
}

const categoryColors: Record<string, { bg: string; hover: string; iconBg: string; text: string }> = {
  development: { bg: 'bg-blue-50',    hover: 'hover:bg-blue-100 hover:border-blue-200',   iconBg: 'bg-blue-100',    text: 'text-blue-700' },
  business:    { bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100 hover:border-emerald-200', iconBg: 'bg-emerald-100', text: 'text-emerald-700' },
  design:      { bg: 'bg-orange-50',  hover: 'hover:bg-orange-100 hover:border-orange-200',  iconBg: 'bg-orange-100',  text: 'text-orange-700' },
  marketing:   { bg: 'bg-pink-50',    hover: 'hover:bg-pink-100 hover:border-pink-200',    iconBg: 'bg-pink-100',    text: 'text-pink-700' },
  photography: { bg: 'bg-amber-50',   hover: 'hover:bg-amber-100 hover:border-amber-200',   iconBg: 'bg-amber-100',   text: 'text-amber-700' },
  music:       { bg: 'bg-purple-50',  hover: 'hover:bg-purple-100 hover:border-purple-200',  iconBg: 'bg-purple-100',  text: 'text-purple-700' },
  fitness:     { bg: 'bg-red-50',     hover: 'hover:bg-red-100 hover:border-red-200',     iconBg: 'bg-red-100',     text: 'text-red-700' },
  lifestyle:   { bg: 'bg-teal-50',    hover: 'hover:bg-teal-100 hover:border-teal-200',    iconBg: 'bg-teal-100',    text: 'text-teal-700' },
  default:     { bg: 'bg-slate-50',   hover: 'hover:bg-slate-100 hover:border-slate-200',   iconBg: 'bg-slate-100',   text: 'text-slate-700' },
};

export function Home() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [homeCourses, setHomeCourses] = useState(courses);
  const [homeCategories, setHomeCategories] = useState<HomeCategoryItem[]>(
    categories.map((item) => ({
      id: item.id,
      name: item.name,
      iconKey: getCategoryVisuals(item.name, item.id).iconKey,
      colorKey: getCategoryVisuals(item.name, item.id).colorKey,
    }))
  );

  useEffect(() => {
    let active = true;

    categoryApi
      .list()
      .then((response) => {
        if (!active || !Array.isArray(response?.data) || response.data.length === 0) return;
        setHomeCategories(
          response.data.map((item) => {
            const visuals = getCategoryVisuals(item.title, item.slug);
            return {
              id: item.id,
              name: item.title,
              iconKey: visuals.iconKey,
              colorKey: visuals.colorKey,
            };
          })
        );
      })
      .catch(() => {
        // Keep static fallback categories if API is unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    courseApi
      .userCourses()
      .then((response) => {
        if (!active || !response?.data?.length) return;
        const mappedCourses = response.data.map(mapApiCourseToCourse);
        setHomeCourses(mappedCourses);
        localStorage.setItem('da_public_courses_cache', JSON.stringify(mappedCourses));
      })
      .catch(() => {
        // Keep static fallback if API is unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  const featuredPool = homeCourses.filter(c => c.bestseller);
  const featuredCourses = (featuredPool.length > 0 ? featuredPool : homeCourses).slice(0, 4);
  const popularCourses = homeCourses.slice(0, 8);

  return (
    <div>
      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 text-white overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-16 sm:py-20 xl:py-28">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 xl:gap-12 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm mb-6 border border-white/20">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0" />
                Trusted by 65M+ learners worldwide
              </div>
              <h1 className="text-4xl sm:text-5xl xl:text-7xl font-bold leading-tight mb-6 tracking-tight">
                Learn Without<br />Limits
              </h1>
              <p className="text-lg sm:text-xl xl:text-2xl text-purple-100 mb-8 xl:mb-10 leading-relaxed max-w-xl">
                Start, switch, or advance your career with thousands of courses from world-class instructors.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/courses">
                  <Button size="lg" className="bg-white text-purple-700 hover:bg-purple-50 gap-2 px-7 font-semibold shadow-lg">
                    Explore Courses
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                {isAuthenticated && user?.role === 'instructor' && (
                  <Link to="/instructor">
                    <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20 gap-2 px-7">
                      My Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Right — decorative stats card */}
            <div className="hidden xl:flex items-center justify-center relative">
              <div className="absolute w-72 h-72 bg-purple-400/20 rounded-full blur-3xl" />
              <div className="absolute w-56 h-56 bg-indigo-400/20 rounded-full blur-3xl translate-x-16 translate-y-10" />
              <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl w-full max-w-sm">
                <p className="text-sm font-semibold uppercase tracking-widest text-purple-200 mb-5">Platform at a glance</p>
                <div className="grid grid-cols-2 gap-5 mb-6">
                  {[
                    { Icon: GraduationCap, value: '65M+',  label: 'Students' },
                    { Icon: BookOpen,      value: '210K+', label: 'Courses' },
                    { Icon: Globe,         value: '75+',   label: 'Languages' },
                    { Icon: TrendingUp,    value: '4.8★',  label: 'Avg Rating' },
                  ].map(({ Icon, value, label }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-purple-200" />
                      </div>
                      <div>
                        <div className="text-lg font-bold leading-tight">{value}</div>
                        <div className="text-sm text-purple-300">{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/15 pt-5 space-y-2.5">
                  {['Learn at your own pace', 'Certificate on completion', 'Expert instructors'].map(text => (
                    <div key={text} className="flex items-center gap-2.5 text-base text-purple-100">
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Courses ── */}
      <section className="py-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <p className="text-base font-semibold text-purple-600 uppercase tracking-wider mb-1">Handpicked for you</p>
              <h2 className="text-3xl sm:text-4xl font-bold">Featured Courses</h2>
            </div>
            <Link to="/courses">
              <Button variant="outline" className="gap-2 text-sm">
                View all courses <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {featuredCourses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="py-20 bg-gray-50/70">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8">
          <div className="text-center mb-10">
              <p className="text-base font-semibold text-purple-600 uppercase tracking-wider mb-1">What do you want to learn?</p>
              <h2 className="text-3xl sm:text-4xl font-bold">Browse Top Categories</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4">
            {homeCategories.map(category => {
              const colors = categoryColors[category.colorKey] ?? categoryColors.default;
              return (
                <Link
                  key={category.id}
                  to={`/courses?category=${encodeURIComponent(category.id)}`}
                  className={`${colors.bg} ${colors.hover} border border-transparent rounded-xl p-4 text-center group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
                >
                  <div className={`${colors.iconBg} w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${colors.text}`}>
                    <CategoryIcon iconKey={category.iconKey} className="w-6 h-6" />
                  </div>
                  <h3 className={`text-sm font-semibold ${colors.text} leading-tight`}>
                    {category.name}
                  </h3>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Popular Courses (horizontal scroll) ── */}
      <section className="py-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <p className="text-base font-semibold text-purple-600 uppercase tracking-wider mb-1">Trending now</p>
              <h2 className="text-3xl sm:text-4xl font-bold">Popular Courses</h2>
            </div>
            <Link to="/courses">
              <Button variant="outline" className="gap-2 text-sm">
                See all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
            {popularCourses.map(course => (
              <div key={course.id} className="shrink-0 w-64">
                <CourseCard course={course} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Become an Instructor CTA ── */}
      <section className="bg-gradient-to-br from-purple-700 to-indigo-800 text-white py-24">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 xl:gap-12 items-center">
            <div>
              <p className="text-base font-semibold text-purple-300 uppercase tracking-wider mb-3">Share your expertise</p>
              <h2 className="text-4xl sm:text-5xl font-bold mb-5 leading-tight">Become an Instructor</h2>
              <p className="text-lg sm:text-xl text-purple-100 mb-8 leading-relaxed">
                Share your knowledge with millions of students worldwide. Create an online video course, reach students across the globe, and earn money.
              </p>
              <Button
                size="lg"
                className="bg-white text-purple-700 hover:bg-purple-50 gap-2 px-8 font-semibold shadow-lg"
                onClick={() => {
                  if (isAuthenticated && user?.role === 'instructor') navigate('/instructor');
                  else navigate('/signup');
                }}
              >
                Start Teaching Today
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { Icon: Users,      title: 'Global Reach',    desc: 'Connect with 65M+ students across 190+ countries' },
                { Icon: DollarSign, title: 'Earn Revenue',    desc: 'Set your price and earn from every enrollment' },
                { Icon: BarChart3,  title: 'Track Analytics', desc: 'Monitor student progress with detailed dashboards' },
                { Icon: BookOpen,   title: 'Easy to Create',  desc: 'Our tools make course creation straightforward' },
              ].map(({ Icon, title, desc }) => (
                <div key={title} className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-5 hover:bg-white/15 transition-colors">
                  <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-base mb-1">{title}</h3>
                  <p className="text-sm text-purple-200 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted Companies ── */}
      <section className="py-16 border-t overflow-hidden bg-gray-50/50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8">
          <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-10">
            Trusted by 15,000+ companies and millions of learners worldwide
          </p>
          <div className="relative">
            <div className="flex animate-marquee gap-16 items-center whitespace-nowrap">
              {[...Array(2)].map((_, dupIdx) => (
                <div key={dupIdx} className="flex gap-16 items-center shrink-0">
                  {[
                    { name: 'Volkswagen', color: '#1A1A1A' },
                    { name: 'Samsung',    color: '#1428A0' },
                    { name: 'Cisco',      color: '#049FD9' },
                    { name: 'Vimeo',      color: '#1AB7EA' },
                    { name: 'P&G',        color: '#003399' },
                    { name: 'HP',         color: '#0096D6' },
                    { name: 'Netflix',    color: '#E50914' },
                    { name: 'Adobe',      color: '#FF0000' },
                  ].map(({ name, color }) => (
                    <div
                      key={name}
                      className="opacity-30 hover:opacity-60 transition-opacity duration-300 select-none"
                      style={{ color, fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
