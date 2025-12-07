import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';

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
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSpinning) {

      setShowResult(false);

      // Segments array: [-3, -2, -1, 0, 1, 2, 3]
      const segments = [-3, -2, -1, 0, 1, 2, 3];
      const segmentAngle = 360 / 7; // ~51.43 degrees per segment

      // Find which segment index corresponds to newValue
      const targetIndex = segments.indexOf(newValue);

      if (targetIndex === -1) {
        console.error('❌ Invalid newValue:', newValue);
        return;
      }

      // Calculate the angle to land in the CENTER of the target segment
      const centerOffset = segmentAngle / 2;
      const targetAngle = (targetIndex * segmentAngle) + centerOffset;

      // Add 5 full rotations for dramatic effect
      // NEGATIVE rotation = counter-clockwise
      const spins = 5;
      const finalRotation = -((spins * 360) + targetAngle);

      // Set up transitionend listener BEFORE triggering rotation
      const handleTransitionEnd = (e: TransitionEvent) => {
        // Only respond to transform transitions on the wheel itself
        if (e.propertyName === 'transform' && e.target === wheelRef.current) {
          setShowResult(true);
          wheelRef.current?.removeEventListener('transitionend', handleTransitionEnd);
        }
      };

      if (wheelRef.current) {
        wheelRef.current.addEventListener('transitionend', handleTransitionEnd);
      }

      // Trigger rotation after listener is set up
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        setRotation(finalRotation);
      });

      // Cleanup function
      return () => {
        if (wheelRef.current) {
          wheelRef.current.removeEventListener('transitionend', handleTransitionEnd);
        }
      };
    }
  }, [isSpinning, newValue, oldValue, traitTarget]);

  if (!isSpinning && !showResult) return null;

  const getTraitColor = () => {
    switch (traitTarget) {
      case 'cap':
        return { primary: '#9E7FFF', secondary: '#7C5FCC' };
      case 'stem':
        return { primary: '#38bdf8', secondary: '#0ea5e9' };
      case 'spores':
        return { primary: '#f472b6', secondary: '#ec4899' };
      default:
        return { primary: '#9E7FFF', secondary: '#7C5FCC' };
    }
  };

  const getValueColor = (value: number) => {
    if (value > 0) return 'text-success';
    if (value < 0) return 'text-error';
    return 'text-text';
  };

  const change = newValue - oldValue;
  const colors = getTraitColor();

  // Segments: [-3, -2, -1, 0, 1, 2, 3]
  const segments = [-3, -2, -1, 0, 1, 2, 3];
  const segmentAngle = 360 / 7;

  // FIXED COLOR LOGIC: Green if landing here would be improvement, Red if degradation
  const getSegmentColor = (segmentValue: number) => {
    // Calculate what the change would be if we landed on this segment
    const potentialChange = segmentValue - oldValue;

    if (potentialChange > 0) {
      return 'rgba(16, 185, 129, 1)'; // green
    } else if (potentialChange < 0) {
      return 'rgba(239, 68, 68, 1)'; // red
    } else {
      return 'rgba(163, 163, 163, 1)'; // neutral
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && showResult) {
      onComplete();
    }
  };

  // Create SVG path for a segment
  // FIXED: Start from -90° (top) instead of 0° (right)
  const createSegmentPath = (index: number) => {
    // Offset by -90° to start at top (12 o'clock) where pointer is
    const startAngle = ((index * segmentAngle) - 90) * (Math.PI / 180);
    const endAngle = (((index + 1) * segmentAngle) - 90) * (Math.PI / 180);
    const radius = 128; // Half of 256px wheel size

    const x1 = 128 + radius * Math.cos(startAngle);
    const y1 = 128 + radius * Math.sin(startAngle);
    const x2 = 128 + radius * Math.cos(endAngle);
    const y2 = 128 + radius * Math.sin(endAngle);

    return `M 128 128 L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative">
        {/* Close button - only show when result is displayed */}
        {showResult && (
          <button
            onClick={onComplete}
            className="absolute -top-12 right-0 p-2 bg-surface/90 hover:bg-surface rounded-full border border-border transition-colors z-50"
            aria-label="Close"
          >
            <X size={24} className="text-text" />
          </button>
        )}

        {/* Spinning Wheel Container */}
        <div className="relative w-64 h-64">
          {/* Pointer - Fixed at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 z-30">
            <div className="relative">
              {/* Pointer triangle */}
              <div
                className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[24px] border-l-transparent border-r-transparent border-t-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
              />
              {/* Pointer glow effect */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-white/30 blur-xl rounded-full" />
            </div>
          </div>

          {/* Spinning Wheel */}
          <div
            ref={wheelRef}
            className="w-64 h-64 rounded-full shadow-2xl transition-transform duration-3000 ease-out relative overflow-hidden"
            style={{
              transform: `rotate(${rotation}deg)`,
              transitionDuration: isSpinning ? '3000ms' : '0ms',
              background: `conic-gradient(from 0deg, ${colors.primary}, ${colors.secondary}, ${colors.primary})`,
            }}
          >
            {/* SVG overlay for colored segments */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 256 256"
            >
              {segments.map((value, index) => (
                <path
                  key={`shade-${value}`}
                  d={createSegmentPath(index)}
                  fill={getSegmentColor(value)}
                  stroke="rgba(255, 255, 255, 0.5)"
                  strokeWidth="3"
                />
              ))}
            </svg>

            {/* Wheel segments with numbers */}
            <div className="absolute inset-0 rounded-full">
              {segments.map((value, index) => (
                <div
                  key={value}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: `rotate(${index * segmentAngle}deg)`,
                  }}
                >
                  <div className="w-full h-1/2 flex items-start justify-center pt-6">
                    <span
                      className="text-white font-bold text-2xl"
                      style={{
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                        textShadow: '0 0 8px rgba(0,0,0,0.5)',
                      }}
                    >
                      {value > 0 ? '+' : ''}{value}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Center circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-background border-4 border-white flex items-center justify-center shadow-xl">
                <Sparkles size={32} className="text-white animate-pulse" />
              </div>
            </div>
          </div>

          {/* Landing indicator - shows after spin */}
          {showResult && (
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 translate-y-8 z-20 pointer-events-none"
            >
              <div className="w-1 h-16 bg-white/80 rounded-full shadow-lg" />
            </div>
          )}
        </div>

        {/* Result Display - Higher z-index than pointer */}
        {showResult && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
            <div className="bg-surface/95 backdrop-blur-sm rounded-3xl p-8 border-2 border-primary shadow-2xl animate-scale-in pointer-events-auto">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-text mb-4 capitalize">
                  {traitTarget} Mutation
                </h3>

                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-sm text-textSecondary mb-1">Old</div>
                    <div className={`text-4xl font-bold ${getValueColor(oldValue)}`}>
                      {oldValue > 0 ? '+' : ''}{oldValue}
                    </div>
                  </div>

                  <div className="text-3xl text-textSecondary">→</div>

                  <div className="text-center">
                    <div className="text-sm text-textSecondary mb-1">New</div>
                    <div className={`text-4xl font-bold ${getValueColor(newValue)}`}>
                      {newValue > 0 ? '+' : ''}{newValue}
                    </div>
                  </div>
                </div>

                <div className={`text-lg font-semibold ${change > 0 ? 'text-success' : change < 0 ? 'text-error' : 'text-textSecondary'}`}>
                  {change > 0 ? '↑' : change < 0 ? '↓' : '='} {Math.abs(change)} {change > 0 ? 'Improved!' : change < 0 ? 'Decreased' : 'No Change'}
                </div>

                <div className="mt-4 text-sm text-textSecondary">
                  Click outside or press X to close
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
