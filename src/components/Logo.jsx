export default function Logo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="0.75" y="0.75" width="22.5" height="22.5" rx="6.5" fill="none" stroke="currentColor" strokeOpacity=".3" />
      <path d="M8 5.5v13M12 4v15M16 7v13" stroke="currentColor" strokeOpacity=".5" strokeWidth="1.2" />
      <rect x="6.5" y="9" width="3" height="6" fill="#fff" />
      <rect x="10.5" y="7" width="3" height="7" fill="#8c8c8c" />
      <rect x="14.5" y="11" width="3" height="5" fill="#fff" />
    </svg>
  )
}
