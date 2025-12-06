import React from 'react';

interface MushroomRendererProps {
  cap: number;      // -3 to +3
  stem: number;     // -3 to +3
  spores: number;   // -3 to +3
  substrate: number; // 0 to 4
  size?: number;
}

export const MushroomRenderer: React.FC<MushroomRendererProps> = ({
  cap,
  stem,
  spores,
  substrate,
  size = 300,
}) => {
  // Map trait values to visual properties
  const getCapStyle = (value: number) => {
    const baseSize = size * 0.6;
    const sizeMultiplier = 1 + (value * 0.15);
    const capSize = baseSize * sizeMultiplier;
    
    // Color intensity based on value
    const hue = value >= 0 ? 280 : 0; // Purple for positive, red for negative
    const saturation = 60 + Math.abs(value) * 10;
    const lightness = 50 + value * 5;
    
    return {
      width: capSize,
      height: capSize * 0.6,
      backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
      position: 'absolute' as const,
      top: size * 0.1,
      left: '50%',
      transform: 'translateX(-50%)',
      boxShadow: `0 ${size * 0.02}px ${size * 0.04}px rgba(0,0,0,0.3)`,
      border: `${size * 0.01}px solid rgba(255,255,255,0.2)`,
    };
  };

  const getStemStyle = (value: number) => {
    const baseWidth = size * 0.2;
    const baseHeight = size * 0.4;
    const widthMultiplier = 1 + (value * 0.1);
    const heightMultiplier = 1 + (value * 0.15);
    
    const stemWidth = baseWidth * widthMultiplier;
    const stemHeight = baseHeight * heightMultiplier;
    
    const lightness = 85 + value * 3;
    
    return {
      width: stemWidth,
      height: stemHeight,
      backgroundColor: `hsl(30, 20%, ${lightness}%)`,
      borderRadius: `${stemWidth * 0.3}px`,
      position: 'absolute' as const,
      bottom: size * 0.15,
      left: '50%',
      transform: 'translateX(-50%)',
      boxShadow: `inset ${size * 0.01}px 0 ${size * 0.02}px rgba(0,0,0,0.1)`,
    };
  };

  const getSporeStyle = (value: number) => {
    const count = Math.max(3, 3 + value);
    const opacity = 0.3 + (Math.abs(value) * 0.1);
    
    return {
      count,
      opacity,
      color: value >= 0 ? '#9E7FFF' : '#ef4444',
    };
  };

  const getSubstrateStyle = (level: number) => {
    const colors = [
      '#8B4513', // Brown - Level 0
      '#CD853F', // Peru - Level 1
      '#DAA520', // Goldenrod - Level 2
      '#FFD700', // Gold - Level 3
      '#FFA500', // Orange - Level 4
    ];
    
    return {
      height: size * 0.15,
      backgroundColor: colors[level] || colors[0],
      borderRadius: `${size * 0.02}px`,
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      boxShadow: `0 -${size * 0.01}px ${size * 0.02}px rgba(0,0,0,0.2)`,
    };
  };

  const sporeConfig = getSporeStyle(spores);
  
  return (
    <div 
      className="relative"
      style={{ 
        width: size, 
        height: size,
        margin: '0 auto',
      }}
    >
      {/* Substrate Layer */}
      <div style={getSubstrateStyle(substrate)}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-xs opacity-70">
            Prestige {substrate}
          </span>
        </div>
      </div>
      
      {/* Stem */}
      <div style={getStemStyle(stem)} />
      
      {/* Cap */}
      <div style={getCapStyle(cap)}>
        {/* Spots on cap */}
        <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 'inherit' }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white opacity-20"
              style={{
                width: `${15 + Math.random() * 10}%`,
                height: `${15 + Math.random() * 10}%`,
                top: `${20 + Math.random() * 40}%`,
                left: `${10 + Math.random() * 70}%`,
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Spores (particles around mushroom) */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(sporeConfig.count)].map((_, i) => {
          const angle = (i / sporeConfig.count) * Math.PI * 2;
          const radius = size * 0.4;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          return (
            <div
              key={i}
              className="absolute rounded-full animate-pulse"
              style={{
                width: size * 0.03,
                height: size * 0.03,
                backgroundColor: sporeConfig.color,
                opacity: sporeConfig.opacity,
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 ${size * 0.02}px ${sporeConfig.color}`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: '2s',
              }}
            />
          );
        })}
      </div>
      
      {/* Trait Values Display */}
      <div className="absolute -bottom-12 left-0 right-0 flex justify-around text-xs font-mono">
        <div className="text-center">
          <div className="text-gray-400">Cap</div>
          <div className={cap >= 0 ? 'text-green-400' : 'text-red-400'}>
            {cap > 0 ? '+' : ''}{cap}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Stem</div>
          <div className={stem >= 0 ? 'text-green-400' : 'text-red-400'}>
            {stem > 0 ? '+' : ''}{stem}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Spores</div>
          <div className={spores >= 0 ? 'text-green-400' : 'text-red-400'}>
            {spores > 0 ? '+' : ''}{spores}
          </div>
        </div>
      </div>
    </div>
  );
};
