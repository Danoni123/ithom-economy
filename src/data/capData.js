// ─────────────────────────────────────────────────────────────
//  Данные графика «Капитализация».
//  Период: с 20 по 26 октября 2026. Одна свеча = 4 часа (6 свечей в сутки).
//  Значение = капитализация проекта в рублях.
//  Данные детерминированные (одни и те же при каждой загрузке),
//  последняя свеча закрывается ровно на CAP_VALUE.
// ─────────────────────────────────────────────────────────────

export const CAP_VALUE = 15000

export const CAP_STEP_HOURS = 4
export const CAP_STEP_MS = CAP_STEP_HOURS * 60 * 60 * 1000
export const CAP_CANDLES = 42 // 7 дней × 6 свечей
export const CAP_START_MS = new Date(2026, 9, 20, 0, 0, 0).getTime() // 20 октября 2026, 00:00
export const CAP_PERIOD_LABEL = '20–26 октября 2026'

function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Опорные точки: [номер свечи, капитализация в ₽].
// График начинается около нуля, идёт по разным ценам,
// а с 24 по 26 октября — резкий взлёт до 15 000 ₽.
const WAYPOINTS = [
  [0, 30],
  [4, 140],
  [7, 430],
  [10, 780],
  [13, 560], // откат
  [17, 1250],
  [21, 980], // откат
  [24, 1900], // старт большого роста
  [27, 2900],
  [30, 4300],
  [33, 6900],
  [35, 8300],
  [37, 10800],
  [39, 12700],
  [41, CAP_VALUE],
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

export function buildCapData() {
  const rnd = mulberry32(20261020)
  const out = []
  let prev = 18
  let noise = 0

  for (let i = 0; i < CAP_CANDLES; i++) {
    const { v, slope } = segment(i)
    // волатильность относительная: выше на крутых участках взлёта
    const vol = Math.min(0.06, Math.max(0.018, 0.02 + (slope / Math.max(v, 20)) * 0.9))
    noise = noise * 0.4 + (rnd() - 0.5) * 1.9 * vol
    const ripple = 0.011 * Math.sin(i * 0.72) + 0.007 * Math.sin(i * 1.9 + 1.2)
    const fade = i >= CAP_CANDLES - 3 ? (CAP_CANDLES - 1 - i) / 2 : 1

    const close = i === CAP_CANDLES - 1 ? CAP_VALUE : Math.max(8, v * (1 + (noise + ripple) * fade))
    const open = prev
    const high = Math.max(open, close) * (1 + rnd() * 0.012)
    const low = Math.max(4, Math.min(open, close) * (1 - rnd() * 0.012))
    const volume = Math.round(10 + rnd() * 30 + Math.abs(close - open) / Math.max(close, 1) * 80)

    out.push({ t: CAP_START_MS + i * CAP_STEP_MS, o: open, h: high, l: low, c: close, v: volume })
    prev = close
  }
  return out
}
