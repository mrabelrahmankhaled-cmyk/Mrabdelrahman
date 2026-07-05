'use client';

import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import CoursesSection from '../components/landing/CoursesSection';
import HighlightsSection from '../components/landing/HighlightsSection';
import AboutTeacherSection from '../components/landing/AboutTeacherSection';
import FooterSection from '../components/landing/FooterSection';

export default function LandingPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#F8F9FA] text-[#264653] font-sans rtl">
        <HeroSection />
        <FeaturesSection />
        <CoursesSection />
        <HighlightsSection />
        <AboutTeacherSection />
      </main>

      <FooterSection />
    </>
  );
}