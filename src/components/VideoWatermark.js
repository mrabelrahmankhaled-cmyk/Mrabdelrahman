'use client';
import { useState, useEffect } from 'react';

export default function MovingWatermark({ text }) {
  const [ghosts, setGhosts] = useState([
    { top: '10%', left: '10%', opacity: 0.2, rotate: -25 },
    { top: '80%', left: '70%', opacity: 0.1, rotate: 15 }
  ]);

  useEffect(() => {
    const moveGhost = (index) => {
      setGhosts(prev => {
        const newGhosts = [...prev];
        newGhosts[index] = {
          top: `${Math.floor(Math.random() * 80) + 5}%`,
          left: `${Math.floor(Math.random() * 70) + 5}%`,
          opacity: (Math.random() * 0.4) + 0.1, // Increased visibility spike
          rotate: Math.floor(Math.random() * 90) - 45 // Random rotation between -45 and 45
        };
        return newGhosts;
      });
    };

    // Update ghosts at different intervals for non-predictable patterns
    const int1 = setInterval(() => moveGhost(0), 3000);
    const int2 = setInterval(() => moveGhost(1), 5000);

    return () => {
      clearInterval(int1);
      clearInterval(int2);
    };
  }, []);

  if (!text) return null;

  return (
    <>
      {ghosts.map((ghost, idx) => (
        <div 
          key={idx}
          className="absolute pointer-events-none select-none transition-all duration-[1000ms] ease-in-out z-[100] whitespace-nowrap"
          style={{ 
            top: ghost.top, 
            left: ghost.left, 
            opacity: ghost.opacity,
            transform: `rotate(${ghost.rotate}deg)`,
          }}
        >
          <div className="bg-black/10 backdrop-blur-[1px] px-3 py-1.5 rounded-xl border border-white/5">
            <p className="text-white font-black text-[10px] md:text-xs tracking-tighter drop-shadow-md flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-indigo-500/50 rounded-full animate-ping"></span>
               {text}
            </p>
          </div>
        </div>
      ))}
    </>
  );
}
