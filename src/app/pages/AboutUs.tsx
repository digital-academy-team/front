import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { GraduationCap, Users, Globe, Award } from 'lucide-react';

export default function AboutUs() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">About Digital Academy</h1>
          <p className="text-lg sm:text-xl text-purple-100 max-w-2xl mx-auto">
            We are on a mission to improve lives through learning. Our platform connects
            ambitious learners with expert instructors from around the world.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 xl:gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-4">
                Digital Academy was founded with a simple belief: everyone deserves access to
                quality education. We work with expert instructors to create courses that are
                engaging, up-to-date, and genuinely useful in the real world.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                From coding bootcamps to business strategy, design thinking to data science,
                our library of 210,000+ courses covers virtually every professional skill.
              </p>
              <Link to="/courses">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                  Browse Courses
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-purple-50 p-6 rounded-xl text-center">
                <GraduationCap className="w-10 h-10 text-purple-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-purple-600 mb-1">65M+</div>
                <div className="text-gray-600 font-medium">Students</div>
              </div>
              <div className="bg-purple-50 p-6 rounded-xl text-center">
                <Users className="w-10 h-10 text-purple-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-purple-600 mb-1">75K+</div>
                <div className="text-gray-600 font-medium">Instructors</div>
              </div>
              <div className="bg-purple-50 p-6 rounded-xl text-center">
                <Globe className="w-10 h-10 text-purple-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-purple-600 mb-1">75+</div>
                <div className="text-gray-600 font-medium">Languages</div>
              </div>
              <div className="bg-purple-50 p-6 rounded-xl text-center">
                <Award className="w-10 h-10 text-purple-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-purple-600 mb-1">210K+</div>
                <div className="text-gray-600 font-medium">Courses</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">What We Stand For</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🌍</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Accessible Education</h3>
              <p className="text-gray-600">
                We believe quality education should be available to everyone, regardless of
                geography or background. Our platform is accessible in 75+ languages.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Career Transformation</h3>
              <p className="text-gray-600">
                We help students start new careers, advance in current ones, and build
                real-world skills that employers value. Our courses are built for outcomes.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🤝</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Instructor Partnership</h3>
              <p className="text-gray-600">
                Our instructors are the heart of Digital Academy. We provide the tools,
                audience, and support for experts to share their knowledge and earn income.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-purple-600 text-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Join Millions of Learners</h2>
          <p className="text-purple-100 text-lg mb-8">
            Start your learning journey today with a free account.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" variant="secondary">Create Free Account</Button>
            </Link>
            <Link to="/courses">
              <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10">
                Browse Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
