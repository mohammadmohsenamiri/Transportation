import type { SVGProps } from "react";

export type IconName =
  | "dashboard"
  | "map"
  | "missions"
  | "shipments"
  | "routes"
  | "vehicles"
  | "organization"
  | "settings"
  | "truck"
  | "package"
  | "mission"
  | "ready"
  | "clock"
  | "alert"
  | "search"
  | "bell"
  | "menu"
  | "chevron-down"
  | "chevron-left"
  | "plus"
  | "pencil"
  | "trash"
  | "copy"
  | "power"
  | "upload"
  | "download"
  | "logo";

const paths: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.5" />
      <rect x="13.5" y="10.5" width="7" height="10" rx="1.5" />
      <rect x="3.5" y="13" width="7" height="7.5" rx="1.5" />
    </>
  ),
  map: (
    <>
      <path d="M9 4.5 3.5 6.5v13L9 17.5m0-13 6 2.5m-6-2.5v13m6-10.5 5.5-2v13L15 20.5m0-13v13m0-13-6 2.5" strokeLinejoin="round" />
    </>
  ),
  missions: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5v3M16 3.5v3M4 10h16M8.5 14h7M8.5 17h4.5" strokeLinecap="round" />
    </>
  ),
  shipments: (
    <>
      <path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Zm0 0v8L12 21m0-8v8m0-8 8-4.5v8L12 21" strokeLinejoin="round" />
    </>
  ),
  routes: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="18" r="2.2" />
      <circle cx="16" cy="7" r="1.6" />
      <path d="M7.8 7.2 14.5 6.6M15.5 8.6 8 16.5M9.6 17.3l6.6-.4" strokeLinecap="round" />
    </>
  ),
  vehicles: (
    <>
      <path d="M3.5 15.5V10l2-4h8l3 4h2.5a1.5 1.5 0 0 1 1.5 1.5V15.5" strokeLinejoin="round" />
      <path d="M3.5 15.5h16.5" />
      <circle cx="7.5" cy="16.5" r="2" />
      <circle cx="16.5" cy="16.5" r="2" />
    </>
  ),
  organization: (
    <>
      <rect x="9.5" y="3.5" width="5" height="5" rx="1" />
      <rect x="3.5" y="15.5" width="5" height="5" rx="1" />
      <rect x="15.5" y="15.5" width="5" height="5" rx="1" />
      <path d="M12 8.5v4m0 0H6v3m6-3h6v3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6M17.7 17.7l-1.6-1.6M7.9 7.9 6.3 6.3" strokeLinecap="round" />
    </>
  ),
  truck: (
    <>
      <path d="M3 7h9v9H3zM12 10h4l3 3v3h-7z" strokeLinejoin="round" />
      <circle cx="7" cy="17.5" r="1.7" />
      <circle cx="16.5" cy="17.5" r="1.7" />
    </>
  ),
  package: (
    <>
      <path d="M4 8.2 12 4l8 4.2v8L12 20.4 4 16.2Z" strokeLinejoin="round" />
      <path d="M4 8.2 12 12l8-3.8M12 12v8.4" />
    </>
  ),
  mission: (
    <>
      <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  ready: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.3 2.4 2.4 4.6-5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 21 19.5H3Z" strokeLinejoin="round" />
      <path d="M12 10v4" strokeLinecap="round" />
      <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.3-4.3" strokeLinecap="round" />
    </>
  ),
  bell: (
    <>
      <path d="M6 10a6 6 0 1 1 12 0v4.5l1.5 3H4.5L6 14.5Z" strokeLinejoin="round" />
      <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" />
    </>
  ),
  menu: (
    <>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" strokeLinecap="round" />
    </>
  ),
  "chevron-down": <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />,
  "chevron-left": <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />,
  plus: <path d="M12 5v14M5 12h14" strokeLinecap="round" />,
  pencil: (
    <path
      d="m4 20 .9-3.6L16.2 5.1a1.5 1.5 0 0 1 2.1 0l.6.6a1.5 1.5 0 0 1 0 2.1L7.6 19.1 4 20Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  trash: (
    <>
      <path d="M5 7h14M9.5 7V5.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5V7M7 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h5.4a1.5 1.5 0 0 0 1.5-1.4L17 7" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="1.8" />
      <path d="M15.5 8.5V6.3A1.8 1.8 0 0 0 13.7 4.5H6.3A1.8 1.8 0 0 0 4.5 6.3v7.4a1.8 1.8 0 0 0 1.8 1.8H8.5" />
    </>
  ),
  power: (
    <>
      <path d="M12 4v7" strokeLinecap="round" />
      <path d="M7 6.5a7 7 0 1 0 10 0" strokeLinecap="round" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15.5V4.5m0 0-4 4m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  download: (
    <>
      <path d="M12 4.5v11m0 0-4-4m4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  logo: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="M8 15.5 12 8l4 7.5M9.5 13h5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

export function Icon({ name, className, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
