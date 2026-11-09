// Friendly two-tone icons for the tab bar. Outlines and faces use currentColor; the body uses
// --icon-fill (soft honey when the tab is active), and the cheeks are a fixed blush.
// Decorative only: the link text next to each icon is its accessible name.

import type { ReactNode } from "react";

export type NavIconName = "home" | "study" | "list" | "stats" | "settings";

const FILL = "var(--icon-fill)";
const CHEEK = "var(--icon-cheek)";

/** Two dot eyes, a smile and blush cheeks, centred on (x, y). */
function Face({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  const s = size;
  return (
    <g>
      <circle cx={x - 3.2 * s} cy={y + 2.2 * s} r={1.25 * s} fill={CHEEK} stroke="none" />
      <circle cx={x + 3.2 * s} cy={y + 2.2 * s} r={1.25 * s} fill={CHEEK} stroke="none" />
      <circle cx={x - 2 * s} cy={y} r={1 * s} fill="currentColor" stroke="none" />
      <circle cx={x + 2 * s} cy={y} r={1 * s} fill="currentColor" stroke="none" />
      <path d={`M${x - 1.4 * s} ${y + 2.4 * s} q${1.4 * s} ${1.5 * s} ${2.8 * s} 0`} fill="none" strokeWidth={1.6 * s} />
    </g>
  );
}

const ICONS: Record<NavIconName, ReactNode> = {
  home: (
    <>
      <rect x="20" y="6.5" width="3.6" height="6" rx="1" fill={FILL} />
      <path d="M5.5 15 16 6.5 26.5 15v9.5a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3z" fill={FILL} />
      <Face x={16} y={18.5} />
    </>
  ),
  study: (
    <>
      <rect x="10.5" y="5.5" width="14" height="18.5" rx="3" fill="var(--surface)" transform="rotate(9 17.5 14.75)" />
      <rect x="5.5" y="8.5" width="15.5" height="19.5" rx="3" fill={FILL} />
      <Face x={13.25} y={16.5} />
      <path d="M28.5 1.75v4M26.5 3.75h4" strokeWidth={1.6} />
    </>
  ),
  list: (
    <>
      <rect x="6.5" y="6" width="19" height="22" rx="3.5" fill={FILL} />
      <rect x="11.5" y="3.75" width="9" height="4.5" rx="1.75" fill="var(--surface)" />
      <path d="M11.4 15.3l-1.7-1.6a1.1 1.1 0 0 1 1.7-1.4 1.1 1.1 0 0 1 1.7 1.4z" fill={CHEEK} stroke={CHEEK} strokeWidth="1" />
      <circle cx="11.4" cy="19" r="1" fill="currentColor" stroke="none" />
      <circle cx="11.4" cy="23.5" r="1" fill="currentColor" stroke="none" />
      <path d="M15 14h6M15 19h6M15 23.5h4" />
    </>
  ),
  stats: (
    <>
      <rect x="4.5" y="17" width="6.5" height="10.5" rx="2.25" fill={FILL} />
      <rect x="12.75" y="12" width="6.5" height="15.5" rx="2.25" fill={FILL} />
      <rect x="21" y="5.5" width="7" height="22" rx="2.5" fill={FILL} />
      <Face x={24.5} y={10.5} size={0.62} />
      <path d="M3 28.5h26" />
    </>
  ),
  settings: (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <rect key={angle} x="13.75" y="3" width="4.5" height="6" rx="1.4" fill={FILL} transform={`rotate(${angle} 16 16)`} />
      ))}
      <circle cx="16" cy="16" r="9" fill={FILL} />
      <Face x={16} y={15} />
    </>
  ),
};

export default function NavIcon({ name, className = "size-7" }: { name: NavIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}
