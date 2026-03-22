import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Mail, MessageSquare, HelpCircle, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function ContactUs() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSubmitted(true);
    toast.success('Message sent! We\'ll get back to you within 24 hours.');
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-lg sm:text-xl text-purple-100">We'd love to hear from you. Send us a message and we'll respond shortly.</p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 xl:gap-12">

            {/* Contact Info */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Email</h3>
                  <p className="text-gray-600 text-sm">support@digitalacademy.com</p>
                  <p className="text-gray-500 text-xs mt-1">We reply within 24 hours</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Live Chat</h3>
                  <p className="text-gray-600 text-sm">Available Monday–Friday</p>
                  <p className="text-gray-500 text-xs mt-1">9:00 AM – 6:00 PM UTC</p>
                </div>
              </div>

              <div className="border-t pt-6 mt-6">
                <h3 className="font-semibold mb-4">Quick Links</h3>
                <ul className="space-y-3 text-sm">
                  <li>
                    <Link to="/help" className="flex items-center gap-2 text-purple-600 hover:underline">
                      <HelpCircle className="w-4 h-4" /> Help Center & FAQ
                    </Link>
                  </li>
                  <li>
                    <Link to="/courses" className="flex items-center gap-2 text-purple-600 hover:underline">
                      <BookOpen className="w-4 h-4" /> Browse Courses
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Contact Form */}
            <div className="xl:col-span-2">
              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-10 text-center">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-2xl font-bold text-green-800 mb-2">Message Sent!</h3>
                  <p className="text-green-700 mb-6">Thank you for reaching out. Our team will respond within 24 hours.</p>
                  <Button onClick={() => setSubmitted(false)} variant="outline">Send Another Message</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-8 shadow-sm space-y-5">
                  <h2 className="text-2xl font-bold mb-2">Send a Message</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="Your name"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Subject</label>
                    <Input
                      placeholder="What's this about?"
                      value={form.subject}
                      onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={6}
                      placeholder="Tell us how we can help..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full bg-purple-600 hover:bg-purple-700">
                    Send Message
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
