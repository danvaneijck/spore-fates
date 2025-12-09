import React from 'react';
import { GeneticsDisplay } from './GeneticsDisplay';
import { TraitExtension } from '../services/shroomService';


interface MushroomRendererProps {
  traits: TraitExtension;
}

export const MushroomRenderer: React.FC<MushroomRendererProps> = ({ traits }) => {
  // Calculate sizes based on trait values
  const capSize = 100 + (traits.cap * 15);
  const stemHeight = 80 + (traits.stem * 10);
  const sporeCount = Math.max(0, 5 + traits.spores * 2);

  // Colors based on substrate level
  const substrateColors = [
    '#9E7FFF', // Level 0 - Purple
    '#38bdf8', // Level 1 - Blue
    '#10b981', // Level 2 - Green
    '#f59e0b', // Level 3 - Orange
    '#ef4444', // Level 4 - Red
  ];

  const glowColor = substrateColors[traits.substrate] || substrateColors[0];

  // Generate spore particles
  const spores = Array.from({ length: sporeCount }, (_, i) => {
    const angle = (i / sporeCount) * Math.PI * 2;
    const radius = 60 + Math.random() * 40;
    const x = 150 + Math.cos(angle) * radius;
    const y = 150 + Math.sin(angle) * radius;
    const size = 2 + Math.random() * 3;

    return { x, y, size, delay: i * 0.1 };
  });

  return (
    <div className="relative w-full aspect-square bg-gradient-to-b from-background to-surface rounded-2xl overflow-hidden">
      <svg
        viewBox="0 0 300 300"
        className="w-full h-full"
        style={{ filter: `drop-shadow(0 0 20px ${glowColor}40)` }}
      >
        {/* Substrate glow effect */}
        <defs>
          <radialGradient id="substrateGlow" cx="50%" cy="50%">
            <stop offset="0%" stopColor={glowColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </radialGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background glow */}
        <circle
          cx="150"
          cy="150"
          r="120"
          fill="url(#substrateGlow)"
          opacity={0.3 + (traits.substrate * 0.15)}
        />

        {/* Spore particles */}
        {spores.map((spore, i) => (
          <circle
            key={i}
            cx={spore.x}
            cy={spore.y}
            r={spore.size}
            fill={glowColor}
            opacity="0.6"
            className="animate-pulse"
            style={{
              animationDelay: `${spore.delay}s`,
              animationDuration: '2s',
            }}
          />
        ))}

        {/* Mushroom stem */}
        <rect
          x="135"
          y={200 - stemHeight}
          width="30"
          height={stemHeight}
          fill="#E5E7EB"
          rx="15"
          filter="url(#glow)"
          className="transition-all duration-500"
        />

        {/* Stem details */}
        <ellipse
          cx="150"
          cy={210 - stemHeight / 2}
          rx="18"
          ry="8"
          fill="#D1D5DB"
          opacity="0.5"
        />

        {/* Mushroom cap */}
        <ellipse
          cx="150"
          cy={200 - stemHeight}
          rx={capSize / 2}
          ry={capSize / 3}
          fill={glowColor}
          filter="url(#glow)"
          className="transition-all duration-500"
        />

        {/* Cap highlight */}
        <ellipse
          cx="150"
          cy={195 - stemHeight}
          rx={capSize / 3}
          ry={capSize / 5}
          fill="white"
          opacity="0.3"
        />

        {/* Cap spots */}
        {traits.cap > 0 && (
          <>
            <circle cx="130" cy={200 - stemHeight} r="8" fill="white" opacity="0.6" />
            <circle cx="170" cy={195 - stemHeight} r="6" fill="white" opacity="0.6" />
            <circle cx="150" cy={190 - stemHeight} r="7" fill="white" opacity="0.6" />
          </>
        )}

        {/* Substrate level indicator */}
        <g transform="translate(150, 250)">
          {Array.from({ length: 5 }, (_, i) => (
            <circle
              key={i}
              cx={-40 + i * 20}
              cy="0"
              r="4"
              fill={i < traits.substrate ? glowColor : '#2F2F2F'}
              opacity={i < traits.substrate ? 1 : 0.3}
              className="transition-all duration-300"
            />
          ))}
        </g>
      </svg>



      {/* Trait indicators */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs">
        <div className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-lg">
          <span className="text-textSecondary">Cap: </span>
          <span className="text-text font-semibold">{traits.cap > 0 ? '+' : ''}{traits.cap}</span>
        </div>
        <div className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-lg">
          <span className="text-textSecondary">Stem: </span>
          <span className="text-text font-semibold">{traits.stem > 0 ? '+' : ''}{traits.stem}</span>
        </div>
        <div className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-lg">
          <span className="text-textSecondary">Spores: </span>
          <span className="text-text font-semibold">{traits.spores > 0 ? '+' : ''}{traits.spores}</span>
        </div>
      </div>


    </div>
  );
};
