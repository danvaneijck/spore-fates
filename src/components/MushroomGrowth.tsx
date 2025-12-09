
export const MushroomGrowth = () => {
    console.log('Rendering MushroomGrowth animation')
    return (
        <div className="relative w-32 h-32 flex items-center justify-center overflow-hidden">
            <style>{`
        @keyframes growStem {
          0% { height: 0; opacity: 0; }
          20% { height: 0; opacity: 1; }
          100% { height: 50px; opacity: 1; }
        }
        @keyframes popCap {
          0% { transform: scale(0); }
          60% { transform: scale(0); }
          80% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes floatSpores {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-40px) scale(1.5); opacity: 0; }
        }
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 5px rgba(168, 85, 247, 0.5)); }
          50% { filter: drop-shadow(0 0 15px rgba(168, 85, 247, 0.8)); }
        }
      `}</style>

            {/* The "Soil" / Pot area */}
            <div className="absolute bottom-0 w-24 h-4 bg-gradient-to-t from-emerald-900 to-emerald-700 rounded-[50%] opacity-80 blur-[1px]" />

            <svg width="120" height="120" viewBox="0 0 100 100" className="z-10 overflow-visible">
                <defs>
                    <linearGradient id="stemGrad" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor="#e2e8f0" />
                        <stop offset="100%" stopColor="#cbd5e1" />
                    </linearGradient>
                    <linearGradient id="capGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#9333ea" />
                    </linearGradient>
                </defs>

                {/* Group centered horizontally */}
                <g transform="translate(50, 90)">

                    {/* Stem: Grows upwards (negative Y) */}
                    <rect
                        x="-6"
                        y="-50"
                        width="12"
                        height="50"
                        rx="4"
                        fill="url(#stemGrad)"
                        className="origin-bottom"
                        style={{
                            animation: 'growStem 1.5s ease-out forwards',
                            height: '0px' // Initial state handled by keyframe, but fallback here
                        }}
                    />

                    {/* Cap: Pops on top of stem */}
                    {/* Stem height is 50, so cap sits at y = -50 */}
                    <g transform="translate(0, -50)">
                        <path
                            d="M -25 0 Q 0 -35 25 0 Z"
                            fill="url(#capGrad)"
                            className="origin-bottom"
                            style={{ animation: 'popCap 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
                        />
                        {/* Cap Spots */}
                        <circle cx="-10" cy="-10" r="3" fill="white" fillOpacity="0.4" style={{ animation: 'popCap 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }} />
                        <circle cx="12" cy="-8" r="2" fill="white" fillOpacity="0.4" style={{ animation: 'popCap 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }} />
                    </g>
                </g>
            </svg>

            {/* Particle Spores (CSS animation dots) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
                <div className="absolute top-[40%] left-[45%] w-1.5 h-1.5 bg-purple-300 rounded-full" style={{ animation: 'floatSpores 2s infinite 1.6s' }} />
                <div className="absolute top-[45%] left-[55%] w-1 h-1 bg-blue-300 rounded-full" style={{ animation: 'floatSpores 2.5s infinite 1.8s' }} />
                <div className="absolute top-[40%] left-[50%] w-2 h-2 bg-pink-300 rounded-full" style={{ animation: 'floatSpores 1.8s infinite 2.0s' }} />
            </div>
        </div>
    );
};