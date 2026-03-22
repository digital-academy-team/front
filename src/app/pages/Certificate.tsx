import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toCanvas, toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Award, Download, FileImage, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { useAuth } from '@/app/store/AuthContext';
import { courseApi, resolveCourseId } from '@/app/services/api';
import { courses, type Course } from '@/app/data/courses';
import { mapApiCourseToCourse } from '@/app/utils/courseMapper';

interface CertificateCourseData {
  enrollmentId: string;
  courseId: string;
  title: string;
  instructor: string;
  category: string;
  duration: string;
}

function loadCachedCourses(): Course[] {
  try {
    const raw = localStorage.getItem('da_public_courses_cache');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Course[]) : [];
  } catch {
    return [];
  }
}

function formatDate(value: Date): string {
  return value.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function Certificate() {
  const { courseId: routeId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const certificateRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<'pdf' | 'png' | null>(null);
  const [courseData, setCourseData] = useState<CertificateCourseData | null>(null);

  const completionDate = useMemo(() => formatDate(new Date()), []);
  const certificateId = useMemo(() => {
    const seed = `${user?.id ?? 'guest'}:${routeId ?? 'course'}`;
    const hash = Array.from(seed).reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0);
    return `DA-${Math.abs(hash).toString(16).toUpperCase()}`;
  }, [routeId, user?.id]);

  useEffect(() => {
    const loadCertificateData = async () => {
      if (!routeId || !user) {
        setLoading(false);
        return;
      }

      try {
        const [myCoursesRes, publicCoursesRes] = await Promise.all([
          courseApi.myEnrolledCourses(),
          courseApi.userCourses().catch(() => ({ data: [] as any[] })),
        ]);

        const enrolled = (myCoursesRes.data ?? []).find((item) => {
          const resolved = resolveCourseId(item.course);
          return item.id === routeId || resolved === routeId;
        });

        const cached = loadCachedCourses();
        const localPool = [...cached, ...courses];
        const apiPool = (publicCoursesRes.data ?? []).map(mapApiCourseToCourse);
        const allCourses = [...apiPool, ...localPool];

        const resolvedCourseId = resolveCourseId(enrolled?.course ?? null);
        const match = allCourses.find((item) => item.id === routeId || item.slug === routeId || item.id === resolvedCourseId);

        const enrollmentId = enrolled?.id ?? routeId;

        setCourseData({
          enrollmentId,
          courseId: match?.id ?? resolvedCourseId ?? routeId,
          title: match?.title ?? 'Course',
          instructor: match?.instructor ?? 'Digital Academy',
          category: match?.category ?? 'General',
          duration: match?.duration ?? 'Self-paced',
        });
      } catch {
        setCourseData(null);
      } finally {
        setLoading(false);
      }
    };

    loadCertificateData();
  }, [routeId, user]);

  const exportAsPng = async () => {
    if (!certificateRef.current || !courseData) return;

    try {
      setDownloading('png');
      const imageData = await toPng(certificateRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#f6f0de',
      });

      const link = document.createElement('a');
      link.href = imageData;
      link.download = `${courseData.title.replace(/\s+/g, '-').toLowerCase()}-certificate.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Certificate downloaded as PNG.');
    } catch {
      toast.error('PNG download failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const exportAsPdf = async () => {
    if (!courseData) return;

    try {
      setDownloading('pdf');
      const blob = await courseApi.downloadCertificate(courseData.enrollmentId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${courseData.title.replace(/\s+/g, '-').toLowerCase()}-certificate.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Official certificate downloaded as PDF.');
    } catch (error: any) {
      toast.error(error?.message ?? 'PDF download failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <Card>
          <CardContent className="py-16 text-center text-gray-600 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            Preparing your certificate...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || !courseData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Card>
          <CardContent className="py-16 text-center">
            <h1 className="text-2xl font-bold mb-2">Certificate Unavailable</h1>
            <p className="text-gray-600 mb-6">We could not find your certificate details for this course.</p>
            <Link to="/profile?tab=credentials">
              <Button>Back to Credentials</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-amber-900">Certificate Of Completion</h1>
          <p className="text-amber-800/80 mt-1">Issued by Digital Academy</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={exportAsPng}
            disabled={downloading !== null}
            className="border-amber-600 text-amber-800 hover:bg-amber-100"
          >
            {downloading === 'png' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileImage className="w-4 h-4 mr-2" />}
            Download PNG
          </Button>
          <Button
            onClick={exportAsPdf}
            disabled={downloading !== null}
            className="bg-amber-700 hover:bg-amber-800 text-white"
          >
            {downloading === 'pdf' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            Download PDF
          </Button>
        </div>
      </div>

      <div className="rounded-2xl p-3 bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-200 shadow-xl">
        <div
          ref={certificateRef}
          className="relative overflow-hidden rounded-xl border border-amber-300 bg-[#f6f0de] p-6 md:p-10 min-h-[520px]"
        >
          <div className="absolute inset-0 opacity-35 pointer-events-none" style={{
            backgroundImage:
              'radial-gradient(circle at 25% 20%, #fbbf24 0, transparent 40%), radial-gradient(circle at 75% 80%, #d97706 0, transparent 35%)',
          }} />

          <div className="relative h-full border-2 border-amber-700/40 rounded-lg p-6 md:p-10 bg-white/45 backdrop-blur-[1px]">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.45em] text-amber-900/70">Digital Academy</p>
              <h2 className="text-3xl md:text-5xl mt-4 font-black text-amber-950">Certificate</h2>
              <p className="text-base md:text-lg text-amber-900 mt-2">This certifies that</p>
              <p className="text-4xl md:text-6xl leading-tight font-serif text-amber-950 mt-4 break-words">{user.name}</p>
              <p className="mt-5 text-amber-900 text-sm md:text-base">has successfully completed the course</p>
              <p className="text-2xl md:text-3xl font-bold text-amber-950 mt-3">{courseData.title}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8 text-sm">
              <div className="rounded-lg border border-amber-800/20 bg-amber-50/70 px-4 py-3">
                <p className="text-amber-900/70 uppercase tracking-wide text-xs">Instructor</p>
                <p className="font-semibold text-amber-950 mt-1">{courseData.instructor}</p>
              </div>
              <div className="rounded-lg border border-amber-800/20 bg-amber-50/70 px-4 py-3">
                <p className="text-amber-900/70 uppercase tracking-wide text-xs">Category</p>
                <p className="font-semibold text-amber-950 mt-1 capitalize">{courseData.category}</p>
              </div>
              <div className="rounded-lg border border-amber-800/20 bg-amber-50/70 px-4 py-3">
                <p className="text-amber-900/70 uppercase tracking-wide text-xs">Duration</p>
                <p className="font-semibold text-amber-950 mt-1">{courseData.duration}</p>
              </div>
            </div>

            <div className="mt-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-amber-900/70">Date of Completion</p>
                <p className="font-semibold text-amber-950 mt-1">{completionDate}</p>
                <p className="text-xs text-amber-900/60 mt-3">Certificate ID: {certificateId}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="font-serif text-2xl text-amber-900">Digital Academy</p>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-900/70">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm text-gray-600">
        <span>Includes your full name and course details.</span>
        <Link to="/profile?tab=credentials" className="inline-flex items-center gap-1 text-amber-800 hover:text-amber-900 font-medium">
          <Download className="w-4 h-4" />
          Back to Credentials
        </Link>
      </div>
    </div>
  );
}
