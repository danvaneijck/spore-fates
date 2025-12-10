import React, { useMemo } from 'react';
import { TraitExtension } from '../../services/shroomService';

interface MushroomRendererProps {
  traits: TraitExtension;
  minimal?: boolean;
}

// Gene Color Mapping
const GENE_COLORS = [
  '#6b7280', // 0: Rot (Gray)
  '#ef4444', // 1: Toxin (Red)
  '#10b981', // 2: Chitin (Green)
  '#3b82f6', // 3: Phosphor (Blue)
  '#facc15', // 4: Primordial (Gold)
];

export const MushroomRenderer: React.FC<MushroomRendererProps> = ({ traits, minimal = false }) => {
  // 1. Setup Data
  const capSize = 100 + (traits.cap * 15);
  const stemHeight = 80 + (traits.stem * 10);

  // Dynamic Colors based on Substrate
  const substrateColors = [
    '#9E7FFF', '#38bdf8', '#10b981', '#f59e0b', '#ef4444'
  ];
  const glowColor = substrateColors[traits.substrate] || substrateColors[0];
  const yOffset = minimal ? 20 : 0;

  // 2. Generate Genome Orbs
  const genomeOrbs = useMemo(() => {
    // Ensure we have 8 slots
    const genome = [...(traits.genome || []), 0, 0, 0, 0, 0, 0, 0, 0].slice(0, 8);

    return genome.map((gene, i) => {
      // Calculate a "home position" in a circle around the mushroom
      const angle = (i / 8) * Math.PI * 2;
      const radius = 80;
      const baseX = 150 + Math.cos(angle) * radius;
      const baseY = 150 + Math.sin(angle) * radius;

      const animPattern = i % 2 === 0 ? 'drift-wide' : 'drift-vertical';

      return {
        id: i,
        geneType: gene,
        color: GENE_COLORS[gene] || GENE_COLORS[0],
        x: baseX,
        y: baseY,

        // Movement Animation Props
        moveName: animPattern,
        moveDuration: 4 + Math.random() * 3,
        moveDelay: Math.random() * -5,

        // Opacity Animation Props (New)
        fadeDuration: 2 + Math.random() * 3, // Random breathing speed (2s to 5s)
        fadeDelay: Math.random() * -3,       // Random start offset

        size: gene === 4 ? 6 : gene === 0 ? 3 : 5
      };
    });
  }, [traits.genome]);

  return (
    <div className="relative w-full aspect-square bg-gradient-to-b from-background to-surface rounded-2xl overflow-hidden group">
      {/* CSS for the Floating Animation */}
      <style>{`
        @keyframes drift-wide {
          0% { transform: translate(0, 0); }
          25% { transform: translate(15px, -10px); }
          50% { transform: translate(5px, 15px); }
          75% { transform: translate(-15px, 5px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes drift-vertical {
          0% { transform: translate(0, 0); }
          33% { transform: translate(-10px, -20px); }
          66% { transform: translate(10px, -5px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes fade-breath {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes pulse-gold {
          0%, 100% { stroke-width: 0; opacity: 0.6; }
          50% { stroke-width: 3px; opacity: 1; }
        }
      `}</style>

      <svg
        viewBox="0 0 300 300"
        className="w-full h-full transition-transform duration-500 group-hover:scale-105"
        style={{ filter: `drop-shadow(0 0 20px ${glowColor}20)` }}
      >
        <defs>
          <radialGradient id="substrateGlow" cx="50%" cy="50%">
            <stop offset="0%" stopColor={glowColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={glowColor} stopOpacity={0} />
          </radialGradient>

          <filter id="softGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(0, ${yOffset})`}>

          {/* Background Aura */}
          <circle
            cx="150"
            cy="150"
            r="120"
            fill="url(#substrateGlow)"
            opacity={0.3 + (traits.substrate * 0.15)}
          />

          {/* MUSHROOM STEM */}
          <rect
            x="135"
            y={200 - stemHeight}
            width="30"
            height={stemHeight}
            fill="#E5E7EB"
            rx="15"
            className="transition-all duration-500"
          />
          {/* Stem Details */}
          <ellipse cx="150" cy={210 - stemHeight / 2} rx="18" ry="8" fill="#D1D5DB" opacity="0.5" />

          {/* MUSHROOM CAP */}
          <ellipse
            cx="150"
            cy={200 - stemHeight}
            rx={capSize / 2}
            ry={capSize / 3}
            fill={glowColor}
            className="transition-all duration-500"
          />
          {/* Cap Highlight */}
          <ellipse cx="150" cy={195 - stemHeight} rx={capSize / 3} ry={capSize / 5} fill="white" opacity="0.3" />

          {/* Cap Spots */}
          {traits.cap > 0 && (
            <>
              <circle cx="130" cy={200 - stemHeight} r="8" fill="white" opacity="0.6" />
              <circle cx="170" cy={195 - stemHeight} r="6" fill="white" opacity="0.6" />
              <circle cx="150" cy={190 - stemHeight} r="7" fill="white" opacity="0.6" />
            </>
          )}

          {/* GENOME ORBS (The 8 floating genes) */}
          {genomeOrbs.map((orb) => (
            <g key={orb.id} style={{
              // Movement applies to the group
              animation: `${orb.moveName} ${orb.moveDuration}s ease-in-out infinite`,
              animationDelay: `${orb.moveDelay}s`
            }}>
              {/* The Orb */}
              <circle
                cx={orb.x}
                cy={orb.y}
                r={orb.size}
                fill={orb.color}
                filter={orb.geneType !== 0 ? "url(#softGlow)" : undefined} // Rot doesn't glow
                stroke="white"
                strokeOpacity={0.4}
                // Fade animation applies directly to the circle
                style={{
                  animation: `fade-breath ${orb.fadeDuration}s ease-in-out infinite`,
                  animationDelay: `${orb.fadeDelay}s`
                }}
              />

              {/* Extra sparkles for Gold genes */}
              {orb.geneType === 4 && (
                <circle cx={orb.x} cy={orb.y} r={orb.size + 4} fill="none" stroke="#facc15"
                  style={{ animation: 'pulse-gold 2s infinite' }}
                />
              )}
            </g>
          ))}

          {/* Substrate Level Dots */}
          <g transform={minimal ? "translate(150, 265) scale(0.8)" : "translate(150, 250)"}>
            {Array.from({ length: 5 }, (_, i) => (
              <circle
                key={i}
                cx={-40 + i * 20}
                cy="0"
                r={minimal ? 5 : 4}
                fill={i < traits.substrate ? glowColor : '#2F2F2F'}
                opacity={i < traits.substrate ? 1 : 0.3}
                className="transition-all duration-300"
              />
            ))}
          </g>
        </g>
      </svg>

      {/* Footer Stats (Non-minimal only) */}
      {!minimal && (
        <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs">
          <div className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/5">
            <span className="text-textSecondary">Cap: </span>
            <span className="text-text font-semibold">{traits.cap > 0 ? '+' : ''}{traits.cap}</span>
          </div>
          <div className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/5">
            <span className="text-textSecondary">Stem: </span>
            <span className="text-text font-semibold">{traits.stem > 0 ? '+' : ''}{traits.stem}</span>
          </div>
          <div className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/5">
            <span className="text-textSecondary">Spores: </span>
            <span className="text-text font-semibold">{traits.spores > 0 ? '+' : ''}{traits.spores}</span>
          </div>
        </div>
      )}
    </div>
  );
};