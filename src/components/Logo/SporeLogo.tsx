import React, { useMemo } from 'react';

interface SporeLogoProps {
    size?: number;
    className?: string;
    withText?: boolean; // Option to show "Spore Fates" text
}

// "Brand" Colors
const BRAND_PURPLE = '#9E7FFF';
const BRAND_GOLD = '#facc15';

// Hardcoded "Perfect" Genome for the logo (Diverse colors)
// [Toxin, Chitin, Phosphor, Primordial, Toxin, Chitin, Phosphor, Primordial]
const LOGO_GENOME = [1, 2, 3, 4, 1, 2, 3, 4];

// Gene Colors
const GENE_COLORS = [
    '#6b7280', // Rot
    '#ef4444', // Red
    '#10b981', // Green
    '#3b82f6', // Blue
    BRAND_GOLD, // Gold
];

export const SporeLogo: React.FC<SporeLogoProps> = ({
    size = 40,
    className = "",
    withText = false
}) => {

    // Static visual configuration (No random math here)
    const capSize = 145; // +3 Stats look
    const stemHeight = 110; // +3 Stats look
    const glowColor = BRAND_PURPLE;

    // Pre-calculated Orb Data (Deterministic for Logo consistency)
    const orbs = useMemo(() => {
        return LOGO_GENOME.map((gene, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 80;
            return {
                id: i,
                geneType: gene,
                color: GENE_COLORS[gene],
                x: 150 + Math.cos(angle) * radius,
                y: 150 + Math.sin(angle) * radius,
                animPattern: i % 2 === 0 ? 'logo-drift-wide' : 'logo-drift-vert',
                // Fixed delays so the logo always pulses in the same rhythm
                duration: 4 + (i * 0.5),
                delay: i * -1,
                size: gene === 4 ? 7 : 5
            };
        });
    }, []);

    return (
        <div className={`flex items-center ${className}`}>

            {/* 1. THE ICON */}
            <div
                style={{ width: size, height: size }}
                className="relative shrink-0 select-none"
            >
                <style>{`
          @keyframes logo-drift-wide {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(3px, 5px); }
          }
          @keyframes logo-drift-vert {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(-3px, -5px); }
          }
          @keyframes logo-pulse-gold {
            0%, 100% { stroke-width: 0; opacity: 0.6; }
            50% { stroke-width: 2px; opacity: 1; }
          }
        `}</style>

                <svg
                    viewBox="0 0 300 300"
                    className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(158,127,255,0.4)]"
                >
                    <defs>
                        <radialGradient id="logoGlow" cx="50%" cy="50%">
                            <stop offset="0%" stopColor={glowColor} stopOpacity={0.6} />
                            <stop offset="100%" stopColor={glowColor} stopOpacity={0} />
                        </radialGradient>

                        {/* Logo-specific stronger filter */}
                        <filter id="logoSoftGlow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Centering Group */}
                    <g transform="translate(0, 10)">

                        {/* Background Aura */}
                        <circle cx="150" cy="150" r="100" fill="url(#logoGlow)" opacity="0.4" />

                        {/* STEM */}
                        <rect
                            x="135"
                            y={200 - stemHeight}
                            width="30"
                            height={stemHeight}
                            fill="#F3F4F6"
                            rx="15"
                        />
                        {/* Stem Shadow */}
                        <path
                            d={`M 135 ${200 - stemHeight + 15} L 135 200 Q 150 210 165 200 L 165 ${200 - stemHeight + 15}`}
                            fill="black"
                            opacity="0.1"
                        />

                        {/* CAP */}
                        <ellipse
                            cx="150"
                            cy={200 - stemHeight}
                            rx={capSize / 2}
                            ry={capSize / 3}
                            fill={glowColor}
                        />

                        {/* Cap Shine/Highlight */}
                        <ellipse
                            cx="150"
                            cy={192 - stemHeight}
                            rx={capSize / 3}
                            ry={capSize / 5}
                            fill="white"
                            opacity="0.25"
                        />

                        {/* Decorative Spots */}
                        <circle cx="130" cy={200 - stemHeight} r="8" fill="white" opacity="0.5" />
                        <circle cx="170" cy={195 - stemHeight} r="6" fill="white" opacity="0.5" />
                        <circle cx="150" cy={190 - stemHeight} r="7" fill="white" opacity="0.5" />

                        {/* ORBS */}
                        {orbs.map((orb) => (
                            <g key={orb.id} style={{
                                animation: `${orb.animPattern} ${orb.duration}s ease-in-out infinite`,
                                animationDelay: `${orb.delay}s`
                            }}>
                                <circle
                                    cx={orb.x}
                                    cy={orb.y}
                                    r={orb.size}
                                    fill={orb.color}
                                    filter="url(#logoSoftGlow)"
                                    stroke="white"
                                    strokeOpacity={0.6}
                                    strokeWidth={1}
                                />
                                {orb.geneType === 4 && (
                                    <circle cx={orb.x} cy={orb.y} r={orb.size + 3} fill="none" stroke={BRAND_GOLD}
                                        style={{ animation: 'logo-pulse-gold 2s infinite' }}
                                    />
                                )}
                            </g>
                        ))}
                    </g>
                </svg>
            </div>

            {/* 2. OPTIONAL TEXT (Lockup) */}
            {withText && (
                <div className="flex flex-col justify-center">
                    <h1 className="font-bold leading-none tracking-tight text-text" style={{ fontSize: size * 0.6 }}>
                        Spore<span className="text-primary">Fates</span>
                    </h1>
                    <span className="text-textSecondary uppercase font-bold tracking-widest opacity-60" style={{ fontSize: size * 0.2 }}>
                        Evolution
                    </span>
                </div>
            )}
        </div>
    );
};