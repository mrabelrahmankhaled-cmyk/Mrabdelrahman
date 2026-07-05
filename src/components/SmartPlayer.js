'use client';

import MovingWatermark from './VideoWatermark';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FaExclamationTriangle, FaLock, FaQuestionCircle, FaCheck, FaTimes } from 'react-icons/fa';
import { Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// Load YouTube IFrame API once globally
let ytApiLoaded = false;
let ytApiCallbacks = [];
function loadYouTubeAPI(callback) {
  if (window.YT && window.YT.Player) { callback(); return; }
  ytApiCallbacks.push(callback);
  if (!ytApiLoaded) {
    ytApiLoaded = true;
    window.onYouTubeIframeAPIReady = () => { ytApiCallbacks.forEach(cb => cb()); ytApiCallbacks = []; };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }
}

export default function SmartPlayer({ url, studentInfo, onProgress, resumePosition = 0, checkpoints = [] }) {
  const { isDeviceAuthorized } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);   // true after first Play click
  const [playerReady, setPlayerReady] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [seekingVal, setSeekingVal] = useState(null);
  const [watchedPct, setWatchedPct] = useState(0); // ✅ نسبة المشاهدة الفعلية
  const [justUnlocked, setJustUnlocked] = useState(false); // لحظة الإكمال
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const iframeRef = useRef(null);       // the <div> container for YT.Player
  const ytPlayerRef = useRef(null);     // the YT.Player instance
  const progressRef = useRef(null);     // setInterval id
  const prevTimeRef = useRef(0);        // ⏱️ last polled time (for delta calc)
  const watchedSecsRef = useRef(0);     // ✅ actual seconds watched (no skip counting)
  const justUnlockedRef = useRef(false); // 🔒 guard for 85% toast (fires once)
  const triggeredPointsRef = useRef(new Set()); // IDs of points already shown in this session
  const [activeCheckpoint, setActiveCheckpoint] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isWrong, setIsWrong] = useState(false);

  // 🎯 Extract YouTube ID
  const videoId = useMemo(() => {
    if (!url || typeof url !== 'string') return null;
    const clean = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    const m = clean.match(/(?:youtu\.be\/|v=|\/embed\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }, [url]);

  // Reset when lesson changes
  useEffect(() => {
    setShowPlayer(false);
    setIsPlaying(false);
    setPlayed(0);
    setDuration(0);
    setPlayerReady(false);
    setVideoEnded(false);
    setSeekingVal(null);
    setWatchedPct(0);
    setJustUnlocked(false);
    setJustUnlocked(false);
    setSelectedOption(null);
    setIsWrong(false);
    prevTimeRef.current = 0;
    watchedSecsRef.current = 0;
    justUnlockedRef.current = false;
    triggeredPointsRef.current.clear();
    setActiveCheckpoint(null);
    if (ytPlayerRef.current) {
      ytPlayerRef.current.destroy();
      ytPlayerRef.current = null;
    }
    clearInterval(progressRef.current);
  }, [url]);

  // Mount flag
  useEffect(() => {
    setHasMounted(true);
    const fsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fsChange);
    return () => document.removeEventListener('fullscreenchange', fsChange);
  }, []);

  // Init YT.Player after iframe container is in DOM
  useEffect(() => {
    if (!showPlayer || !videoId) return;

    loadYouTubeAPI(() => {
      if (!iframeRef.current) return;
      if (ytPlayerRef.current) return; // already initialized

      ytPlayerRef.current = new window.YT.Player(iframeRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,        // 🚫 Hide ALL YouTube UI
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          disablekb: 1,
          playsinline: 1,
          fs: 0,              // hide fullscreen button (we have our own)
          hl: 'ar',
        },
        events: {
          onReady: (e) => {
            setPlayerReady(true);
            const dur = e.target.getDuration();
            setDuration(dur);
            // ⏭️ Resume from saved position
            if (resumePosition > 0 && resumePosition < dur) {
              e.target.seekTo(resumePosition, true);
              prevTimeRef.current = resumePosition;
            }
            e.target.playVideo();
            // ⏱️ Progress polling — tracks actual watch time
            clearInterval(progressRef.current);
            progressRef.current = setInterval(() => {
              if (!ytPlayerRef.current || typeof ytPlayerRef.current.getCurrentTime !== 'function') return;
              try {
                const cur = ytPlayerRef.current.getCurrentTime();
                const d = ytPlayerRef.current.getDuration();
                if (d > 0) {
                  // Count only if playing and not a forward-skip (delta < 2s)
                  const delta = cur - prevTimeRef.current;
                  if (delta > 0 && delta < 2) {
                    watchedSecsRef.current += delta;
                  }
                  prevTimeRef.current = cur;

                  const p = cur / d;
                  setPlayed(p);
                  setDuration(d);

                  // ✅ تحديث نسبة المشاهدة الفعلية
                  const wPct = Math.min(100, Math.round((watchedSecsRef.current / d) * 100));
                  setWatchedPct(wPct);

                  //  Gemini Interactivity — Checkpoints Pulse
                  if (checkpoints?.length > 0) {
                    const hit = checkpoints.find(cp => {
                      const cpTime = parseInt(cp.time);
                      return Math.abs(cur - cpTime) < 1 && !triggeredPointsRef.current.has(cpTime);
                    });

                    if (hit) {
                      triggeredPointsRef.current.add(parseInt(hit.time));
                      ytPlayerRef.current.pauseVideo();
                      setIsPlaying(false);
                      setActiveCheckpoint(hit);
                    }
                  }

                  // ♊️ أول مرة يخترق 85% — أظهر التوست مرة واحدة فقط
                  if (wPct >= 85 && !justUnlockedRef.current) {
                    justUnlockedRef.current = true;
                    setJustUnlocked(true);
                    setTimeout(() => setJustUnlocked(false), 4000);
                  }

                  if (onProgress) onProgress({
                    played: p,
                    playedSeconds: cur,
                    loadedSeconds: d,
                    watchedSeconds: watchedSecsRef.current,
                    totalDuration: d,
                  });
                }
              } catch (_) {}
            }, 500);
          },
          onStateChange: (e) => {
            // 1 = playing, 2 = paused, 0 = ended
            if (e.data === 0) {
              setIsPlaying(false);
              setVideoEnded(true);
            } else {
              setIsPlaying(e.data === 1);
              setVideoEnded(false);
            }
          },
          onError: () => {},
        },
      });
    });

    return () => {
      clearInterval(progressRef.current);
    };
  }, [showPlayer, videoId]);

  const togglePlay = useCallback(() => {
    if (!ytPlayerRef.current) return;
    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
    } else {
      ytPlayerRef.current.playVideo();
    }
  }, [isPlaying]);

  const seekTo = useCallback((fraction) => {
    if (!ytPlayerRef.current || !duration) return;
    ytPlayerRef.current.seekTo(fraction * duration, true);
    setPlayed(fraction);
    setSeekingVal(null);
  }, [duration]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (secs) => {
    const s = Math.floor(secs || 0);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  if (!hasMounted) return <div className="w-full aspect-video bg-slate-900 rounded-[2.5rem] border-4 border-slate-800" />;

  if (!isDeviceAuthorized) return (
    <div className="relative w-full aspect-video bg-slate-900 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8">
      <FaLock className="text-red-500 text-4xl mb-4" />
      <h3 className="text-xl font-black text-white">الجهاز غير مسجل</h3>
    </div>
  );

  if (!videoId) return (
    <div className="w-full aspect-video bg-slate-950 rounded-[2.5rem] border-4 border-dashed border-white/10 flex flex-col items-center justify-center text-white">
      <FaExclamationTriangle size={48} className="text-amber-500/30 mb-4" />
      <p className="font-black text-lg text-slate-500">رابط الفيديو غير جاهز</p>
    </div>
  );

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-full aspect-video bg-black overflow-hidden shadow-2xl group border-4 border-slate-900 select-none shadow-indigo-500/10 transition-all duration-500 ${isFullscreen ? '' : 'rounded-[2.5rem] md:rounded-[3rem]'}`}
    >
      {/* 🛡️ Watermark */}
      <div className="absolute inset-0 z-[100] pointer-events-none">
        <MovingWatermark text={studentInfo} />
      </div>

      {/* 🎉 85% Unlock Toast */}
      {justUnlocked && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[90] pointer-events-none animate-bounce">
          <div className="bg-emerald-500 text-white px-5 py-2.5 rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center gap-2 font-black text-sm whitespace-nowrap">
            <span className="text-lg">🎉</span>
            <span>أحسنت! أكملت 85% — تم فتح الدرس التالي</span>
          </div>
        </div>
      )}

      {/* 🧩 Interactivity Checkpoint Overlay */}
      <AnimatePresence>
        {activeCheckpoint && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[110] bg-[#020617]/95 backdrop-blur-xl flex items-center justify-center p-8"
          >
             <div className="max-w-xl w-full text-center space-y-8">
                <div className="flex justify-center">
                   <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-2xl animate-pulse">
                      <FaQuestionCircle size={32} />
                   </div>
                </div>
                <div className="space-y-4">
                   <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">تحقق من الاستيعاب</h3>
                   <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">{activeCheckpoint.question}</h2>
                </div>
                
                {/* 🔘 Interaction Options */}
                <div className="grid grid-cols-1 gap-4 pt-4">
                   {(activeCheckpoint.options || []).map((opt, idx) => (
                      <motion.button
                        key={idx}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                           setSelectedOption(idx);
                           if (idx === activeCheckpoint.answer) {
                              setIsWrong(false);
                              setTimeout(() => {
                                 setActiveCheckpoint(null);
                                 setSelectedOption(null);
                                 setIsWrong(false);
                                 ytPlayerRef.current.playVideo();
                              }, 800);
                           } else {
                              setIsWrong(true);
                              setTimeout(() => setIsWrong(false), 500);
                           }
                        }}
                        className={`w-full p-6 rounded-2xl border-2 font-black text-sm flex items-center justify-between transition-all group/opt
                           ${selectedOption === idx 
                              ? (idx === activeCheckpoint.answer ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-900/40') 
                              : 'bg-white/5 border-white/5 text-slate-300 hover:border-blue-500/30'
                           }
                           ${isWrong && selectedOption === idx ? 'animate-shake' : ''}
                        `}
                      >
                         <span className="flex-1 text-right">{opt}</span>
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
                            ${selectedOption === idx 
                               ? 'bg-white/20' 
                               : 'bg-white/10 group-hover/opt:bg-blue-600/20'
                            }
                         `}>
                            {selectedOption === idx 
                               ? (idx === activeCheckpoint.answer ? <FaCheck /> : <FaTimes />) 
                               : <span className="text-[10px] opacity-40">{idx + 1}</span>
                            }
                         </div>
                      </motion.button>
                   ))}
                </div>
                
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest pt-4">يجب الإجابة الصحيحة للمتابعة - محرك التدريس الذكي</p>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ▶️ YOUTUBE PLAYER (hidden until play clicked) */}
      <div className={`absolute inset-0 z-10 ${showPlayer ? 'block' : 'hidden'}`}>
        {/* YT.Player mounts here */}
        <div ref={iframeRef} className="w-full h-full" />

        {/* 🛡️ Smart overlay: transparent when playing, opaque when paused (hides YouTube suggestions) */}
        <div
          className={`absolute inset-0 z-20 cursor-pointer flex items-center justify-center transition-all duration-300 ${
            isPlaying ? 'bg-transparent' : 'bg-black/70 backdrop-blur-sm'
          }`}
          onContextMenu={(e) => e.preventDefault()}
          onClick={togglePlay}
        >
          {/* Pause indicator */}
          {!isPlaying && playerReady && (
            <div className="flex flex-col items-center gap-3 pointer-events-none">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 backdrop-blur-md">
                <span className="text-white text-2xl leading-none pl-0.5">▶</span>
              </div>
              <span className="text-white/60 font-black text-xs tracking-widest uppercase">اضغط للمتابعة</span>
            </div>
          )}
        </div>

        {/* 🛡️ Corner guards: block YouTube branding links */}
        <div className="absolute top-0 inset-x-0 h-16 z-30 cursor-default" onContextMenu={(e) => e.preventDefault()} />
        <div className="absolute bottom-0 right-0 w-36 h-14 z-30 cursor-default" onContextMenu={(e) => e.preventDefault()} />

        {/* Loading spinner until onReady fires */}
        {!playerReady && (
          <div className="absolute inset-0 z-40 bg-slate-900 flex flex-col items-center justify-center">
            <div className="w-14 h-14 border-[5px] border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-5 text-blue-500/40 font-black text-[10px] tracking-[0.25em] uppercase animate-pulse">Classora Engine</p>
          </div>
        )}

        {/* 🎭 CLASSORA CUSTOM CONTROL BAR */}
        <div
          className={`absolute inset-x-0 bottom-0 z-50 px-5 pb-4 pt-10 bg-gradient-to-t from-black/95 via-black/50 to-transparent transition-transform duration-300 ${
            isPlaying ? 'translate-y-full md:group-hover:translate-y-0' : 'translate-y-0'
          }`}
          onContextMenu={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 🟢 Watch-progress bar (actual watched %) */}
          <div dir="ltr" className="relative w-full h-1 bg-white/5 rounded-full mb-2">
            <div
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ${
                watchedPct >= 85 ? 'bg-emerald-400' : watchedPct >= 50 ? 'bg-amber-400' : 'bg-white/20'
              }`}
              style={{ width: `${watchedPct}%` }}
            />
            {/* 85% marker */}
            <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/30 rounded-full" style={{ left: '85%' }} />
          </div>

          {/* 🟦 Seek bar — force LTR to fix RTL reversal */}
          <div dir="ltr" className="relative w-full h-[5px] bg-white/10 rounded-full mb-3 cursor-pointer">
            <div
              className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
              style={{ width: `${(seekingVal ?? played) * 100}%` }}
            />
            <input
              type="range" min={0} max={0.9999} step="any"
              value={seekingVal ?? played}
              onChange={(e) => setSeekingVal(parseFloat(e.target.value))}
              onMouseUp={(e) => seekTo(parseFloat(e.target.value))}
              onTouchEnd={(e) => seekTo(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-400 rounded-full shadow-lg shadow-blue-500/50"
              style={{ left: `calc(${(seekingVal ?? played) * 100}% - 6px)` }}
            />
          </div>
          <div className="flex items-center justify-between text-white">
            {/* Right: Play + Time + Watch Badge */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-blue-600 rounded-xl transition-all hover:scale-110"
              >
                {isPlaying
                  ? <span className="text-lg leading-none">⏸</span>
                  : <span className="text-lg leading-none pl-0.5">▶</span>}
              </button>

              <div className="flex items-center gap-1.5 text-[11px] font-black tracking-tight bg-black/40 px-3 py-1 rounded-lg backdrop-blur-sm">
                <span className="text-white">{formatTime(played * duration)}</span>
                <span className="text-white/20 text-[8px]">/</span>
                <span className="text-white/50">{formatTime(duration)}</span>
              </div>

              {/* 🟢 Watch Badge */}
              {playerReady && duration > 0 && (
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black transition-all duration-500 ${
                  watchedPct >= 85
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : watchedPct >= 50
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-white/5 text-white/40 border border-white/10'
                }`}>
                  <span className="hidden md:inline">{watchedPct >= 85 ? '✅' : watchedPct >= 50 ? '⚠️' : '👁️'}</span>
                  <span>{watchedPct}% <span className="hidden md:inline">شاهدت</span></span>
                  {watchedPct < 85 && <span className="text-white/20 hidden md:inline">/ 85%</span>}
                </div>
              )}
            </div>

            {/* Right: Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="flex items-center justify-center gap-1 md:gap-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white px-3 md:px-4 py-2 rounded-xl border border-blue-500/20 transition-all font-black text-[14px] md:text-[10px]"
            >
              <span className="hidden md:inline">{isFullscreen ? 'تصغير' : 'كامل الشاشة'}</span>
              <span className="text-[18px] md:text-[14px] leading-none mb-[2px]">⛶</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🔚 END SCREEN OVERLAY - covers YouTube suggested videos */}
      {videoEnded && (
        <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
          <p className="text-white font-black text-xl">انتهت الحصة 🎓</p>
          <button
            onClick={() => {
              setVideoEnded(false);
              setPlayed(0);
              if (ytPlayerRef.current) {
                ytPlayerRef.current.seekTo(0);
                ytPlayerRef.current.playVideo();
              }
            }}
            className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-2xl shadow-blue-500/30 hover:scale-105"
          >
            ▶ إعادة المشاهدة
          </button>
        </div>
      )}

      {/* 🎭 FACADE (shown before first play) */}
      {!showPlayer && (
        <div
          onClick={() => setShowPlayer(true)}
          className="absolute inset-0 z-10 cursor-pointer bg-slate-950 flex items-center justify-center"
          onContextMenu={(e) => e.preventDefault()}
        >
          <img
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
            onError={(e) => {
              if (!e.target.dataset.fallback) {
                e.target.dataset.fallback = '1';
                e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
              }
            }}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
            alt="Lesson Cover"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

          {/* Play button */}
          <div className="relative z-10 flex flex-col items-center gap-4 group/btn">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600 rounded-full blur-3xl opacity-40 group-hover/btn:opacity-70 animate-pulse transition-all duration-500" />
              <div className="relative w-24 h-24 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(37,99,235,0.5)] group-hover/btn:scale-110 active:scale-95 transition-all duration-300">
                <Play className="w-10 h-10 fill-white ml-1" />
              </div>
            </div>
            <span className="text-white font-black text-sm tracking-widest bg-black/50 px-5 py-2 rounded-2xl backdrop-blur-md opacity-0 group-hover/btn:opacity-100 transition-all duration-300">
              شغّل الحصة الآن
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
