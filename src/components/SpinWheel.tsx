import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, ShieldCheck } from 'lucide-react';

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

  // -- 1. Logic Setup --
  useEffect(() => {
    if (isSpinning) {
      setShowResult(false);

      // A. Calculate Standard Outcomes based on Rust Logic
      // This mimics the "standard" result if a critical or protection didn't happen
      // Logic: if -1 -> 1, else +1 (clamped 3)
      const standardSuccess = oldValue === -1 ? 1 : Math.min(oldValue + 1, 3);

      // Logic: if 1 -> -1, else -1 (clamped -3)
      const standardFail = oldValue === 1 ? -1 : Math.max(oldValue - 1, -3);

      // B. Determine if the actual result was a "Win" (mechanically)
      // A win is defined as moving "Up" or the specific jump from -1 to 1
      const isWin = newValue > oldValue || (oldValue === -1 && newValue === 1);

      // C. Generate 8 Segments (Alternating Fail/Success) representing 50/50 odds
      // Even indices (0, 2, 4, 6) = Fail Scenarios
      // Odd indices  (1, 3, 5, 7) = Success Scenarios
      const newSegments = Array(8).fill(0).map((_, i) => {
        return i % 2 === 0 ? standardFail : standardSuccess;
      });

      // D. Select Target Index
      // We pick a random segment that matches our Win/Loss state
      const possibleIndices = isWin ? [1, 3, 5, 7] : [0, 2, 4, 6];
      const selectedIndex = possibleIndices[Math.floor(Math.random() * possibleIndices.length)];

      // E. Patch the Target Segment (Crucial for Criticals/Protection)
      // If the actual 'newValue' differs from standard logic (e.g. Critical Hit or Substrate Protection),
      // we overwrite the value on the specific segment we are landing on.
      newSegments[selectedIndex] = newValue;

      setWheelSegments(newSegments);

      // F. Rotation Physics
      const segmentAngle = 360 / 8; // 45 degrees
      const centerOffset = segmentAngle / 2;

      // Calculate angle to land on the specific selected index
      const targetAngle = (selectedIndex * segmentAngle) + centerOffset;

      // 5 Full spins + target
      const spins = 5;
      const finalRotation = -((spins * 360) + targetAngle);

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

  // -- 2. Visual Helpers --

  const getTraitColor = () => {
    switch (traitTarget) {
      case 'cap': return { primary: '#9E7FFF', secondary: '#7C5FCC' };
      case 'stem': return { primary: '#38bdf8', secondary: '#0ea5e9' };
      case 'spores': return { primary: '#f472b6', secondary: '#ec4899' };
      default: return { primary: '#9E7FFF', secondary: '#7C5FCC' };
    }
  };

  const colors = getTraitColor();
  const segmentAngle = 360 / 8;

  const createSegmentPath = (index: number) => {
    // Start from -90deg (12 o'clock)
    const startAngle = ((index * segmentAngle) - 90) * (Math.PI / 180);
    const endAngle = (((index + 1) * segmentAngle) - 90) * (Math.PI / 180);
    const radius = 128;

    const x1 = 128 + radius * Math.cos(startAngle);
    const y1 = 128 + radius * Math.sin(startAngle);
    const x2 = 128 + radius * Math.cos(endAngle);
    const y2 = 128 + radius * Math.sin(endAngle);

    return `M 128 128 L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };

  const getSegmentColor = (index: number, val: number) => {
    const isSuccessSlot = index % 2 !== 0; // Odd indices are "Success" slots in our 50/50 logic

    // Visually indicate the nature of the slot
    if (isSuccessSlot) return 'rgba(16, 185, 129, 1)'; // Green

    // If it's a fail slot, but the value didn't drop (Protection), use Neutral/Gold
    if (!isSuccessSlot && val >= oldValue) return 'rgba(234, 179, 8, 1)';

    return 'rgba(239, 68, 68, 1)'; // Red
  };

  const change = newValue - oldValue;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && showResult) onComplete(); }}
    >
      <div className="relative">
        {showResult && (
          <button
            onClick={onComplete}
            className="absolute -top-12 right-0 p-2 bg-surface/90 hover:bg-surface rounded-full border border-border transition-colors z-50"
          >
            <X size={24} className="text-text" />
          </button>
        )}

        {/* Wheel Container */}
        <div className="relative w-64 h-64">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 z-30">
            <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[24px] border-l-transparent border-r-transparent border-t-white drop-shadow-md" />
          </div>

          {/* The Wheel */}
          <div
            ref={wheelRef}
            className="w-64 h-64 rounded-full shadow-2xl overflow-hidden relative"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 3000ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
              background: '#1a1a1a',
            }}
          >
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 256 256">
              {wheelSegments.length > 0 && wheelSegments.map((val, index) => (
                <path
                  key={index}
                  d={createSegmentPath(index)}
                  fill={getSegmentColor(index, val)}
                  stroke="#1a1a1a"
                  strokeWidth="2"
                />
              ))}
            </svg>

            {/* Center Hub */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center shadow-xl"
                style={{ background: colors.primary }}
              >
                <Sparkles size={24} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Result Card */}
        {showResult && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
            <div className="bg-surface/95 backdrop-blur-sm rounded-3xl p-8 border-2 border-primary shadow-2xl animate-scale-in pointer-events-auto">
              <div className="text-center">
                <h3 className="text-xl font-bold text-text mb-4 capitalize flex items-center justify-center gap-2">
                  {change > 0 ? <Sparkles className="text-success" size={20} /> :
                    change === 0 ? <ShieldCheck className="text-warning" size={20} /> :
                      <X className="text-error" size={20} />}
                  {traitTarget}
                </h3>

                <div className="flex items-center justify-center gap-6 mb-4">
                  <div className="flex flex-col">
                    <span className="text-xs uppercase text-textSecondary">Old</span>
                    <span className="text-3xl font-bold text-textSecondary">{oldValue > 0 ? '+' : ''}{oldValue}</span>
                  </div>
                  <div className="text-2xl text-textSecondary">→</div>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase text-textSecondary">New</span>
                    <span className={`text-4xl font-bold ${change > 0 ? 'text-success' : change < 0 ? 'text-error' : 'text-warning'}`}>
                      {newValue > 0 ? '+' : ''}{newValue}
                    </span>
                  </div>
                </div>

                <div className="text-sm font-medium text-textSecondary">
                  {change > 1 ? "CRITICAL SUCCESS!" :
                    change > 0 ? "Mutation Successful" :
                      change === 0 ? "Protected (No Change)" : "Mutation Failed"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};