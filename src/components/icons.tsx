type IconProps = { className?: string };
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
export function ArrowIcon({ className }: IconProps) { return <svg {...base} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }
export function SearchIcon({ className }: IconProps) { return <svg {...base} className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>; }
export function ChevronIcon({ className }: IconProps) { return <svg {...base} className={className}><path d="m9 18 6-6-6-6" /></svg>; }
export function MenuIcon({ className }: IconProps) { return <svg {...base} className={className}><path d="M4 7h16M4 12h16M4 17h16" /></svg>; }
export function CloseIcon({ className }: IconProps) { return <svg {...base} className={className}><path d="m6 6 12 12M18 6 6 18" /></svg>; }
export function CheckIcon({ className }: IconProps) { return <svg {...base} className={className}><path d="m5 12 4 4L19 6" /></svg>; }
