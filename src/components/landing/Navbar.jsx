'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ────────────────────────────────────────────────────────────
// SVG Icons
// ────────────────────────────────────────────────────────────
const SunIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
    />
  </svg>
);

const MoonIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
    />
  </svg>
);

const MenuIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const CloseIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

// ────────────────────────────────────────────────────────────
// Nav Links Data
// ────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: 'الرئيسية', href: '#' },
  { label: 'المميزات', href: '#features' },
  { label: 'الأسعار', href: '#pricing' },
  { label: 'اتصل بنا', href: '#contact' },
];

// ────────────────────────────────────────────────────────────
// Navbar Component
// ────────────────────────────────────────────────────────────
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Persist dark mode preference and apply class to <html>
  useEffect(() => {
    const saved = localStorage.getItem('teacher-theme');
    if (saved === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('teacher-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('teacher-theme', 'light');
    }
  };

  // Add a subtle backdrop-blur enhancement on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on ESC
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <>
      {/* ── DESKTOP / TABLET NAVBAR ─────────────────────────────── */}
      <nav
        dir="rtl"
        className={`
          fixed top-0 right-0 left-0 mt-4 mx-4 sm:mx-8 z-50
          hidden md:flex items-center justify-between
          px-4 sm:px-6 py-3
          rounded-full
          bg-[#F8F9FA] dark:bg-[#264653]
          shadow-xl
          border border-white/60 dark:border-white/10
          transition-all duration-300
          ${scrolled ? 'backdrop-blur-md bg-[#F8F9FA]/90 dark:bg-[#264653]/90' : ''}
        `}
        aria-label="شريط التنقل الرئيسي"
      >
        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2 shrink-0 mr-2 md:mr-4" aria-label="الرئيسية - الدكتور عبدالرحمن خالد">
          <img src="/logo.png" alt="شعار الدكتور عبدالرحمن خالد" className="h-12 md:h-16 w-auto object-contain" />
        </Link>

        {/* ── Nav Links ── */}
        <ul className="flex items-center gap-1" role="list">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="
                  px-4 py-2 rounded-full text-sm font-semibold
                  text-[#264653] dark:text-[#F8F9FA]
                  hover:bg-[#2A9D8F]/10 hover:text-[#2A9D8F]
                  dark:hover:bg-[#2A9D8F]/20 dark:hover:text-[#2A9D8F]
                  transition-all duration-200
                "
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* ── Actions ── */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
            className="
              p-2 rounded-full
              text-[#264653] dark:text-[#F8F9FA]
              hover:bg-[#2A9D8F]/10 hover:text-[#2A9D8F]
              dark:hover:bg-[#2A9D8F]/20 dark:hover:text-[#2A9D8F]
              transition-all duration-200
            "
          >
            {darkMode ? (
              <SunIcon className="w-5 h-5" />
            ) : (
              <MoonIcon className="w-5 h-5" />
            )}
          </button>

          {/* Secondary CTA — Login */}
          <Link
            href="/login"
            id="navbar-login-btn"
            className="
              px-4 py-2 rounded-full text-sm font-bold
              border-2 border-[#2A9D8F] text-[#2A9D8F]
              hover:bg-[#2A9D8F] hover:text-[#F8F9FA]
              transition-all duration-200
            "
          >
            تسجيل الدخول
          </Link>

          {/* Primary CTA — Register */}
          <Link
            href="/register"
            id="navbar-register-btn"
            className="
              px-4 py-2 rounded-full text-sm font-bold
              bg-[#2A9D8F] text-[#F8F9FA]
              hover:bg-[#238076] hover:shadow-md hover:shadow-[#2A9D8F]/30
              active:scale-95
              transition-all duration-200
            "
          >
            حساب جديد
          </Link>
        </div>
      </nav>

      {/* ── MOBILE NAVBAR ───────────────────────────────────────── */}
      <nav
        dir="rtl"
        className={`
          fixed top-0 right-0 left-0 mt-4 mx-4 z-50
          md:hidden
          bg-[#F8F9FA] dark:bg-[#264653]
          shadow-xl
          border border-white/60 dark:border-white/10
          transition-all duration-300
          ${mobileOpen ? 'rounded-xl' : 'rounded-full'}
        `}
        aria-label="شريط التنقل للجوال"
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/" className="mr-1" aria-label="الرئيسية - الدكتور عبدالرحمن خالد">
            <img src="/logo.png" alt="شعار الدكتور عبدالرحمن خالد" className="h-10 md:h-12 w-auto object-contain" />
          </Link>

          <div className="flex items-center gap-1">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              aria-label={darkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
              className="
                p-2 rounded-full
                text-[#264653] dark:text-[#F8F9FA]
                hover:bg-[#2A9D8F]/10 hover:text-[#2A9D8F]
                dark:hover:bg-[#2A9D8F]/20 dark:hover:text-[#2A9D8F]
                transition-all duration-200
              "
            >
              {darkMode ? (
                <SunIcon className="w-5 h-5" />
              ) : (
                <MoonIcon className="w-5 h-5" />
              )}
            </button>

            {/* Hamburger */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              aria-expanded={mobileOpen}
              className="
                p-2 rounded-full
                text-[#264653] dark:text-[#F8F9FA]
                hover:bg-[#2A9D8F]/10 hover:text-[#2A9D8F]
                dark:hover:bg-[#2A9D8F]/20 dark:hover:text-[#2A9D8F]
                transition-all duration-200
              "
            >
              {mobileOpen ? (
                <CloseIcon className="w-5 h-5" />
              ) : (
                <MenuIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        <div
          className={`
            overflow-hidden transition-all duration-300 ease-in-out
            ${mobileOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="px-4 pb-5 pt-1 flex flex-col gap-2 border-t border-[#264653]/10 dark:border-white/10">
            {/* Nav Links */}
            <ul className="flex flex-col gap-1" role="list">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="
                      block px-4 py-2.5 rounded-xl text-sm font-semibold
                      text-[#264653] dark:text-[#F8F9FA]
                      hover:bg-[#2A9D8F]/10 hover:text-[#2A9D8F]
                      dark:hover:bg-[#2A9D8F]/20 dark:hover:text-[#2A9D8F]
                      transition-all duration-200
                    "
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-col gap-2 mt-2">
              <Link
                href="/login"
                id="mobile-navbar-login-btn"
                onClick={() => setMobileOpen(false)}
                className="
                  w-full text-center px-4 py-2.5 rounded-xl text-sm font-bold
                  border-2 border-[#2A9D8F] text-[#2A9D8F]
                  hover:bg-[#2A9D8F] hover:text-[#F8F9FA]
                  transition-all duration-200
                "
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                id="mobile-navbar-register-btn"
                onClick={() => setMobileOpen(false)}
                className="
                  w-full text-center px-4 py-2.5 rounded-xl text-sm font-bold
                  bg-[#2A9D8F] text-[#F8F9FA]
                  hover:bg-[#238076] hover:shadow-md hover:shadow-[#2A9D8F]/30
                  active:scale-95
                  transition-all duration-200
                "
              >
                حساب جديد
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
