/* Icon set of the original design (kept unchanged for visual fidelity). */
import type { ReactNode } from 'react';

export type IconName =
  | "grid"
  | "box"
  | "shirt"
  | "trend"
  | "wallet"
  | "truck"
  | "exchange"
  | "settings"
  | "search"
  | "chevron"
  | "bell"
  | "sun"
  | "moon"
  | "panel"
  | "plus"
  | "download"
  | "arrow"
  | "calendar"
  | "more"
  | "close"
  | "check"
  | "help"
  | "logout"
  | "external"
  | "user"
  | "trash"
  | "edit"
  | "monitor";
export function Icon({
  name,
  size = 20,
  ...props
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const paths: Record<IconName, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    box: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" />
      </>
    ),
    shirt: <path d="m8 3-5 3-2 5 5 2v8h12v-8l5-2-2-5-5-3c0 4-8 4-8 0Z" />,
    trend: (
      <>
        <path d="m3 17 6-6 4 4 8-10M15 5h6v6" />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="3" />
        <path d="M17 11h4v5h-4a2.5 2.5 0 0 1 0-5ZM4 6l13-3v2" />
      </>
    ),
    truck: (
      <>
        <path d="M3 5h12v12H3zM15 10h4l3 4v3h-7" />
        <circle cx="6.5" cy="18" r="2.5" />
        <circle cx="18.5" cy="18" r="2.5" />
      </>
    ),
    exchange: (
      <>
        <path d="M4 7h16l-4-4M20 17H4l4 4M20 7l-4 4M4 17l4-4" />
      </>
    ),
    settings: (
      <>
        <path d="m9 3-1 3-3 1-2 4 2 2v4l4 2 3-1 3 1 4-2v-4l2-2-2-4-3-1-1-3Z" />
        <circle cx="12" cy="11" r="3" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    chevron: <path d="m8 10 4 4 4-4" />,
    bell: (
      <>
        <path d="M5 16h14l-2-3V9a5 5 0 0 0-10 0v4l-2 3ZM10 20h4" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </>
    ),
    moon: <path d="M20.9 13.1A9 9 0 0 1 10.9 3.1 9 9 0 1 0 20.9 13.1Z" />,
    panel: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    download: (
      <>
        <path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4m10-4v4M3 11h18M7 15h2m4 0h2" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01" />
      </>
    ),
    logout: (
      <>
        <path d="M9 4H4v16h5m5-13 5 5-5 5m-5-5h10" />
      </>
    ),
    external: <path d="M14 3h7v7m0-7L10 14M10 4H4v16h16v-6" />,
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
    edit: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4" />,
    monitor: (
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
