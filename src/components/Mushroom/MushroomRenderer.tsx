import React, { useEffect, useState, useRef } from 'react';
import { shroomService } from '../../services/shroomService';
import { Loader2 } from 'lucide-react';

interface MushroomRendererProps {
  tokenId: string;
  minimal?: boolean;
  refreshKey?: number;
}

export const MushroomRenderer: React.FC<MushroomRendererProps> = ({ tokenId, minimal = false, refreshKey }) => {
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    shroomService.getSvg(tokenId).then((data) => {
      if (cancelled) return;
      if (data) {
        setSvg(data);
      } else {
        setError(true);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [tokenId, refreshKey]);

  if (loading) {
    return (
      <div className="relative w-full aspect-square bg-gradient-to-b from-background to-surface rounded-2xl overflow-hidden flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={minimal ? 20 : 32} />
      </div>
    );
  }

  if (error || !svg) {
    return (
      <div className="relative w-full aspect-square bg-gradient-to-b from-background to-surface rounded-2xl overflow-hidden flex items-center justify-center">
        <span className="text-xs text-textSecondary">Failed to load</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square bg-gradient-to-b from-background to-surface rounded-2xl overflow-hidden group"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
