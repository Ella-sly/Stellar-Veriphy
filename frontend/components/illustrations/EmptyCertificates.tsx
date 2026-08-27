export function EmptyCertificates({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Empty certificate list illustration"
    >
      {/* Background circle */}
      <circle cx="120" cy="120" r="100" fill="currentColor" opacity="0.05" />
      
      {/* Document stack */}
      <g transform="translate(60, 60)">
        {/* Back document */}
        <rect
          x="15"
          y="15"
          width="90"
          height="110"
          rx="4"
          fill="currentColor"
          opacity="0.1"
        />
        
        {/* Middle document */}
        <rect
          x="10"
          y="10"
          width="90"
          height="110"
          rx="4"
          fill="currentColor"
          opacity="0.15"
        />
        
        {/* Front document */}
        <rect
          x="5"
          y="5"
          width="90"
          height="110"
          rx="4"
          fill="currentColor"
          opacity="0.2"
          stroke="currentColor"
          strokeWidth="2"
        />
        
        {/* Certificate details */}
        <rect x="15" y="25" width="60" height="4" rx="2" fill="currentColor" opacity="0.3" />
        <rect x="15" y="35" width="50" height="3" rx="1.5" fill="currentColor" opacity="0.2" />
        <rect x="15" y="42" width="45" height="3" rx="1.5" fill="currentColor" opacity="0.2" />
        
        {/* Ribbon/seal */}
        <circle cx="50" cy="85" r="12" fill="currentColor" opacity="0.15" />
        <path
          d="M 50 75 L 45 95 L 50 90 L 55 95 Z"
          fill="currentColor"
          opacity="0.2"
        />
      </g>
    </svg>
  );
}
