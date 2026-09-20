// ─────────────────────────────────────────────────────────────
//  Данные графика «Прогресс развития».
//  Период: с 1 по 20 сентября 2026. Одна свеча = 4 часа (6 свечей в сутки).
//  Значение = % готовности проекта (0–100).
//  Данные детерминированные (одни и те же при каждой загрузке),
//  последняя свеча закрывается ровно на PROJECT_PROGRESS.
// ─────────────────────────────────────────────────────────────

export const PROJECT_PROGRESS = 30 // ← поменяйте, когда проект продвинется дальше

export const STEP_HOURS = 4
export const STEP_MS = STEP_HOURS * 60 * 60 * 1000
export const CANDLES = 120 // 20 дней × 6 свечей
export const START_MS = new Date(2026, 8, 1, 0, 0, 0).getTime() // 1 сентября 2026, 00:00
export const PERIOD_LABEL = '1–20 сентября 2026'

function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Опорные точки: [номер свечи, % готовности].
// Между ними — резкие рывки вверх и быстрые откаты, как на реальных торгах.
const WAYPOINTS = [
  [0, 1.0],
  [8, 3.4],
  [14, 1.8], // откат
  [24, 7.8], // рывок
  [30, 5.9], // откат
  [38, 5.0],
  [46, 11.8], // рывок
  [52, 8.6], // резкое падение
  [60, 8.9],
  [70, 16.4], // рывок
  [78, 12.6], // откат
  [86, 14.2],
  [94, 21.8], // рывок
  [100, 17.6], // резкое падение
  [106, 19.4],
  [112, 26.8], // рывок
  [116, 23.9], // откат
  [119, PROJECT_PROGRESS],
]

function segment(i) {
  for (let k = 0; k < WAYPOINTS.length - 1; k++) {
    const [i0, v0] = WAYPOINTS[k]
    const [i1, v1] = WAYPOINTS[k + 1]
    if (i >= i0 && i <= i1) {
      const t = (i - i0) / (i1 - i0)
      return { v: v0 + (v1 - v0) * t, slope: Math.abs(v1 - v0) / (i1 - i0) }
    }
  }
  return { v: WAYPOINTS[WAYPOINTS.length - 1][1], slope: 0 }
}

export function buildProgressData() {
  const rnd = mulberry32(20260901)
  const out = []
  let prev = 0.7
  let noise = 0

  for (let i = 0; i < CANDLES; i++) {
    const { v, slope } = segment(i)
    const vol = Math.min(2.2, Math.max(0.7, 0.7 + slope * 1.6)) // волатильность выше на рывках
    noise = noise * 0.4 + (rnd() - 0.5) * 1.9 * vol
    const ripple = 0.7 * Math.sin(i * 0.62) + 0.4 * Math.sin(i * 1.37 + 1.2) // «волны»
    const fade = i >= CANDLES - 3 ? (CANDLES - 1 - i) / 2 : 1

    const close = i === CANDLES - 1 ? PROJECT_PROGRESS : Math.max(0.3, v + (noise + ripple) * fade)
    const open = prev
    const high = Math.max(open, close) + rnd() * 0.7 * vol
    const low = Math.max(0.05, Math.min(open, close) - rnd() * 0.7 * vol)
    const volume = Math.round(14 + rnd() * 34 + Math.abs(close - open) * 30)

    out.push({ t: START_MS + i * STEP_MS, o: open, h: high, l: low, c: close, v: volume })
    prev = close
  }
  return out
}
