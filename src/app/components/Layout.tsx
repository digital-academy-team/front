import { Outlet, Link } from 'react-router';
import { Header } from './Header';
import { Github, Twitter, Linkedin, Instagram } from 'lucide-react';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-gray-950 text-white">
        {/* Top accent line */}
        <div className="h-1 bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          {/* Brand + tagline */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-10 mb-12">
            <div className="max-w-xs">
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-purple-600 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-white text-lg font-bold">D</span>
                </div>
                <span className="font-bold text-lg">Digital Academy</span>
              </Link>
              <p className="text-sm text-gray-400 leading-relaxed">
                Empowering millions of learners worldwide with quality education from expert instructors.
              </p>
              <div className="flex items-center gap-3 mt-5">
                {[
                  { Icon: Twitter,   href: '#', label: 'Twitter'   },
                  { Icon: Linkedin,  href: '#', label: 'LinkedIn'  },
                  { Icon: Github,    href: '#', label: 'GitHub'    },
                  { Icon: Instagram, href: '#', label: 'Instagram' },
                ].map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="w-8 h-8 bg-gray-800 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links grid */}
            <div className="grid grid-cols-3 gap-10">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Company</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link to="/about"   className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
                  <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contact Us</Link></li>
                  <li><Link to="/signup"  className="text-gray-400 hover:text-white transition-colors">Teach with Us</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Support</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link to="/help" className="text-gray-400 hover:text-white transition-colors">Help Center</Link></li>
                  <li><Link to="/help" className="text-gray-400 hover:text-white transition-colors">FAQ</Link></li>
                  <li><Link to="/help" className="text-gray-400 hover:text-white transition-colors">Documentation</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Legal</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link to="/help" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
                  <li><Link to="/help" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-gray-500">© 2026 Digital Academy, Inc. All rights reserved.</p>
            <p className="text-xs text-gray-600">Built for learners everywhere 🌍</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
