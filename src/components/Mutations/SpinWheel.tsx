import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, ShieldCheck, Sprout } from 'lucide-react';

interface SpinWheelProps {
  isSpinning: boolean;
  oldValue: number;
  newValue: number;
  traitTarget: 'cap' | 'stem' | 'spores';
  onComplete: () => void;
}

export const SpinWheel: React.FC<SpinWheelProps> = ({
  isSpinning,
  oldValue,
  newValue,
  traitTarget,
  onComplete,
}) => {
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [wheelSegments, setWheelSegments] = useState<number[]>([]);

  const wheelRef = useRef<HTMLDivElement>(null);

  // -- Logic remains the same (Physics & Segments) --
  useEffect(() => {
    if (isSpinning) {
      setShowResult(false);
      const standardSuccess = oldValue === -1 ? 1 : Math.min(oldValue + 1, 3);
      const standardFail = oldValue === 1 ? -1 : Math.max(oldValue - 1, -3);

      const isWin = newValue > oldValue || (oldValue === -1 && newValue === 1);

      const newSegments = Array(8).fill(0).map((_, i) => {
        return i % 2 === 0 ? standardFail : standardSuccess;
      });

      const possibleIndices = isWin ? [1, 3, 5, 7] : [0, 2, 4, 6];
      const selectedIndex = possibleIndices[Math.floor(Math.random() * possibleIndices.length)];

      newSegments[selectedIndex] = newValue;
      setWheelSegments(newSegments);

      const segmentAngle = 360 / 8;
      const centerOffset = segmentAngle / 2;
      const targetAngle = (selectedIndex * segmentAngle) + centerOffset;
      const fuzz = (Math.random() * 36) - 18;
      const extraSpins = Math.floor(Math.random() * 3) + 4;

      const finalRotation = -((extraSpins * 360) + targetAngle + fuzz);

      const handleTransitionEnd = (e: TransitionEvent) => {
        if (e.propertyName === 'transform' && e.target === wheelRef.current) {
          setShowResult(true);
          wheelRef.current?.removeEventListener('transitionend', handleTransitionEnd);
        }
      };

      if (wheelRef.current) {
        wheelRef.current.addEventListener('transitionend', handleTransitionEnd);
      }

      requestAnimationFrame(() => {
        setRotation(finalRotation);
      });

      return () => {
        if (wheelRef.current) {
          wheelRef.current.removeEventListener('transitionend', handleTransitionEnd);
        }
      };
    }
  }, [isSpinning, newValue, oldValue]);

  if (!isSpinning && !showResult) return null;

  // -- Themed Visual Helpers --

  const getTraitTheme = () => {
    switch (traitTarget) {
      case 'cap': return { color: '#ef4444', label: 'Cap Mutation', glow: 'shadow-red-500/50' };
      case 'stem': return { color: '#10b981', label: 'Stem Mutation', glow: 'shadow-green-500/50' };
      case 'spores': return { color: '#3b82f6', label: 'Spore Mutation', glow: 'shadow-blue-500/50' };
      default: return { color: '#a855f7', label: 'Mutation', glow: 'shadow-purple-500/50' };
    }
  };

  const theme = getTraitTheme();
  const segmentAngle = 360 / 8;

  const createSegmentPath = (index: number) => {
    const startAngle = ((index * segmentAngle) - 90) * (Math.PI / 180);
    const endAngle = (((index + 1) * segmentAngle) - 90) * (Math.PI / 180);
    const radius = 128; // Outer radius
    const innerRadius = 20; // Cut out the middle for the hub

    // Outer Arc
    const x1 = 128 + radius * Math.cos(startAngle);
    const y1 = 128 + radius * Math.sin(startAngle);
    const x2 = 128 + radius * Math.cos(endAngle);
    const y2 = 128 + radius * Math.sin(endAngle);

    // Inner Arc
    const x3 = 128 + innerRadius * Math.cos(endAngle);
    const y3 = 128 + innerRadius * Math.sin(endAngle);
    const x4 = 128 + innerRadius * Math.cos(startAngle);
    const y4 = 128 + innerRadius * Math.sin(startAngle);

    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 0 0 ${x4} ${y4} Z`;
  };

  const getSegmentFill = (index: number, val: number) => {
    const isSuccessSlot = index % 2 !== 0;
    // We return IDs for gradients defined in <defs>
    if (isSuccessSlot) return 'url(#grad-success)';
    if (!isSuccessSlot && val >= oldValue) return 'url(#grad-protected)';
    return 'url(#grad-fail)';
  };

  const change = newValue - oldValue;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget && showResult) onComplete(); }}
    >
      <div className="relative flex flex-col items-center">

        {/* Close Button */}
        {showResult && (
          <button
            onClick={onComplete}
            className="absolute -top-16 right-0 p-3 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 transition-colors z-50 backdrop-blur-sm"
          >
            <X size={24} className="text-white" />
          </button>
        )}

        {/* Wheel Container */}
        <div className="relative w-80 h-80 animate-fade-in-up">

          {/* Outer Glow Ring */}
          <div className={`absolute inset-0 rounded-full border-4 border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] ${theme.glow}`} />

          {/* Pointer (Needle) */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
            <div className="w-4 h-12 bg-gradient-to-b from-white to-transparent clip-path-needle" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
          </div>

          {/* The Wheel */}
          <div
            ref={wheelRef}
            className="w-full h-full rounded-full overflow-hidden relative"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 3500ms cubic-bezier(0.15, 0.85, 0.15, 1)' : 'none',
            }}
          >
            <svg className="absolute inset-0 w-full h-full drop-shadow-2xl" viewBox="0 0 256 256">
              <defs>
                {/* Bioluminescent Green */}
                <radialGradient id="grad-success" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="30%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#065f46" />
                </radialGradient>
                {/* Toxic Red/Purple */}
                <radialGradient id="grad-fail" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="30%" stopColor="#f87171" />
                  <stop offset="100%" stopColor="#7f1d1d" />
                </radialGradient>
                {/* Golden Spore */}
                <radialGradient id="grad-protected" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="30%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#b45309" />
                </radialGradient>
              </defs>

              {wheelSegments.length > 0 && wheelSegments.map((val, index) => (
                <path
                  key={index}
                  d={createSegmentPath(index)}
                  fill={getSegmentFill(index, val)}
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth="2"
                  className="transition-opacity duration-300"
                />
              ))}
            </svg>

            {/* Center Hub (Nucleus) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-20 h-20 rounded-full border-4 border-black/50 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] z-20"
                style={{
                  background: `radial-gradient(circle at 30% 30%, white, ${theme.color})`,
                  boxShadow: `0 0 30px ${theme.color}aa`
                }}
              >
                <div className="text-black/50 animate-pulse">
                  <Sprout size={32} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Result Card */}
        {showResult && (
          <div className="absolute mt-12 z-40">
            <div className={`
              bg-[#1a1a1a]/90 backdrop-blur-xl rounded-3xl p-8 
              border-2 shadow-[0_0_50px_rgba(0,0,0,0.5)] 
              animate-scale-in flex flex-col items-center gap-4
            `}
              style={{ borderColor: theme.color, boxShadow: `0 0 40px ${theme.color}44` }}
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {change > 0 ? <Sparkles className="text-emerald-400" size={24} /> :
                    change === 0 ? <ShieldCheck className="text-amber-400" size={24} /> :
                      <X className="text-red-400" size={24} />}
                  <h3 className="text-xl font-bold text-white uppercase tracking-widest">
                    {theme.label}
                  </h3>
                </div>

                <div className="flex items-center justify-center gap-8 my-6 bg-black/40 rounded-2xl p-4 border border-white/5">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Was</span>
                    <span className="text-3xl font-mono font-bold text-white/60">{oldValue > 0 ? '+' : ''}{oldValue}</span>
                  </div>

                  <div className="text-white/20">
                    <Sprout size={20} className="rotate-90" />
                  </div>

                  <div className="flex flex-col items-center relative">
                    {/* Glowing background for new value */}
                    <div className="absolute inset-0 bg-white/5 blur-lg rounded-full" />
                    <span className="text-[10px] uppercase tracking-wider text-white/40 mb-1 relative z-10">Now</span>
                    <span className={`text-5xl font-mono font-black relative z-10 drop-shadow-lg ${change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                      {newValue > 0 ? '+' : ''}{newValue}
                    </span>
                  </div>
                </div>

                <div className={`
                  text-sm font-bold uppercase tracking-wide py-2 px-4 rounded-full inline-block
                  ${change > 1 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                    change > 0 ? "bg-emerald-500/10 text-emerald-400/80" :
                      change === 0 ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}
                `}>
                  {change > 1 ? "Critical Evolution!" :
                    change > 0 ? "Successful Mutation" :
                      change === 0 ? "Resisted (Protected)" : "Mutation Failed"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};