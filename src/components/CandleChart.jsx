import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IconCursor,
  IconLine,
  IconRect,
  IconHLine,
  IconTrash,
  IconClear,
  IconPlus,
  IconMinus,
  IconFit,
} from './icons.jsx'

/* ────────────────────────────────────────────────────────────
   Свечной график на canvas (без сторонних библиотек).

   Возможности:
   • зелёные / красные свечи + объём активности
   • масштаб: колесо мыши, щипок пальцами, кнопки +/−
   • сдвиг: перетаскивание
   • рисование: линия, прямоугольник, горизонтальный уровень
   • выделение объектов, перемещение, изменение размера,
     удаление (кнопка или Delete), смена цвета
   • рисунки сохраняются в localStorage
   ──────────────────────────────────────────────────────────── */

const UP = '#22c55e'
const DOWN = '#ef4444'
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const MIN_SPAN = 8
const SWATCHES = ['#ffffff', '#9a9a9a', '#22c55e', '#ef4444']
const fontFor = (W) => `${W > 1400 ? 12.5 : 11}px Onest, system-ui, sans-serif`

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
const dateShort = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const timeShort = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dateLong = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

let seq = 0
const newId = () => `d${Date.now().toString(36)}${(seq++).toString(36)}`

function layout(W, H) {
  const right = W < 520 ? 50 : W > 1400 ? 72 : 62
  const left = 6
  const top = 14
  const bottom = 26
  const plotW = Math.max(10, W - left - right)
  const plotH = Math.max(10, H - top - bottom)
  const volH = Math.round(plotH * 0.14)
  const priceH = plotH - volH - 10
  return {
    left,
    right,
    top,
    bottom,
    plotW,
    plotH,
    volH,
    priceH,
    priceTop: top,
    priceBottom: top + priceH,
    volTop: top + plotH - volH,
    volBottom: top + plotH,
    plotRight: left + plotW,
  }
}

function niceTicks(min, max, count) {
  const range = max - min || 1
  const rough = range / count
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const n = rough / pow
  const step = (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow
  const ticks = []
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) ticks.push(v)
  return { ticks, step }
}

