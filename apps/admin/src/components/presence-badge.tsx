import type { SVGProps } from 'react';
import { CalendarCheck2, CalendarPlus2, CalendarX2 } from 'lucide-react';

/** No calendar/rest combination in lucide matches the reference closely enough; composed to match its stroke style. */
function CalendarLeaveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
      <path d="M7.5 15.5c1.6 1.6 4.9 1.6 6.5 0M10 15.5c1.4 1.4 3.4 1.4 4.8 0" />
    </svg>
  );
}

export const PRESENCE_CONFIG = {
  DEFAULT: { label: 'Default', icon: CalendarCheck2, color: '#22c55e' },
  BUSY: { label: 'Busy', icon: CalendarX2, color: '#ef4444' },
  SICK: { label: 'Sick', icon: CalendarPlus2, color: '#a855f7' },
  LEAVE: { label: 'Leave', icon: CalendarLeaveIcon, color: '#3b82f6' },
} as const;
export type PresenceStatus = keyof typeof PRESENCE_CONFIG;

export function PresenceBadge({
  status,
  size = 28,
  ring = true,
}: {
  status: string;
  size?: number;
  ring?: boolean;
}) {
  const config = PRESENCE_CONFIG[status as PresenceStatus] ?? PRESENCE_CONFIG.DEFAULT;
  const Icon = config.icon;
  return (
    <span
      className={`presence-badge${ring ? ' presence-badge-ring' : ''}`}
      style={{ width: size, height: size, background: config.color }}
      role="img"
      aria-label={`Presence status: ${config.label}`}
      title={config.label}
    >
      <Icon size={Math.round(size * 0.6)} color="#fff" strokeWidth={2.4} aria-hidden="true" />
    </span>
  );
}

export function PresenceSelector({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (status: PresenceStatus) => void;
  disabled?: boolean;
}) {
  return (
    <div className="presence-selector" role="radiogroup" aria-label="Presence status">
      {(Object.keys(PRESENCE_CONFIG) as PresenceStatus[]).map((status) => {
        const config = PRESENCE_CONFIG[status];
        const selected = value === status;
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            className={`presence-option${selected ? ' selected' : ''}`}
            onClick={() => onChange(status)}
          >
            <PresenceBadge status={status} size={34} ring={false} />
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
