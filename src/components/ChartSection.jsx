import { useEffect, useMemo, useState } from 'react'
import CandleChart from './CandleChart.jsx'
import InactiveChart from './InactiveChart.jsx'
import { PERIOD_LABEL, STEP_MS } from '../data/chartData.js'
import { CAP_VALUE, CAP_PERIOD_LABEL, CAP_STEP_MS } from '../data/capData.js'

const DAY = 24 * 60 * 60 * 1000

const TABS = [
  { id: 'cap', label: 'Капитализация' },
  { id: 'itc', label: 'Цена ITC', badge: 'Скоро' },
  { id: 'progress', label: 'Прогресс развития' },
]

// Раздел-заглушка: график пока недоступен, значения равны нулю
const INACTIVE = {
  itc: {
    title: 'Цена токена ITC',
    value: '$0.00',
    zero: '$0.00',
    card: 'График цены ITC пока недоступен',
    text: 'Токен ITC ещё не запущен, поэтому цена равна $0.00. График появится здесь после запуска токена.',
  },
}

const fmtDelta = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`
const fmtMoney = (v) => `${Math.round(v).toLocaleString('ru-RU')} ₽`
const fmtDeltaMoney = (v) => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v)).toLocaleString('ru-RU')} ₽`

const CHART_NOTE =
  'одна свеча — 4 часа. Колесо мыши или щипок пальцами — масштаб, перетаскивание — сдвиг. Линии и прямоугольники рисуются инструментами слева.'

export default function ChartSection({ data, capData, progress, capValue = CAP_VALUE }) {
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

  const capStats = useMemo(() => {
    const n = capData.length
    const perDay = Math.round(DAY / CAP_STEP_MS)
    const last = capData[n - 1]
    return {
      day: last.c - capData[n - 1 - perDay].c,
      start: capData[0].c,
      hi: Math.max(...capData.map((d) => d.h)),
      lo: Math.min(...capData.map((d) => d.l)),
      vol: capData.reduce((s, d) => s + d.v, 0),
    }
  }, [capData])

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
          {tab === 'progress' && (
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
          )}

          {tab === 'cap' && (
            <>
              <div className="panel-head">
                <div className="ph-main">
                  <p className="ph-title">Капитализация проекта ITHom, {CAP_PERIOD_LABEL}</p>
                  <div className="ph-row">
                    <span className="ph-value">{fmtMoney(capValue)}</span>
                    <span className="ph-sub">оценка проекта</span>
                    <span className={`chip ${capStats.day >= 0 ? 'up' : 'down'}`}>
                      {fmtDeltaMoney(capStats.day)} за сутки
                    </span>
                  </div>
                </div>
                <dl className="ph-stats">
                  <div>
                    <dt>Старт</dt>
                    <dd>{fmtMoney(capStats.start)}</dd>
                  </div>
                  <div>
                    <dt>Максимум</dt>
                    <dd className="up">{fmtMoney(capStats.hi)}</dd>
                  </div>
                  <div>
                    <dt>Минимум</dt>
                    <dd>{fmtMoney(capStats.lo)}</dd>
                  </div>
                  <div>
                    <dt>Рост за 6 дней</dt>
                    <dd className="up">
                      ×{Math.round((capValue / Math.max(capStats.start, 1)) * 10) / 10}
                    </dd>
                  </div>
                </dl>
              </div>

              <CandleChart
                key="cap"
                data={capData}
                storageKey="cap-v1"
                bounds={{ min: 0, max: 16000 }}
                formatValue={fmtMoney}
                formatAxis={fmtMoney}
                volumeLabel="Объём"
                stepMs={CAP_STEP_MS}
                ariaLabel="Свечной график капитализации ITHom"
                scale100={false}
                fmtChange={(v) => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v)).toLocaleString('ru-RU')} ₽`}
              />
            </>
          )}

          {inactive && (
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

        {(tab === 'progress' || tab === 'cap') && (
          <p className="chart-note">
            Период: {tab === 'cap' ? CAP_PERIOD_LABEL : PERIOD_LABEL}, {CHART_NOTE}
          </p>
        )}
      </div>
    </section>
  )
}
