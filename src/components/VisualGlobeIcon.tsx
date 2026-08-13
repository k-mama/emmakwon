type VisualGlobeIconProps = {
  size?: number;
  className?: string;
};

export default function VisualGlobeIcon({ size = 22, className }: VisualGlobeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <path d="M4 8 Q12 6.5 20 8" />
        <path d="M4 16 Q12 17.5 20 16" />
      </g>
    </svg>
  );
}
