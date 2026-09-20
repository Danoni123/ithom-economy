import { NEWS } from '../data/news.js'

export default function News() {
  return (
    <section id="news" className="news">
      <div className="container">
        <div className="news-head">
          <h2>Новости проекта</h2>
          <p>Что происходит с ITHom прямо сейчас</p>
        </div>

        <div className="news-grid">
          {NEWS.map((n) => (
            <article key={n.id} className="card">
              <div className="card-meta">
                <span className="tag">{n.tag}</span>
                <time>{n.date}</time>
              </div>
              <h3>{n.title}</h3>
              <p>{n.text}</p>
              <a href="#news" className="card-link">
                Читать новость
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
