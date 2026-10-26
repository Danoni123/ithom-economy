import Logo from './Logo.jsx'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-about" id="about">
            <a href="#top" className="brand">
              <Logo />
              <span className="brand-name">
                ITHom<em>economy</em>
              </span>
            </a>
            <p>
              ITHom economy — прозрачная витрина экономики проекта: капитализация и прогресс развития на одном
              графике.
            </p>
          </div>

          <nav className="footer-col" aria-label="Навигация по сайту">
            <h4>Сайт</h4>
            <a href="#chart">График</a>
            <a href="#news">Новости</a>
            <a href="#about">О проекте</a>
          </nav>

          <nav className="footer-col" aria-label="Проект">
            <h4>Проект</h4>
            <a href="#">Дорожная карта</a>
            <a href="#">Документы</a>
            <a href="#">Контакты</a>
          </nav>

          <nav className="footer-col" aria-label="Соцсети">
            <h4>Мы в сети</h4>
            <a href="https://t.me/ITHom_e" target="_blank" rel="noopener noreferrer">
              Telegram
            </a>
          </nav>
        </div>

        <div className="footer-mark" aria-hidden="true">
          ITHom economy
        </div>

        <div className="footer-bottom">
          <span>© {year} ITHom economy. Все права защищены.</span>
          <span>Информация на сайте не является инвестиционной рекомендацией.</span>
        </div>
      </div>
    </footer>
  )
}
