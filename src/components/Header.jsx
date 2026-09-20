import { useState } from 'react'
import Logo from './Logo.jsx'

const LINKS = [
  ['График', '#chart'],
  ['Новости', '#news'],
  ['О проекте', '#about'],
]

export default function Header({ progress }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="header" id="top">
      <div className="container header-inner">
        <a href="#top" className="brand" aria-label="ITHom economy — на главную">
          <Logo />
          <span className="brand-name">
            ITHom<em>economy</em>
          </span>
        </a>

        <nav className={`nav${open ? ' open' : ''}`} aria-label="Основная навигация">
          {LINKS.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
        </nav>

        <div className="header-right">
          <div className="hp" title={`Готовность проекта: ${progress}%`}>
            <span className="hp-label">Готовность</span>
            <span className="hp-bar">
              <i style={{ width: `${progress}%` }} />
            </span>
            <b>{progress}%</b>
          </div>
          <button
            type="button"
            className="burger"
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  )
}
