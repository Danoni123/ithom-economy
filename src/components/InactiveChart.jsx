import { IconLock } from './icons.jsx'

// Заглушка для графика капитализации: значение = 0, график пока не активен.
export default function InactiveChart({ title, text, zero = '$0' }) {
  const h = [60, 150, 240, 330]
  const v = [125, 250, 375, 500, 625, 750, 875]
  return (
    <div className="cc cc-inactive">
      <div className="cc-stage ia-stage">
        <svg className="ia-grid" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
          {h.map((y) => (
            <line key={y} x1="0" x2="1000" y1={y} y2={y} />
          ))}
          {v.map((x) => (
            <line key={x} x1={x} x2={x} y1="0" y2="430" />
          ))}
          <line className="ia-base" x1="0" x2="1000" y1="410" y2="410" />
        </svg>

        <div className="ia-axis" aria-hidden="true">
          {[12, 30, 48, 66].map((p) => (
            <span key={p} style={{ '--p': p / 100 }}>
              —
            </span>
          ))}
          <span className="zero" style={{ '--p': 0.82 }}>
            {zero}
          </span>
        </div>

        <div className="ia-card" role="status">
          <span className="ia-icon">
            <IconLock />
          </span>
          <h3>{title}</h3>
          <p>{text}</p>
        </div>
      </div>
    </div>
  )
}
