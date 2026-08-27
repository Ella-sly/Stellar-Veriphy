export function NoSearchResults({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="No search results illustration"
    >
      {/* Background circle */}
      <circle cx="120" cy="120" r="100" fill="currentColor" opacity="0.05" />
      
      {/* Magnifying glass */}
      <g transform="translate(70, 70)">
        {/* Glass lens */}
        <circle
          cx="40"
          cy="40"
          r="35"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          opacity="0.3"
        />
        
        {/* Inner circle for emphasis */}
        <circle
          cx="40"
          cy="40"
          r="25"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.15"
        />
        
        {/* Question mark inside */}
        <text
          x="40"
          y="50"
          fontSize="32"
          fontWeight="bold"
          textAnchor="middle"
          fill="currentColor"
          opacity="0.25"
        >
          ?
        </text>
        
        {/* Handle */}
        <line
          x1="65"
          y1="65"
          x2="90"
          y2="90"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.3"
        />
        
        {/* Handle grip */}
        <circle cx="90" cy="90" r="6" fill="currentColor" opacity="0.2" />
      </g>
    </svg>
  );
}