// Через сколько свечей ставить подпись на оси времени (кратно часам/суткам)
const NICE_HOURS = [1, 2, 3, 4, 6, 8, 12, 24, 48, 72, 120, 168, 336, 720]
function labelEvery(barW, stepMs) {
  for (const h of NICE_HOURS) {
    const ms = h * HOUR
    if (ms % stepMs !== 0) continue
    const k = ms / stepMs
    if (k * barW >= 74) return k
  }
  return 90
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const l2 = dx * dx + dy * dy
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0
  t = clamp(t, 0, 1)
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function loadDrawings(key) {
  try {
    const raw = localStorage.getItem(`ithom:draw:${key}`)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function defaultView(n, screenW) {
  // по умолчанию вписываем весь период
  const span = n + 6
  return { start: -6, span }
}

function badge(ctx, text, x, y, w, bg, fg) {
  const h = 18
  ctx.fillStyle = bg
  ctx.fillRect(Math.round(x), Math.round(y - h / 2), Math.round(w), h)
  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + w / 2, y + 0.5)
}

function Btn({ active, disabled, title, onClick, children }) {
  return (
    <button
      type="button"
      className={`tb${active ? ' on' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default function CandleChart({
  data,
  storageKey = 'default',
  bounds = { min: 0, max: 100 },
  formatValue = (v) => `${v.toFixed(2)}%`,
  formatAxis = (v, step) => `${v.toFixed(Number.isInteger(step) ? 0 : 1)}%`,
  volumeLabel = 'Активность',
  stepMs = DAY,
  ariaLabel = 'Свечной график',
  scale100 = true,
  fmtChange = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`,
}) {
  const N = data.length

  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const ptrs = useRef(new Map())
  const dragRef = useRef(null)

  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState(() =>
    defaultView(N, typeof window !== 'undefined' ? window.innerWidth : 1200),
  )
  const [tool, setTool] = useState('cursor')
  const [color, setColor] = useState(SWATCHES[0])
  const [yMode, setYMode] = useState('auto')
  const [drawings, setDrawings] = useState(() => loadDrawings(storageKey))
  const [draft, setDraft] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [hover, setHover] = useState(null)
  const [fontTick, setFontTick] = useState(0)
  const [reveal, setReveal] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 1 : 0,
  )

  // «живые» копии для обработчиков событий
  const viewRef = useRef(view)
  const draftRef = useRef(draft)
  const selectedRef = useRef(selectedId)
  const scalesRef = useRef(null)
  viewRef.current = view
  draftRef.current = draft
  selectedRef.current = selectedId

  const maxSpan = Math.max(N + 20, 30)
  const clampView = useCallback(
    (v) => {
      const span = clamp(v.span, MIN_SPAN, maxSpan)
      const start = clamp(v.start, -span + 4, N - 5)
      return { start, span }
    },
    [N, maxSpan],
  )
  const applyView = useCallback(
    (v) => {
      const next = clampView(v)
      viewRef.current = next
      setView(next)
    },
    [clampView],
  )

  /* ───────── размер ───────── */
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setSize({ w: Math.round(r.width), h: Math.round(r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // перерисовать, когда загрузятся веб-шрифты
  useEffect(() => {
    document.fonts?.ready?.then(() => setFontTick((t) => t + 1))
  }, [])

  // единственная анимация: свечи «вырастают» слева направо при загрузке
  useEffect(() => {
    if (reveal >= 1) return
    let raf
    const t0 = performance.now()
    const dur = 1300
    const step = (now) => {
      const p = clamp((now - t0) / dur, 0, 1)
      setReveal(1 - Math.pow(1 - p, 3))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // сохранение рисунков
  useEffect(() => {
    try {
      localStorage.setItem(`ithom:draw:${storageKey}`, JSON.stringify(drawings))
    } catch {
      /* localStorage недоступен — не страшно */
    }
  }, [drawings, storageKey])

  /* ───────── шкалы ───────── */
  const scales = useMemo(() => {
    if (!size.w || !size.h) return null
    const L = layout(size.w, size.h)
    const { start, span } = view
    const i0 = Math.max(0, Math.floor(start))
    const i1 = Math.min(N - 1, Math.ceil(start + span))
    let min = Infinity
    let max = -Infinity
    let vmax = 1
    for (let i = i0; i <= i1; i++) {
      const c = data[i]
      if (c.l < min) min = c.l
      if (c.h > max) max = c.h
      if (c.v > vmax) vmax = c.v
    }
    if (!isFinite(min) || yMode === 'full') {
      min = bounds.min
      max = bounds.max
    } else {
      const pad = Math.max((max - min) * 0.14, 1)
      min = Math.max(bounds.min, min - pad)
      max = Math.min(bounds.max, max + pad)
    }
    if (max - min < 1e-6) max = min + 1
    return {
      L,
      min,
      max,
      vmax,
      xOf: (i) => L.left + ((i - start) / span) * L.plotW,
      iOf: (x) => start + ((x - L.left) / L.plotW) * span,
      yOf: (v) => L.priceTop + ((max - v) / (max - min)) * L.priceH,
      vOf: (y) => max - ((y - L.priceTop) / L.priceH) * (max - min),
    }
  }, [size, view, data, yMode, bounds.min, bounds.max, N])
  scalesRef.current = scales

  /* ───────── отрисовка ───────── */
  useEffect(() => {
    const canvas = canvasRef.current
    const s = scales
    if (!canvas || !s) return
    const { L } = s
    const W = size.w
    const H = size.h
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
    }
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.font = fontFor(W)

    const barW = L.plotW / view.span
    const t0 = data[0].t
    const timeOf = (i) => t0 + i * stepMs
    const intraday = stepMs < DAY
    const axisLabel = (t) => {
      const d = new Date(t)
      return intraday && (d.getHours() !== 0 || d.getMinutes() !== 0) ? timeShort.format(d) : dateShort.format(d)
    }
    const limit = reveal * N

    /* сетка + подписи оси Y */
    const { ticks, step } = niceTicks(s.min, s.max, Math.max(3, Math.floor(L.priceH / 70)))
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    for (const t of ticks) {
      const y = Math.round(s.yOf(t)) + 0.5
      ctx.moveTo(L.left, y)
      ctx.lineTo(L.plotRight, y)
    }
    ctx.stroke()

    /* сетка + подписи оси X */
    const k = labelEvery(barW, stepMs)
    const iFirst = Math.ceil(view.start / k) * k
    ctx.beginPath()
    const xLabels = []
    for (let i = iFirst; i <= view.start + view.span; i += k) {
      const x = Math.round(s.xOf(i)) + 0.5
      if (x < L.left + 20 || x > L.plotRight - 20) continue
      ctx.moveTo(x, L.top)
      ctx.lineTo(x, L.volBottom)
      xLabels.push([x, axisLabel(timeOf(i))])
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.045)'
    ctx.stroke()

    // рамка осей
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.beginPath()
    ctx.moveTo(L.plotRight + 0.5, L.top)
    ctx.lineTo(L.plotRight + 0.5, L.volBottom + 0.5)
    ctx.lineTo(L.left, L.volBottom + 0.5)
    ctx.stroke()

    ctx.fillStyle = '#7d7d7d'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const yBadge = clamp(s.yOf(data[N - 1].c), L.priceTop, L.priceBottom)
    for (const t of ticks) {
      const ty = s.yOf(t)
      if (reveal >= 1 && Math.abs(ty - yBadge) < 11) continue
      ctx.fillText(formatAxis(t, step), L.plotRight + 8, ty)
    }
    ctx.textAlign = 'center'
    for (const [x, label] of xLabels) ctx.fillText(label, x, L.volBottom + 14)

    ctx.textAlign = 'left'
    ctx.fillStyle = '#4d4d4d'
    ctx.fillText(volumeLabel, L.left + 8, L.volTop + 8)

    /* всё, что внутри области графика */
    ctx.save()
    ctx.beginPath()
    ctx.rect(L.left, L.top, L.plotW, L.plotH)
    ctx.clip()

    const i0 = Math.max(0, Math.floor(view.start) - 1)
    const i1 = Math.min(N - 1, Math.ceil(view.start + view.span) + 1)
    const bw = Math.max(1, Math.round(barW * 0.7))

    // объём
    for (let i = i0; i <= i1; i++) {
      if (i >= limit) break
      const c = data[i]
      const h = Math.max(1, (c.v / s.vmax) * (L.volH - 12))
      ctx.fillStyle = c.c >= c.o ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.30)'
      ctx.fillRect(Math.round(s.xOf(i) - bw / 2), L.volBottom - h, bw, h)
    }

    // свечи
    for (let i = i0; i <= i1; i++) {
      if (i >= limit) break
      const c = data[i]
      const up = c.c >= c.o
      const x = s.xOf(i)
      const yH = s.yOf(c.h)
      const yL = s.yOf(c.l)
      const yTop = s.yOf(Math.max(c.o, c.c))
      const yBot = s.yOf(Math.min(c.o, c.c))
      ctx.fillStyle = up ? UP : DOWN
      ctx.fillRect(Math.round(x - 0.5), Math.round(yH), 1, Math.max(1, Math.round(yL - yH)))
      ctx.fillRect(Math.round(x - bw / 2), Math.round(yTop), bw, Math.max(1, Math.round(yBot - yTop)))
    }

    // линия текущего значения
    const last = data[N - 1]
    const lastUp = last.c >= last.o
    const yLast = s.yOf(last.c)
    if (reveal >= 1) {
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = hexA(lastUp ? UP : DOWN, 0.75)
      ctx.beginPath()
      ctx.moveTo(L.left, Math.round(yLast) + 0.5)
      ctx.lineTo(L.plotRight, Math.round(yLast) + 0.5)
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.restore()

    // рисунки (только в области цен, не залезают на объём)
    ctx.save()
    ctx.beginPath()
    ctx.rect(L.left, L.priceTop, L.plotW, L.priceH)
    ctx.clip()
    const all = draft ? [...drawings, draft] : drawings
    for (const d of all) {
      const sel = d.id === selectedId
      const x1 = s.xOf(d.p1.i)
      const y1 = s.yOf(d.p1.v)
      const x2 = s.xOf(d.p2.i)
      const y2 = s.yOf(d.p2.v)
      ctx.strokeStyle = d.color
      ctx.lineWidth = sel ? 2.5 : 2
      ctx.lineCap = 'round'
      if (d.type === 'line') {
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      } else if (d.type === 'rect') {
        const rx = Math.min(x1, x2)
        const ry = Math.min(y1, y2)
        ctx.fillStyle = hexA(d.color, sel ? 0.2 : 0.13)
        ctx.fillRect(rx, ry, Math.abs(x2 - x1), Math.abs(y2 - y1))
        ctx.lineWidth = sel ? 2 : 1.5
        ctx.strokeRect(rx, ry, Math.abs(x2 - x1), Math.abs(y2 - y1))
      } else if (d.type === 'hline') {
        ctx.lineWidth = sel ? 2 : 1.5
        ctx.beginPath()
        ctx.moveTo(L.left, y1)
        ctx.lineTo(L.plotRight, y1)
        ctx.stroke()
      }
    }
    ctx.lineWidth = 1
    ctx.restore()

    /* ручки выделенного объекта */
    const selected = drawings.find((d) => d.id === selectedId)
    if (selected) {
      for (const h of handlesOf(selected, s)) {
        if (h.y < L.priceTop || h.y > L.priceBottom || h.x < L.left || h.x > L.plotRight) continue
        ctx.beginPath()
        ctx.arc(h.x, h.y, 5.5, 0, Math.PI * 2)
        ctx.fillStyle = '#000'
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = selected.color
        ctx.stroke()
      }
      ctx.lineWidth = 1
    }

    /* метки горизонтальных уровней на оси */
    ctx.font = fontFor(W)
    for (const d of all) {
      if (d.type !== 'hline') continue
      const y = s.yOf(d.p1.v)
      if (y < L.priceTop || y > L.priceBottom) continue
      badge(ctx, formatValue(d.p1.v), L.plotRight, y, L.right, d.color, '#000')
    }

    /* метка текущего значения */
    if (reveal >= 1) {
      badge(
        ctx,
        formatValue(last.c),
        L.plotRight,
        clamp(yLast, L.priceTop, L.priceBottom),
        L.right,
        lastUp ? UP : DOWN,
        '#000',
      )
    }

    /* перекрестие */
    if (hover && hover.x >= L.left && hover.x <= L.plotRight && hover.y >= L.top && hover.y <= L.volBottom) {
      const idx = Math.round(s.iOf(hover.x))
      const cx = Math.round(s.xOf(idx)) + 0.5
      ctx.setLineDash([3, 4])
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.moveTo(cx, L.top)
      ctx.lineTo(cx, L.volBottom)
      if (hover.y <= L.priceBottom) {
        ctx.moveTo(L.left, Math.round(hover.y) + 0.5)
        ctx.lineTo(L.plotRight, Math.round(hover.y) + 0.5)
      }
      ctx.stroke()
      ctx.setLineDash([])
      if (hover.y <= L.priceBottom) {
        badge(ctx, formatValue(s.vOf(hover.y)), L.plotRight, hover.y, L.right, '#e8e8e8', '#000')
      }
      const tt = timeOf(idx)
      const label = intraday ? `${dateShort.format(tt)}, ${timeShort.format(tt)}` : dateShort.format(tt)
      const lw = ctx.measureText(label).width + 18
      badge(ctx, label, clamp(cx - lw / 2, L.left, L.plotRight - lw), L.volBottom + 13, lw, '#e8e8e8', '#000')
    }
  }, [scales, size, data, view, drawings, draft, selectedId, hover, reveal, fontTick, N, formatAxis, formatValue, volumeLabel, stepMs])

  /* ───────── геометрия рисунков ───────── */
  function handlesOf(d, s) {
    const x1 = s.xOf(d.p1.i)
    const y1 = s.yOf(d.p1.v)
    const x2 = s.xOf(d.p2.i)
    const y2 = s.yOf(d.p2.v)
    if (d.type === 'line') return [{ key: 'p1', x: x1, y: y1 }, { key: 'p2', x: x2, y: y2 }]
    if (d.type === 'rect')
      return [
        { key: 'p1', x: x1, y: y1 },
        { key: 'p2', x: x2, y: y2 },
        { key: 'p3', x: x1, y: y2 },
        { key: 'p4', x: x2, y: y1 },
      ]
    return []
  }

  function hitShape(d, px, py, s, tol) {
    const x1 = s.xOf(d.p1.i)
    const y1 = s.yOf(d.p1.v)
    const x2 = s.xOf(d.p2.i)
    const y2 = s.yOf(d.p2.v)
    if (d.type === 'line') return distToSegment(px, py, x1, y1, x2, y2) <= tol
    if (d.type === 'hline') return Math.abs(py - y1) <= tol && px >= s.L.left && px <= s.L.plotRight
    return (
      px >= Math.min(x1, x2) - tol &&
      px <= Math.max(x1, x2) + tol &&
      py >= Math.min(y1, y2) - tol &&
      py <= Math.max(y1, y2) + tol
    )
  }

  function hitTest(px, py, tol) {
    const s = scalesRef.current
    if (!s) return null
    if (py < s.L.priceTop - 2 || py > s.L.priceBottom + 2) return null
    const sel = drawings.find((d) => d.id === selectedId)
    if (sel) {
      for (const h of handlesOf(sel, s)) {
        if (Math.hypot(h.x - px, h.y - py) <= tol + 4) return { id: sel.id, part: h.key }
      }
    }
    for (let k = drawings.length - 1; k >= 0; k--) {
      if (hitShape(drawings[k], px, py, s, tol)) return { id: drawings[k].id, part: 'body' }
    }
    return null
  }

  /* ───────── события ───────── */
  const getPos = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const clampPos = (p) => {
    const L = scalesRef.current.L
    return { x: clamp(p.x, L.left, L.plotRight), y: clamp(p.y, L.priceTop, L.priceBottom) }
  }
  const toData = (p) => {
    const s = scalesRef.current
    return { i: s.iOf(p.x), v: s.vOf(p.y) }
  }
  const inPlot = (p) => {
    const L = scalesRef.current.L
    return p.x >= L.left && p.x <= L.plotRight && p.y >= L.priceTop && p.y <= L.priceBottom
  }
  const updateDraft = (fn) => {
    const next = fn(draftRef.current)
    draftRef.current = next
    setDraft(next)
  }

  const setCursor = (c) => {
    if (canvasRef.current) canvasRef.current.style.cursor = c
  }

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const s = scalesRef.current
    if (!s) return
    canvasRef.current.setPointerCapture?.(e.pointerId)
    const pos = getPos(e)
    ptrs.current.set(e.pointerId, pos)

    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]
      dragRef.current = {
        type: 'pinch',
        dist0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        span0: viewRef.current.span,
        centerI: s.iOf((a.x + b.x) / 2),
      }
      draftRef.current = null
      setDraft(null)
      return
    }
    if (ptrs.current.size > 2) return
    if (e.pointerType === 'mouse' || tool !== 'cursor') setHover(pos)

    // инструменты рисования
    if (tool !== 'cursor' && inPlot(pos)) {
      const d = toData(clampPos(pos))
      const dr = { id: newId(), type: tool, p1: d, p2: { ...d }, color }
      draftRef.current = dr
      setDraft(dr)
      setSelectedId(null)
      dragRef.current = { type: 'draw' }
      return
    }

    // курсор: выбор объекта или сдвиг графика
    const tol = e.pointerType === 'mouse' ? 8 : 16
    const hit = tool === 'cursor' ? hitTest(pos.x, pos.y, tol) : null
    if (hit) {
      const d = drawings.find((x) => x.id === hit.id)
      setSelectedId(hit.id)
      dragRef.current = {
        type: hit.part === 'body' ? 'move' : 'handle',
        id: hit.id,
        part: hit.part,
        start: toData(clampPos(pos)),
        orig: { p1: { ...d.p1 }, p2: { ...d.p2 } },
      }
      setCursor('grabbing')
    } else {
      setSelectedId(null)
      dragRef.current = { type: 'pan', startX: pos.x, startStart: viewRef.current.start }
      setCursor('grabbing')
    }
  }

  const onPointerMove = (e) => {
    const s = scalesRef.current
    if (!s) return
    const pos = getPos(e)
    if (ptrs.current.has(e.pointerId)) ptrs.current.set(e.pointerId, pos)
    const d = dragRef.current

    if (!d) {
      if (e.pointerType === 'mouse') {
        setHover(pos)
        if (tool !== 'cursor') setCursor('crosshair')
        else setCursor(hitTest(pos.x, pos.y, 8) ? 'pointer' : 'crosshair')
      }
      return
    }

    if (d.type === 'pinch') {
      const pts = [...ptrs.current.values()]
      if (pts.length < 2) return
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1
      const cx = (pts[0].x + pts[1].x) / 2
      const span = clamp((d.span0 * d.dist0) / dist, MIN_SPAN, maxSpan)
      applyView({ start: d.centerI - ((cx - s.L.left) / s.L.plotW) * span, span })
      return
    }

    if (e.pointerType === 'mouse' || d.type === 'draw') setHover(pos)

    if (d.type === 'pan') {
      const span = viewRef.current.span
      applyView({ start: d.startStart - ((pos.x - d.startX) / s.L.plotW) * span, span })
    } else if (d.type === 'move') {
      const cur = toData(clampPos(pos))
      const di = cur.i - d.start.i
      const dv = cur.v - d.start.v
      setDrawings((list) =>
        list.map((x) =>
          x.id === d.id
            ? {
                ...x,
                p1: { i: d.orig.p1.i + di, v: d.orig.p1.v + dv },
                p2: { i: d.orig.p2.i + di, v: d.orig.p2.v + dv },
              }
            : x,
        ),
      )
    } else if (d.type === 'handle') {
      const cur = toData(clampPos(pos))
      setDrawings((list) =>
        list.map((x) => {
          if (x.id !== d.id) return x
          const p1 = { ...x.p1 }
          const p2 = { ...x.p2 }
          if (d.part === 'p1') Object.assign(p1, cur)
          if (d.part === 'p2') Object.assign(p2, cur)
          if (d.part === 'p3') {
            p1.i = cur.i
            p2.v = cur.v
          }
          if (d.part === 'p4') {
            p2.i = cur.i
            p1.v = cur.v
          }
          return { ...x, p1, p2 }
        }),
      )
    } else if (d.type === 'draw') {
      const cur = toData(clampPos(pos))
      updateDraft((dr) =>
        dr ? (dr.type === 'hline' ? { ...dr, p1: { ...dr.p1, v: cur.v }, p2: { ...cur } } : { ...dr, p2: cur }) : dr,
      )
    }
  }

  const finishPointer = (e, cancelled) => {
    const s = scalesRef.current
    const d = dragRef.current
    ptrs.current.delete(e.pointerId)
    canvasRef.current?.releasePointerCapture?.(e.pointerId)

    if (d?.type === 'pinch') {
      if (ptrs.current.size < 2) dragRef.current = null
      return
    }

    if (d?.type === 'draw') {
      const dr = draftRef.current
      draftRef.current = null
      setDraft(null)
      if (dr && !cancelled && s) {
        const dx = s.xOf(dr.p2.i) - s.xOf(dr.p1.i)
        const dy = s.yOf(dr.p2.v) - s.yOf(dr.p1.v)
        const ok =
          dr.type === 'hline' ||
          (dr.type === 'line' && Math.hypot(dx, dy) > 8) ||
          (dr.type === 'rect' && Math.abs(dx) > 6 && Math.abs(dy) > 6)
        if (ok) {
          setDrawings((l) => [...l, dr])
          setSelectedId(dr.id)
          setTool('cursor')
        }
      }
    }
    dragRef.current = null
    if (e.pointerType !== 'mouse') setHover(null)
    setCursor('crosshair')
  }

  const onPointerLeave = (e) => {
    if (e.pointerType === 'mouse' && !dragRef.current) setHover(null)
  }

  /* колесо мыши: масштаб (Shift или горизонтальная прокрутка — сдвиг) */
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e) => {
      const s = scalesRef.current
      if (!s) return
      e.preventDefault()
      const v = viewRef.current
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const dx = e.deltaX || e.deltaY
        applyView({ start: v.start + (dx / s.L.plotW) * v.span, span: v.span })
        return
      }
      const factor = Math.exp(clamp(e.deltaY, -120, 120) * 0.0016)
      const span = clamp(v.span * factor, MIN_SPAN, maxSpan)
      const i = s.iOf(x)
      applyView({ start: i - ((x - s.L.left) / s.L.plotW) * span, span })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [applyView, maxSpan])

  const zoomBy = (factor) => {
    const s = scalesRef.current
    if (!s) return
    const v = viewRef.current
    const cx = s.L.left + s.L.plotW / 2
    const i = s.iOf(cx)
    const span = clamp(v.span * factor, MIN_SPAN, maxSpan)
    applyView({ start: i - span / 2, span })
  }
  const fitView = () => {
    setYMode('auto')
    applyView(defaultView(N, window.innerWidth))
  }

  /* ───────── действия ───────── */
  const deleteSelected = useCallback(() => {
    const id = selectedRef.current
    if (!id) return
    setDrawings((l) => l.filter((d) => d.id !== id))
    setSelectedId(null)
  }, [])
  const clearAll = () => {
    setDrawings([])
    setSelectedId(null)
  }
  const pickTool = (t) => {
    setTool(t)
    setSelectedId(null)
  }
  const pickColor = (c) => {
    setColor(c)
    if (selectedId) setDrawings((l) => l.map((d) => (d.id === selectedId ? { ...d, color: c } : d)))
  }

  useEffect(() => {
    const onKey = (e) => {
      if (/input|textarea|select/i.test(e.target?.tagName || '')) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRef.current) {
        e.preventDefault()
        deleteSelected()
      }
      if (e.key === 'Escape') {
        setTool('cursor')
        setSelectedId(null)
        draftRef.current = null
        setDraft(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleteSelected])

  /* ───────── легенда (OHLC) ───────── */
  const L = scales?.L
  const overPlot = hover && L && hover.x >= L.left && hover.x <= L.plotRight
  const idx = overPlot ? clamp(Math.round(scales.iOf(hover.x)), 0, N - 1) : N - 1
  const c = data[idx]
  const prev = data[idx - 1]
  const chg = c.c - (prev ? prev.c : c.o)
  const dirClass = chg >= 0 ? 'up' : 'down'

  const hints = {
    line: 'Зажмите и потяните, чтобы нарисовать линию',
    rect: 'Зажмите и потяните, чтобы нарисовать прямоугольник',
    hline: 'Коснитесь графика, чтобы поставить уровень',
  }
  const selectedObj = drawings.find((d) => d.id === selectedId)

  return (
    <div className="cc">
      <div className="cc-toolbar" role="toolbar" aria-label="Инструменты графика">
        <Btn active={tool === 'cursor'} title="Курсор: выбор и сдвиг" onClick={() => pickTool('cursor')}>
          <IconCursor />
        </Btn>
        <Btn active={tool === 'line'} title="Линия" onClick={() => pickTool('line')}>
          <IconLine />
        </Btn>
        <Btn active={tool === 'rect'} title="Прямоугольник" onClick={() => pickTool('rect')}>
          <IconRect />
        </Btn>
        <Btn active={tool === 'hline'} title="Горизонтальный уровень" onClick={() => pickTool('hline')}>
          <IconHLine />
        </Btn>
        <span className="tb-sep" />
        <div className="swatches" role="group" aria-label="Цвет рисунка">
          {SWATCHES.map((sw) => (
            <button
              key={sw}
              type="button"
              className={`sw${(selectedObj ? selectedObj.color : color) === sw ? ' on' : ''}`}
              style={{ '--sw': sw }}
              aria-label={`Цвет ${sw}`}
              onClick={() => pickColor(sw)}
            />
          ))}
        </div>
        <span className="tb-sep" />
        <Btn disabled={!selectedId} title="Удалить выбранное (Delete)" onClick={deleteSelected}>
          <IconTrash />
        </Btn>
        <Btn disabled={!drawings.length} title="Удалить все рисунки" onClick={clearAll}>
          <IconClear />
        </Btn>
      </div>

      <div className="cc-stage" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel}
          style={{
            width: '100%',
            height: '100%',
            touchAction: tool !== 'cursor' || selectedId ? 'none' : 'pan-y',
            cursor: 'crosshair',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => finishPointer(e, false)}
          onPointerCancel={(e) => finishPointer(e, true)}
          onPointerLeave={onPointerLeave}
        />

        <div className="cc-legend">
          <span className="lg-date">
            {dateLong.format(c.t)}
            {stepMs < DAY ? `, ${timeShort.format(c.t)}` : ''}
          </span>
          <span className="lg-item lg-ohl">
            Откр <b>{formatValue(c.o)}</b>
          </span>
          <span className="lg-item lg-ohl">
            Макс <b>{formatValue(c.h)}</b>
          </span>
          <span className="lg-item lg-ohl">
            Мин <b>{formatValue(c.l)}</b>
          </span>
          <span className="lg-item">
            Закр <b>{formatValue(c.c)}</b>
          </span>
          <span className={`lg-item lg-chg ${dirClass}`}>
            {fmtChange(chg)}
          </span>
        </div>

        <div className="cc-zoom" role="group" aria-label="Масштаб">
          <Btn title="Уменьшить" onClick={() => zoomBy(1.3)}>
            <IconMinus />
          </Btn>
          <Btn title="Приблизить" onClick={() => zoomBy(1 / 1.3)}>
            <IconPlus />
          </Btn>
          <Btn title="Вписать в экран" onClick={fitView}>
            <IconFit />
          </Btn>
          {scale100 && (
            <button
              type="button"
              className={`tb tb-text${yMode === 'full' ? ' on' : ''}`}
              title="Шкала 0–100%: показать путь до полной готовности"
              aria-pressed={yMode === 'full'}
              onClick={() => setYMode((m) => (m === 'auto' ? 'full' : 'auto'))}
            >
              0–100
            </button>
          )}
        </div>

        {tool !== 'cursor' && !draft && <div className="cc-hint">{hints[tool]}</div>}
        {selectedObj && !draft && <div className="cc-hint">Перетащите объект или его точки. Удалить — корзина или Delete</div>}
      </div>
    </div>
  )
}
