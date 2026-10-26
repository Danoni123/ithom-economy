import { useMemo } from 'react'
import Header from './components/Header.jsx'
import ChartSection from './components/ChartSection.jsx'
import News from './components/News.jsx'
import Footer from './components/Footer.jsx'
import { buildProgressData, PROJECT_PROGRESS } from './data/chartData.js'
import { buildCapData, CAP_VALUE } from './data/capData.js'

export default function App() {
  const data = useMemo(() => buildProgressData(), [])
  const capData = useMemo(() => buildCapData(), [])

  return (
    <>
      <Header progress={PROJECT_PROGRESS} />
      <main>
        <section className="hero container">
          <h1>Экономика проекта ITHom</h1>
          <p>
            Следите за капитализацией и прогрессом развития так же, как за котировками на бирже: свечи, масштаб и
            собственные линии на графике.
          </p>
        </section>

        <ChartSection data={data} capData={capData} progress={PROJECT_PROGRESS} capValue={CAP_VALUE} />
        <News />
      </main>
      <Footer />
    </>
  )
}
