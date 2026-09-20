const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const IconCursor = () => (
  <svg {...base}>
    <path d="M5 3.5l13 6.5-5.8 1.9L10 18z" />
  </svg>
)
export const IconLine = () => (
  <svg {...base}>
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="6" r="2" />
    <path d="M7.5 16.5l9-9" />
  </svg>
)
export const IconRect = () => (
  <svg {...base}>
    <rect x="4" y="6" width="16" height="12" rx="1.5" />
  </svg>
)
export const IconHLine = () => (
  <svg {...base}>
    <path d="M3 12h18" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
)
export const IconTrash = () => (
  <svg {...base}>
    <path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13M10 11v6M14 11v6" />
  </svg>
)
export const IconClear = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="8" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </svg>
)
export const IconPlus = () => (
  <svg {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IconMinus = () => (
  <svg {...base}>
    <path d="M5 12h14" />
  </svg>
)
export const IconFit = () => (
  <svg {...base}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
)
export const IconLock = () => (
  <svg {...base} width="22" height="22">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
)
