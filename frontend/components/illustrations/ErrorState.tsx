export function ErrorState({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Error state illustration"
    >
      {/* Background circle */}
      <circle cx="120" cy="120" r="100" fill="currentColor" opacity="0.05" />
      
      {/* Alert triangle */}
      <g transform="translate(60, 50)">
        {/* Triangle outline */}
        <path
          d="M 60 15 L 10 125 L 110 125 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
        />
        
        {/* Exclamation mark */}
        <line
          x1="60"
          y1="50"
          x2="60"
          y2="85"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.25"
        />
        <circle cx="60" cy="100" r="4" fill="currentColor" opacity="0.25" />
        
        {/* Inner glow effect */}
        <circle cx="60" cy="70" r="40" fill="currentColor" opacity="0.05" />
      </g>
    </svg>
  );
}
