import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (isSpinning) {
      setShowResult(false);
      // Spin animation: 5 full rotations + landing position
      const spins = 5;
      const finalRotation = spins * 360 + (Math.random() * 360);
      setRotation(finalRotation);

      // Show result after spin completes
      setTimeout(() => {
        setShowResult(true);
      }, 3000);
    }
  }, [isSpinning]);

  if (!isSpinning && !showResult) return null;

  const getTraitColor = () => {
    switch (traitTarget) {
      case 'cap':
        return 'from-primary to-primary/60';
      case 'stem':
        return 'from-secondary to-secondary/60';
      case 'spores':
        return 'from-accent to-accent/60';
      default:
        return 'from-primary to-primary/60';
    }
  };

  const getValueColor = (value: number) => {
    if (value > 0) return 'text-success';
    if (value < 0) return 'text-error';
    return 'text-text';
  };

  const change = newValue - oldValue;

  // Segments: [-3, -2, -1, 0, 1, 2, 3]
  // Success zone: positive values (1, 2, 3) - indices 4, 5, 6
  // Fail zone: negative values (-3, -2, -1) - indices 0, 1, 2
  // Neutral: 0 - index 3

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && showResult) {
      onComplete();
    }
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
            className="absolute -top-12 right-0 p-2 bg-surface/90 hover:bg-surface rounded-full border border-border transition-colors z-10"
            aria-label="Close"
          >
            <X size={24} className="text-text" />
          </button>
        )}

        {/* Spinning Wheel */}
        <div
          className={`w-64 h-64 rounded-full bg-gradient-to-br ${getTraitColor()} shadow-2xl flex items-center justify-center transition-transform duration-3000 ease-out relative overflow-hidden`}
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: isSpinning ? '3000ms' : '0ms',
          }}
        >
          {/* Success/Fail Zone Overlays */}
          <div className="absolute inset-0 rounded-full">
            {/* Fail Zone (negative values: -3, -2, -1) - Red shade */}
            {[-3, -2, -1].map((value, idx) => {
              const segmentIndex = [-3, -2, -1, 0, 1, 2, 3].indexOf(value);
              return (
                <div
                  key={`fail-${value}`}
                  className="absolute inset-0"
                  style={{
                    transform: `rotate(${segmentIndex * (360 / 7)}deg)`,
                  }}
                >
                  <div 
                    className="w-full h-1/2 bg-error/20"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                      transformOrigin: 'bottom center',
                    }}
                  />
                </div>
              );
            })}

            {/* Success Zone (positive values: 1, 2, 3) - Green shade */}
            {[1, 2, 3].map((value, idx) => {
              const segmentIndex = [-3, -2, -1, 0, 1, 2, 3].indexOf(value);
              return (
                <div
                  key={`success-${value}`}
                  className="absolute inset-0"
                  style={{
                    transform: `rotate(${segmentIndex * (360 / 7)}deg)`,
                  }}
                >
                  <div 
                    className="w-full h-1/2 bg-success/20"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                      transformOrigin: 'bottom center',
                    }}
                  />
                </div>
              );
            })}

            {/* Neutral Zone (0) - Slight gray shade */}
            <div
              className="absolute inset-0"
              style={{
                transform: `rotate(${3 * (360 / 7)}deg)`,
              }}
            >
              <div 
                className="w-full h-1/2 bg-textSecondary/10"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                  transformOrigin: 'bottom center',
                }}
              />
            </div>
          </div>

          {/* Wheel segments with numbers */}
          <div className="absolute inset-0 rounded-full">
            {[-3, -2, -1, 0, 1, 2, 3].map((value, index) => (
              <div
                key={value}
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `rotate(${index * (360 / 7)}deg)`,
                }}
              >
                <div
                  className={`w-full h-1/2 flex items-start justify-center pt-4 ${
                    index % 2 === 0 ? 'opacity-100' : 'opacity-70'
                  }`}
                >
                  <span className="text-white font-bold text-2xl drop-shadow-lg">
                    {value > 0 ? '+' : ''}{value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Segment dividers */}
          <div className="absolute inset-0 rounded-full">
            {[...Array(7)].map((_, index) => (
              <div
                key={`divider-${index}`}
                className="absolute inset-0"
                style={{
                  transform: `rotate(${index * (360 / 7)}deg)`,
                }}
              >
                <div className="w-0.5 h-1/2 bg-white/30 mx-auto" />
              </div>
            ))}
          </div>

          {/* Center circle */}
          <div className="relative z-10 w-20 h-20 rounded-full bg-background border-4 border-white flex items-center justify-center shadow-xl">
            <Sparkles size={32} className="text-white animate-pulse" />
          </div>
        </div>

        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20">
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-white drop-shadow-lg" />
        </div>

        {/* Result Display */}
        {showResult && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
