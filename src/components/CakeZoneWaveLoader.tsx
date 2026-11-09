import React from 'react';

interface CakeZoneWaveLoaderProps {
  className?: string;
}

export const CakeZoneWaveLoader: React.FC<CakeZoneWaveLoaderProps> = ({ className = '' }) => {
  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* Wave Styles injected specifically for seamless 2s Brevo-style text fill */}
      <style>{`
        @keyframes cakezoneWaveHoriz1 {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-200px);
          }
        }
        @keyframes cakezoneWaveHoriz2 {
          0% {
            transform: translateX(-100px);
          }
          100% {
            transform: translateX(-300px);
          }
        }
        @keyframes cakezoneWaveRise {
          0% {
            transform: translateY(105px);
          }
          20% {
            transform: translateY(85px);
          }
          50% {
            transform: translateY(50px);
          }
          80% {
            transform: translateY(18px);
          }
          100% {
            transform: translateY(-8px);
          }
        }
        .cz-wave-flow-1 {
          animation: cakezoneWaveHoriz1 1.2s linear infinite;
        }
        .cz-wave-flow-2 {
          animation: cakezoneWaveHoriz2 1.5s linear infinite;
        }
        .cz-wave-rising-liquid {
          animation: cakezoneWaveRise 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          will-change: transform;
        }
      `}</style>

      {/* SVG Liquid Wave Text Mask */}
      <div className="w-full max-w-[340px] sm:max-w-[420px] md:max-w-[460px] px-4">
        <svg
          viewBox="0 0 460 110"
          className="w-full h-auto overflow-visible drop-shadow-sm"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Text Clip Path for CakeZone */}
            <clipPath id="cz-text-clip">
              <text
                x="230"
                y="62"
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif"
                fontWeight="900"
                fontSize="68"
                letterSpacing="-0.03em"
              >
                CakeZone
              </text>
            </clipPath>

            {/* Rich Brand Purple / Violet Liquid Gradient */}
            <linearGradient id="cz-liquid-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#3d216f" />
              <stop offset="50%" stopColor="#4f378a" />
              <stop offset="100%" stopColor="#6750a4" />
            </linearGradient>

            {/* Rosy Violet Underwave Gradient for Organic Liquid Depth */}
            <linearGradient id="cz-liquid-underwave" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#9d4edd" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#d946ef" stopOpacity="0.45" />
            </linearGradient>
          </defs>

          {/* 1. Base Silhouette: Faint outline/shape of "CakeZone" (identical to Brevo loader) */}
          <text
            x="230"
            y="62"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif"
            fontWeight="900"
            fontSize="68"
            letterSpacing="-0.03em"
            fill="#4f378a"
            fillOpacity="0.16"
          >
            CakeZone
          </text>

          {/* 2. Liquid Filling Masked to "CakeZone" */}
          <g clipPath="url(#cz-text-clip)">
            {/* Liquid Group rising from bottom (105px) to top (-8px) over 2s */}
            <g className="cz-wave-rising-liquid">
              {/* Back Secondary Wave (Slightly higher & different frequency) */}
              <g className="cz-wave-flow-2">
                <path
                  d="M 0 10 Q 50 0, 100 10 T 200 10 T 300 10 T 400 10 T 500 10 T 600 10 T 700 10 T 800 10 T 900 10 L 900 180 L 0 180 Z"
                  fill="url(#cz-liquid-underwave)"
                />
              </g>

              {/* Front Primary Wave */}
              <g className="cz-wave-flow-1">
                <path
                  d="M 0 14 Q 50 2, 100 14 T 200 14 T 300 14 T 400 14 T 500 14 T 600 14 T 700 14 T 800 14 T 900 14 L 900 180 L 0 180 Z"
                  fill="url(#cz-liquid-gradient)"
                />
              </g>
            </g>
          </g>
        </svg>
      </div>

      {/* Subtle Luxury Caption */}
      <p className="mt-3 text-[11px] sm:text-xs font-semibold tracking-[0.22em] uppercase text-primary/60 text-center animate-pulse">
        Artisanal Patisserie
      </p>
    </div>
  );
};
