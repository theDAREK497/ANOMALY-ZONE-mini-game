import React from 'react';

export const CustomGamepad = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 12h4m-2-2v4" />
    <circle cx="15" cy="11" r="1" />
    <circle cx="18" cy="13" r="1" />
  </svg>
);

export const CustomWarning = ({ className = "w-4 h-4 inline-block mr-1 text-red-500" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M12 2L2 22h20L12 2z" />
    <path d="M12 8v6M12 18v.01" />
  </svg>
);

export const CustomRun = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M14 6l-4 4 2 2m4-2l4-4m-12 8l-4 4 2 2" />
    <circle cx="16" cy="4" r="2" />
  </svg>
);

export const CustomCrown = ({ className = "w-4 h-4 inline-block mr-1 text-yellow-400" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M2 20h20M4 20l2-14 4 6 2-10 2 10 4-6 2 14" />
  </svg>
);

export const CustomNote = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);

export const CustomTarget = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const CustomGun = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M4 10V14H6V20H10V14H18L20 10V6H8L6 10H4Z" />
  </svg>
);

export const CustomShield = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const CustomBiohazard = ({ className = "w-4 h-4 inline-block mr-1 text-purple-400" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="12" cy="12" r="2" />
    <path d="M12 10V4M10 13l-5 3M14 13l5 3" />
    <path d="M10 6a6 6 0 000 8M14 6a6 6 0 010 8" />
  </svg>
);

export const CustomBug = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="8" y="6" width="8" height="14" rx="4" />
    <path d="M12 2v4" />
    <path d="M6 10h2M16 10h2M6 14h2M16 14h2M6 18h2M16 18h2" />
  </svg>
);

export const CustomGhost = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M6 22L8 20L10 22L12 20L14 22L16 20L18 22V8A6 6 0 006 8V22Z" />
    <circle cx="10" cy="12" r="1" />
    <circle cx="14" cy="12" r="1" />
  </svg>
);

export const CustomRat = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M18 16a4 4 0 000-8H10a6 6 0 00-6 6v2h14z" />
    <path d="M22 16c0 2-2 4-4 4h-4" />
    <circle cx="14" cy="12" r="1" />
  </svg>
);

export const CustomDice = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <circle cx="15.5" cy="15.5" r="1.5" />
    <circle cx="15.5" cy="8.5" r="1.5" />
    <circle cx="8.5" cy="15.5" r="1.5" />
  </svg>
);

export const CustomJoker = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M12 4c-4 0-8 2-8 6s8 10 8 10 8-6 8-10-4-6-8-6z" />
    <circle cx="10" cy="10" r="1" />
    <circle cx="14" cy="10" r="1" />
    <path d="M10 14h4" />
  </svg>
);

export const CustomPig = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="10" cy="10" r="1" />
    <circle cx="14" cy="10" r="1" />
    <ellipse cx="12" cy="14" rx="3" ry="2" />
    <path d="M6 10L4 6C4 6 7 6 8 8" />
    <path d="M18 10L20 6C20 6 17 6 16 8" />
  </svg>
);

export const CustomHeart = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);

export const CustomDiamond = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2L2 12l10 10 10-10L12 2z"/>
  </svg>
);

export const CustomClub = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2c-1.66 0-3 1.34-3 3 0 1.3.84 2.4 2 2.82V10h-2v4h2v8h2v-8h2v-4h-2V7.82c1.16-.42 2-1.52 2-2.82 0-1.66-1.34-3-3-3zm-6 8c-1.66 0-3 1.34-3 3s1.34 3 3 3c.75 0 1.43-.27 1.95-.73V13.27A2.977 2.977 0 0 0 6 10zm12 0c-.36 0-.71.07-1.04.19v2.54c.52.46 1.2.73 1.95.73 1.66 0 3-1.34 3-3s-1.34-3-3-3z"/>
  </svg>
);

export const CustomSpade = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2s-8 9-8 14c0 2.21 1.79 4 4 4 1.34 0 2.53-.66 3.25-1.67.28.66.86 1.15 1.57 1.48v4.19h2v-4.19c.71-.33 1.29-.82 1.57-1.48C17.47 19.34 18.66 20 20 20c2.21 0 4-1.79 4-4 0-5-8-14-8-14zm-4 16c-1.1 0-2-.9-2-2 0-.84.53-1.55 1.26-1.85C6.44 14.86 6 15.38 6 16c0 1.1.9 2 2 2v-2zm10 0v2c1.1 0 2-.9 2-2 0-.62-.44-1.14-1.26-1.85.73.3 1.26 1.01 1.26 1.85 0 1.1-.9 2-2 2z"/>
  </svg>
);

export const CustomTrophy = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M4 4h16m-2 0v5c0 3.87-3.13 7-7 7s-7-3.13-7-7V4h14zM8 16v4m-4 0h16" />
  </svg>
);

export const CustomHandshake = ({ className = "w-4 h-4 inline-block mr-1" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M14 6l4-4 4 4M2 13h10M6 17l4-4 4 4" />
    <rect x="2" y="9" width="8" height="8" rx="2" />
    <rect x="14" y="9" width="8" height="8" rx="2" />
  </svg>
);

