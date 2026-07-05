'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

// Static assets to satisfy purity
const STATIC_BEAMS = [
  { width: '120px', left: '10%', top: '20%', rotate: '45deg', duration: 6, x: 20, y: -30 },
  { width: '180px', left: '40%', top: '60%', rotate: '120deg', duration: 8, x: -40, y: 50 },
  { width: '150px', left: '80%', top: '10%', rotate: '200deg', duration: 7, x: 30, y: 40 },
  { width: '200px', left: '15%', top: '85%', rotate: '10deg', duration: 9, x: -50, y: -20 },
  { width: '100px', left: '70%', top: '40%', rotate: '300deg', duration: 5, x: 60, y: 10 },
];

const STATIC_CHART_BARS = [
  { h1: '40%', h2: '80%', h3: '50%' },
  { h1: '60%', h2: '40%', h3: '70%' },
  { h1: '30%', h2: '90%', h3: '40%' },
  { h1: '80%', h2: '50%', h3: '60%' },
  { h1: '50%', h2: '70%', h3: '30%' },
  { h1: '70%', h2: '30%', h3: '80%' },
];

export const Hero = () => {
  return (
    <section className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black py-20 px-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full"></div>
        
        <div className="absolute inset-0 opacity-20">
          {STATIC_BEAMS.map((beam, i) => (
            <motion.div
              key={i}
              className="absolute h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent"
              style={{
                width: beam.width,
                left: beam.left,
                top: beam.top,
                rotate: beam.rotate,
              }}
              animate={{
                opacity: [0.1, 0.5, 0.1],
                x: [0, beam.x],
                y: [0, beam.y],
              }}
              transition={{
                duration: beam.duration,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto text-center">
        {/* Trust Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8"
          dir="rtl"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          🚀 يثق بنا أكثر من +50 سنتر تعليمي
        </motion.div>

        {/* Logo with Enhanced Glow Effect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex justify-center"
        >
          <div className="relative group cursor-pointer">
            {/* Animated Glow Background */}
            <motion.div 
               animate={{ 
                 scale: [1, 1.1, 1],
                 opacity: [0.2, 0.4, 0.2] 
               }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 to-cyan-400/30 rounded-full blur-2xl group-hover:opacity-60 transition duration-1000"
            ></motion.div>
            
            <div className="relative bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-white/10 group-hover:border-blue-500/50 transition-all duration-500">
              <Image 
                src="/full-logo.jpeg" 
                alt="Classora Logo" 
                width={220} 
                height={70} 
                className="rounded-xl brightness-110 group-hover:scale-105 transition-transform duration-500" 
                priority 
              />
            </div>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-7xl font-bold text-white mb-6 leading-tight"
          dir="rtl"
        >
          Classora: سنترك الذكي <br />
          <span className="text-blue-500">وسيطر على كل تفصيلة</span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg md:text-2xl text-neutral-400 max-w-3xl mx-auto mb-12 leading-relaxed"
          dir="rtl"
        >
          وداعاً لدفاتر الغياب ومشاكل الحسابات. مع Classora، إدارة الطلاب، الحضور، والمديونيات بقت أسهل، أدق، وأسرع بكتير.
        </motion.p>

        {/* CTAs */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.6 }}
           className="flex flex-col md:flex-row gap-4 justify-center items-center"
        >
          <Link href="/admin-login" className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:scale-105">
            ابدأ تجربتك المجانية
          </Link>
          <Link href="#demo" className="px-10 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all backdrop-blur-sm">
            شوف فيديو الشرح
          </Link>
        </motion.div>
      </div>

      {/* Hero Product Shot Preview */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-20 w-full max-w-6xl group"
      >
        {/* Decorative Glows */}
        <div className="absolute -inset-10 bg-blue-600/20 blur-[100px] rounded-full opacity-50 group-hover:opacity-70 transition-opacity duration-1000"></div>
        <div className="absolute -inset-10 bg-cyan-600/10 blur-[80px] rounded-full opacity-30 group-hover:opacity-50 transition-opacity duration-1000 delay-500"></div>

        <div className="relative rounded-3xl border border-white/10 bg-neutral-900/40 backdrop-blur-sm overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)] transition-all duration-700 group-hover:border-blue-500/30 group-hover:shadow-[0_0_100px_rgba(37,99,235,0.2)]">
          {/* Top Bar Reflection */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          
          <motion.div
            animate={{ 
              y: [0, -10, 0],
              rotateX: [0, 1, 0],
              rotateY: [0, -1, 0]
            }}
            transition={{ 
              duration: 6, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          >
            <Image 
              src="/hero-image.png" 
              alt="Classora Platform Preview" 
              width={1400} 
              height={800} 
              className="w-full h-auto object-cover brightness-[1.05] contrast-[1.05] group-hover:scale-[1.02] transition-transform duration-1000"
              priority
            />
          </motion.div>

          {/* Interactive Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>
          
          {/* Glass Card Details */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 right-8 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl hidden md:block max-w-[240px]"
            dir="rtl"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                <span className="text-blue-400 font-bold text-xl">✨</span>
              </div>
              <div className="text-sm text-neutral-300 font-medium">تجربة مستخدم مذهلة</div>
            </div>
            <p className="text-[12px] text-neutral-400">واجهة عصرية صممت خصيصاً لتسهيل إدارة سنترك التعليمي بأعلى كفاءة.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.8 }}
            className="absolute top-8 left-8 p-4 bg-blue-600/10 backdrop-blur-lg border border-blue-500/20 rounded-xl shadow-xl hidden md:block"
            dir="rtl"
          >
            <div className="text-[10px] text-blue-400 font-mono tracking-widest uppercase mb-1">Status: Operational</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <div className="text-sm text-white font-bold">النظام يعمل بكفاءة 100%</div>
            </div>
          </motion.div>
        </div>
        
        {/* Reflection at bottom */}
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[80%] h-20 bg-blue-600/10 blur-[60px] rounded-full scale-y-50 opacity-50"></div>
      </motion.div>
    </section>
  );
};
