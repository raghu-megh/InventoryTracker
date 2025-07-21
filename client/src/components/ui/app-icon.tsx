interface AppIconProps {
  size?: number;
  className?: string;
}

export function AppIcon({ size = 32, className = "" }: AppIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 64 64" 
      width={size} 
      height={size}
      className={className}
    >
      {/* Background circle */}
      <circle cx="32" cy="32" r="30" fill="#2563eb" stroke="#1d4ed8" strokeWidth="2"/>
      
      {/* Main inventory container */}
      <rect x="18" y="20" width="28" height="20" rx="2" fill="#ffffff" opacity="0.9"/>
      
      {/* Stacked inventory boxes */}
      <rect x="22" y="16" width="8" height="6" rx="1" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.5"/>
      <rect x="32" y="16" width="8" height="6" rx="1" fill="#34d399" stroke="#10b981" strokeWidth="0.5"/>
      <rect x="22" y="24" width="8" height="6" rx="1" fill="#f87171" stroke="#ef4444" strokeWidth="0.5"/>
      <rect x="32" y="24" width="8" height="6" rx="1" fill="#a78bfa" stroke="#8b5cf6" strokeWidth="0.5"/>
      
      {/* Analytics chart bars */}
      <rect x="24" y="34" width="2" height="4" fill="#2563eb"/>
      <rect x="27" y="32" width="2" height="6" fill="#2563eb"/>
      <rect x="30" y="30" width="2" height="8" fill="#2563eb"/>
      <rect x="33" y="28" width="2" height="10" fill="#2563eb"/>
      <rect x="36" y="26" width="2" height="12" fill="#2563eb"/>
      
      {/* Success check mark */}
      <circle cx="48" cy="18" r="6" fill="#10b981"/>
      <path 
        d="M45 18 l2 2 l4 -4" 
        stroke="#ffffff" 
        strokeWidth="1.5" 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AppIconLarge({ size = 64, className = "" }: AppIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 128 128" 
      width={size} 
      height={size}
      className={className}
    >
      {/* Background circle with gradient */}
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:"#3b82f6", stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:"#1d4ed8", stopOpacity:1}} />
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="58" fill="url(#bgGradient)" stroke="#1e40af" strokeWidth="4"/>
      
      {/* Main inventory container */}
      <rect x="32" y="36" width="64" height="44" rx="4" fill="#ffffff" opacity="0.95"/>
      
      {/* Detailed stacked inventory boxes */}
      <rect x="40" y="28" width="18" height="14" rx="2" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/>
      <rect x="62" y="28" width="18" height="14" rx="2" fill="#34d399" stroke="#10b981" strokeWidth="1"/>
      <rect x="84" y="28" width="18" height="14" rx="2" fill="#f87171" stroke="#ef4444" strokeWidth="1"/>
      
      <rect x="40" y="48" width="18" height="14" rx="2" fill="#a78bfa" stroke="#8b5cf6" strokeWidth="1"/>
      <rect x="62" y="48" width="18" height="14" rx="2" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/>
      <rect x="84" y="48" width="18" height="14" rx="2" fill="#34d399" stroke="#10b981" strokeWidth="1"/>
      
      {/* Analytics chart */}
      <rect x="44" y="68" width="4" height="8" fill="#2563eb"/>
      <rect x="52" y="64" width="4" height="12" fill="#2563eb"/>
      <rect x="60" y="60" width="4" height="16" fill="#2563eb"/>
      <rect x="68" y="56" width="4" height="20" fill="#2563eb"/>
      <rect x="76" y="52" width="4" height="24" fill="#2563eb"/>
      <rect x="84" y="68" width="4" height="8" fill="#2563eb"/>
      
      {/* Large success indicator */}
      <circle cx="96" cy="36" r="12" fill="#10b981"/>
      <path 
        d="M88 36 l4 4 l8 -8" 
        stroke="#ffffff" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}