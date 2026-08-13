import { useId } from "react";

type VisualGlobeIconProps = {
  size?: number;
  className?: string;
};

export default function VisualGlobeIcon({ size = 33, className }: VisualGlobeIconProps) {
  const gradientId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f0a1c0" />
          <stop offset="35%" stopColor="#b15fd1" />
          <stop offset="68%" stopColor="#8fdae0" />
          <stop offset="100%" stopColor="#f0b960" />
        </linearGradient>
      </defs>
      <g
        stroke={`url(#${gradientId})`}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <path d="M4 8 Q12 6.5 20 8" />
        <path d="M4 16 Q12 17.5 20 16" />
      </g>
    </svg>
  );
}
