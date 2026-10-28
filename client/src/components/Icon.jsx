// Icon: the small line icons used across the site, drawn as inline SVG so
// they take the text colour (currentColor) and need no image files.
// Decorative by default (aria-hidden); pass `label` to make one meaningful.

const PATHS = {
  pin: <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  back: <path d="m14 6-6 6 6 6" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" /><circle cx="17" cy="9" r="2.3" /><path d="M16 14.6c2.2.1 3.9 1.4 4.5 4.4" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  copy: <><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1" /></>,
  map: <><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2Z" /><path d="M9 4v14m6-12v14" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4Z" /><circle cx="12" cy="13" r="3.5" /></>,
  gps: <><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="7.5" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  // Navigation and service tiles
  home: <><path d="m3 11 9-7 9 7" /><path d="M5 10v10h14V10" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M12 12v6M9 15h6" /></>,
  route: <><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  shield: <><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6Z" /><path d="m9 12 2 2 4-4" /></>,
  'pin-check': <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><path d="m9 9.5 2 2 4-4" /></>,
  // Report categories
  'cat-pothole': <><path d="M8 3 4 21M16 3l4 18" /><path d="M12 5v2m0 4v2m0 4v2" /></>,
  'cat-garbage': <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /><path d="M10 11v6m4-6v6" /></>,
  'cat-streetlight': <><path d="M9 21h6M12 21V9" /><path d="M8 5a4 4 0 0 1 8 0c0 2-2 3-2 4h-4c0-1-2-2-2-4Z" /></>,
  'cat-water': <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />,
  'cat-sewage': <><path d="M12 3v8M8 7h8" /><path d="M4 15c2-2 4-2 6 0s4 2 6 0 3-1.5 4-1M4 19c2-2 4-2 6 0s4 2 6 0 3-1.5 4-1" /></>,
  'cat-road': <><path d="M3 20h18M5 20l3-8h8l3 8" /><path d="M9 8 12 4l3 4" /></>,
  'cat-animals': <><circle cx="7" cy="9" r="1.8" /><circle cx="12" cy="6.5" r="1.8" /><circle cx="17" cy="9" r="1.8" /><path d="M8 17c0-2.5 1.8-5 4-5s4 2.5 4 5-2 3-4 3-4-.5-4-3Z" /></>,
  'cat-other': <><circle cx="12" cy="12" r="8.5" /><path d="M12 8v5m0 3v.01" /></>,
  // How it works
  report: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5h6v3H9zM12 11v5m-2.5-2.5L12 16l2.5-2.5" /></>,
  track: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /><path d="M3.5 12H2m20 0h-1.5" /></>,
  act: <><path d="M12 13s-4.5-3.8-4.5-7.2a4.5 4.5 0 0 1 9 0C16.5 9.2 12 13 12 13Z" /><circle cx="12" cy="6" r="1.4" /><path d="M5 20c1-2.6 3.8-4 7-4s6 1.4 7 4" /></>,
  resolve: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h5a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h5" /><path d="m15 15 2 2 3.5-3.5" /></>
};

export default function Icon({ name, size = 18, label, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    >
      {PATHS[name]}
    </svg>
  );
}
