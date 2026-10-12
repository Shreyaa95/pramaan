import React from 'react';

/**
 * BrandLogo - Creative Half-Hindi / Half-English Hybrid Wordmark for PRAMAAN
 * 
 * Design Concept:
 * Seamless typographic fusion within the single word "PRAMAAN":
 * - The first half is styled in authentic Devanagari calligraphy ("प्र" - PRA)
 * - The second half is sculpted in razor-sharp geometric Latin capitals ("MAAN")
 * - Connected via a shared Shirorekha (the upper horizontal bar across "प्र" extends
 *   organically into a crimson laser canopy framing the top of "MAAN")
 * - Features custom apex pins on the Latin "A"s and an embedded certificate seal medal emblem
 */
export function BrandLogo({ size = 'md', showTagline = true, className = '', linkHome = false }) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const iconSizes = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-10 h-10 rounded-2xl',
    lg: 'w-14 h-14 rounded-2xl'
  };

  const sealSvgSizes = {
    sm: 18,
    md: 22,
    lg: 30
  };

  const textScales = {
    sm: {
      hindi: 'text-[21px]',
      english: 'text-[17px]',
      tracking: 'tracking-[0.16em]',
      tagline: 'text-[9.5px]'
    },
    md: {
      hindi: 'text-[26px]',
      english: 'text-[20px]',
      tracking: 'tracking-[0.18em]',
      tagline: 'text-[10px]'
    },
    lg: {
      hindi: 'text-[42px]',
      english: 'text-[34px]',
      tracking: 'tracking-[0.20em]',
      tagline: 'text-[12.5px]'
    }
  }[size];

  const logoNode = (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* 1. Precision Certified Medal Seal Symbol */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center shrink-0 bg-gradient-to-br from-[#1c1c22] via-[#121216] to-[#09090b] border border-white/15 shadow-xl shadow-black/70 group ring-1 ring-white/10 overflow-hidden`}
        style={{
          boxShadow: '0 4px 20px -2px rgba(202, 0, 25, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        }}
      >
        {/* Ambient subtle backglow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#ca0019]/35 to-transparent pointer-events-none" />

        {/* Seal SVG Vector */}
        <svg
          width={sealSvgSizes[size]}
          height={sealSvgSizes[size]}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 transition-transform duration-300 group-hover:scale-105"
        >
          {/* Certificate Seal Outer Crest */}
          <path
            d="M12 2L14.2 4.2L17.2 4L18.4 6.8L21.2 7.8L21.2 10.8L23 13L21.2 15.2L21.2 18.2L18.4 19.2L17.2 22L14.2 21.8L12 24L9.8 21.8L6.8 22L5.6 19.2L2.8 18.2L2.8 15.2L1 13L2.8 10.8L2.8 7.8L5.6 6.8L6.8 4L9.8 4.2L12 2Z"
            fill="url(#seal-grad)"
            stroke="#ef4444"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          {/* Inner Certification Ring */}
          <circle cx="12" cy="13" r="5" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.85" />
          {/* Distinctive Central Star */}
          <path
            d="M12 9.75L13.1 11.95L15.5 12.3L13.75 14L14.2 16.35L12 15.2L9.8 16.35L10.25 14L8.5 12.3L10.9 11.95L12 9.75Z"
            fill="#ffffff"
          />
          <defs>
            <linearGradient id="seal-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ca0019" />
              <stop offset="1" stopColor="#850010" />
            </linearGradient>
          </defs>
        </svg>

        {/* Specular sheen beam */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#ff4d64] to-transparent pointer-events-none" />
      </div>

      {/* 2. Typographic Lockup: Half Hindi ("प्र") + Half English ("MAAN") in ONE Seamless Name */}
      <div className="flex flex-col justify-center">
        {/* The single unified hybrid word */}
        <div className="relative inline-flex items-center leading-none">
          {/* Overhead Shirorekha Connector Bar flowing from Hindi 'प्र' over to English 'MAAN' */}
          <div className="absolute -top-[3px] left-0 right-0 h-[2px] bg-gradient-to-r from-[#ef4444] via-[#ca0019] to-[#ef4444]/30 rounded-full pointer-events-none shadow-sm shadow-[#ca0019]" />

          {/* First Half: HINDI "प्र" (PRA) */}
          <span
            className={`${textScales.hindi} font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ff3852] via-[#ca0019] to-[#ef4444] leading-none inline-flex items-center`}
            style={{
              fontFamily: "'Rozha One', 'Yatra One', serif",
              textShadow: '0 0 14px rgba(202, 0, 25, 0.45)'
            }}
          >
            प्र
          </span>

          {/* Seamless Transition Anchor */}
          <span className="w-[1.5px] h-3 bg-[#ca0019]/60 mx-1 rounded-full opacity-60 self-center" />

          {/* Second Half: ENGLISH "MAAN" */}
          <span
            className={`${textScales.english} ${textScales.tracking} font-black uppercase text-white font-display inline-flex items-center leading-none`}
            style={{
              fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
              textShadow: '0 2px 10px rgba(0,0,0,0.5)'
            }}
          >
            <span className="hover:text-[#ef4444] transition-colors">M</span>
            <span className="relative">
              A
              <span className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-1.5 h-[2px] bg-[#ca0019] rounded-full" />
            </span>
            <span className="relative">
              A
              <span className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-1.5 h-[2px] bg-[#ca0019] rounded-full" />
            </span>
            <span className="hover:text-[#ef4444] transition-colors">N</span>
          </span>

          {/* Micro Authenticity Verified Chip */}
          <span className="hidden xs:inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded-md bg-[#ca0019]/15 border border-[#ca0019]/35 text-[9px] font-extrabold text-[#ef4444] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono">VERIFIED</span>
          </span>
        </div>

        {/* Refined Subtitle Tagline */}
        {showTagline && (
          <p
            className={`${textScales.tagline} text-gray-400 font-sans tracking-wide font-normal truncate mt-1 flex items-center gap-1.5`}
          >
            <span className="text-gray-300 font-medium">प्रमाणपत्र निर्माण मंच</span>
            <span className="text-gray-600 hidden xs:inline">&bull;</span>
            <span className="hidden xs:inline">Certificate Automation Engine</span>
          </p>
        )}
      </div>
    </div>
  );

  if (linkHome) {
    return (
      <a href="/" className="inline-flex hover:opacity-95 transition-opacity">
        {logoNode}
      </a>
    );
  }

  return logoNode;
}
