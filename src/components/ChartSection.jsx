import { useEffect, useMemo, useState } from 'react'
import CandleChart from './CandleChart.jsx'
import InactiveChart from './InactiveChart.jsx'
import { PERIOD_LABEL, STEP_MS } from '../data/chartData.js'

const DAY = 24 * 60 * 60 * 1000

const TABS = [
  { id: 'cap', label: 'Капитализация', badge: 'Скоро' },
  { id: 'itc', label: 'Цена ITC', badge: 'Скоро' },
  { id: 'progress', label: 'Прогресс развития' },
]

// Разделы-заглушки: график пока недоступен, значения равны нулю
const INACTIVE = {
  cap: {
    title: 'Общая капитализация ITHom',
    value: '$0',
    zero: '$0',
    card: 'График капитализации пока не активен',
    text: 'Сейчас капитализация проекта равна $0. Свечи появятся здесь после запуска.',
  },
  itc: {
    title: 'Цена токена ITC',
    value: '$0.00',
    zero: '$0.00',
    card: 'График цены ITC пока недоступен',
    text: 'Токен ITC ещё не запущен, поэтому цена равна $0.00. График появится здесь после запуска токена.',
  },
}

const fmtDelta = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`

export default function ChartSection({ data, progress }) {
  const [tab, setTab] = useState('progress')
  const [filled, setFilled] = useState(false)

  // полоса прогресса заполняется синхронно с появлением свечей
  useEffect(() => {
    const id = requestAnimationFrame(() => setFilled(true))
    return () => cancelAnimationFrame(id)
  }, [tab])

  const stats = useMemo(() => {
    const n = data.length
    const perDay = Math.round(DAY / STEP_MS)
    const last = data[n - 1]
    return {
      day: last.c - data[n - 1 - perDay].c,
      week: last.c - data[n - 1 - perDay * 7].c,
      hi: Math.max(...data.map((d) => d.h)),
      lo: Math.min(...data.map((d) => d.l)),
    }
  }, [data])

  const inactive = INACTIVE[tab]

  return (
    <section id="chart" className="chart-section">
      <div className="container">
        <div className="tabs" role="tablist" aria-label="Выбор графика">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls="chart-panel"
              className="tab"
              onClick={() => {
                setFilled(false)
                setTab(t.id)
              }}
            >
              {t.label}
              {t.badge && <span className="tab-badge">{t.badge}</span>}
            </button>
          ))}
        </div>

        <div className="panel" id="chart-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'progress' ? (
            <>
              <div className="panel-head">
                <div className="ph-main">
                  <p className="ph-title">Прогресс развития проекта ITHom, {PERIOD_LABEL}</p>
                  <div className="ph-row">
                    <span className="ph-value">{progress}%</span>
                    <span className="ph-sub">выполнено из 100%</span>
                    <span className={`chip ${stats.day >= 0 ? 'up' : 'down'}`}>{fmtDelta(stats.day)} за сутки</span>
                  </div>
                </div>
                <dl className="ph-stats">
                  <div>
                    <dt>7 дней</dt>
                    <dd className={stats.week >= 0 ? 'up' : 'down'}>{fmtDelta(stats.week)}</dd>
                  </div>
                  <div>
                    <dt>Максимум</dt>
                    <dd>{stats.hi.toFixed(2)}%</dd>
                  </div>
                  <div>
                    <dt>Минимум</dt>
                    <dd>{stats.lo.toFixed(2)}%</dd>
                  </div>
                  <div>
                    <dt>Осталось</dt>
                    <dd>{(100 - progress).toFixed(0)}%</dd>
                  </div>
                </dl>
              </div>

              <CandleChart key="progress" data={data} storageKey="progress-v2" stepMs={STEP_MS} />

              <div className="track">
                <div className="track-head">
                  <span>Выполнение проекта</span>
                  <span>
                    <b>{progress}</b> из 100%
                  </span>
                </div>
                <div className="track-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                  <i style={{ width: filled ? `${progress}%` : '0%' }} />
                  <em style={{ left: '25%' }} />
                  <em style={{ left: '50%' }} />
                  <em style={{ left: '75%' }} />
                </div>
                <div className="track-scale" aria-hidden="true">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="panel-head">
                <div className="ph-main">
                  <p className="ph-title">{inactive.title}</p>
                  <div className="ph-row">
                    <span className="ph-value">{inactive.value}</span>
                    <span className="chip idle">Не активна</span>
                  </div>
                </div>
                <dl className="ph-stats">
                  <div>
                    <dt>24 часа</dt>
                    <dd>—</dd>
                  </div>
                  <div>
                    <dt>Максимум</dt>
                    <dd>—</dd>
                  </div>
                  <div>
                    <dt>Минимум</dt>
                    <dd>—</dd>
                  </div>
                  <div>
                    <dt>Объём</dt>
                    <dd>$0</dd>
                  </div>
                </dl>
              </div>
              <InactiveChart key={tab} title={inactive.card} text={inactive.text} zero={inactive.zero} />
            </>
          )}
        </div>

        {tab === 'progress' && (
          <p className="chart-note">
            Период: {PERIOD_LABEL}, одна свеча — 4 часа. Колесо мыши или щипок пальцами — масштаб, перетаскивание —
            сдвиг. Линии и прямоугольники рисуются инструментами слева.
          </p>
        )}
      </div>
    </section>
  )
}
