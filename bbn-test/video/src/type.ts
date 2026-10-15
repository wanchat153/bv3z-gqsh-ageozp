// Global kinetic typography: the sung line, revealed word by word (Thai segmented with Intl.Segmenter).
// Parenthesised backing vocals render as red-pen annotations.
import { C, F, clamp, ease, el, seg } from './kit'
import type { LineCue, Theme, TypeLayout } from './types'

interface Char { span: HTMLSpanElement; at: number }
interface Word { span: HTMLSpanElement; at: number; pen: boolean; chars: Char[] }
interface Built { box: HTMLDivElement; words: Word[] }

const segmenter = new Intl.Segmenter('th', { granularity: 'word' })
const graphemes = new Intl.Segmenter('th', { granularity: 'grapheme' }) // Thai vowel/tone marks stay attached to their consonant
// smooth spring pop: 0 -> overshoots ~1.1 -> settles at 1 (deterministic, safe to seek backwards)
const spring = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 - Math.exp(-6.5 * k) * Math.cos(k * Math.PI * 1.9))
const CHAR_POP = 0.38 // seconds for one letter to pop in
// loanwords ICU's Thai dictionary splits mid-word (e.g. บอต -> บอ|ต...); kept whole
const KEEP = /(บอต|เอไอ|โทเคน|เฟิร์สต์|ไลน์|อีเมล|ออฟฟิศ|เบนซ์|สัมมนา|รับทราบ)/
const thaiWords = (s: string) => s.split(KEEP).flatMap((c, i) => (i % 2 ? [c] : [...segmenter.segment(c)].map(x => x.segment)))
const DEFAULT_COLOR: Record<Theme, string> = { dark: C.white, paper: C.paperInk, red: C.white }
const DEFAULT_ACCENT: Record<Theme, string> = { dark: C.accent, paper: C.red, red: C.red }

const POS: Record<TypeLayout['pos'], string> = {
  left: 'left:120px;top:50%;transform:translateY(-50%);text-align:left',
  center: 'left:50%;top:50%;transform:translate(-50%,-50%);text-align:center',
  top: 'left:120px;top:130px;text-align:left',
  bottom: 'left:120px;bottom:120px;text-align:left',
  right: 'right:120px;top:50%;transform:translateY(-50%);text-align:right',
}

export class Typo {
  private layer: HTMLDivElement
  private cache = new Map<string, Built>()
  private shown: Built | null = null

  constructor(overlay: HTMLElement) {
    this.layer = el('div', 'position:absolute;inset:0;z-index:5', overlay)
  }

  private build(line: LineCue, layout: TypeLayout): Built {
    const size = layout.size ?? 96
    const box = el('div', `position:absolute;${POS[layout.pos]};width:${layout.width ?? 1100}px;
      font:800 ${size}px/1.32 ${F.display};letter-spacing:-.01em;word-break:normal;line-break:auto`)
    // split "main (backing)" parts
    const parts = line.text.split(/(\([^)]*\))/).filter(Boolean)
    const pieces: { text: string; pen: boolean }[] = []
    for (const part of parts) {
      const pen = part.startsWith('(')
      for (const w of thaiWords(part)) if (w) pieces.push({ text: w, pen })
    }
    // glue brackets to their words so a lone "(" never wraps at a line end
    for (let j = pieces.length - 1; j >= 0; j--) {
      if (pieces[j].text === '(' && pieces[j + 1]) { pieces[j + 1].text = '(' + pieces[j + 1].text; pieces.splice(j, 1) }
      else if (pieces[j].text === ')' && j > 0) { pieces[j - 1].text += ')'; pieces.splice(j, 1) }
    }
    const words: Word[] = []
    const chunks = pieces.filter(p => p.text.trim()).map(p => (p.pen ? [p.text] : [...graphemes.segment(p.text)].map(x => x.segment)))
    const total = chunks.reduce((a, c) => a + c.length, 0) // one reveal slot per letter (a backing vocal counts as one)
    let u = 0, wi = 0
    const span = Math.max(0.6, (line.end - line.start) * 0.82)
    for (const p of pieces) {
      if (!p.text.trim()) { box.append(p.text); continue }
      const s = el('span', p.pen
        ? `display:inline-block;font:400 ${size * 0.62}px/1.3 ${F.pen};color:${C.red};transform-origin:50% 60%`
        : 'display:inline-block', box)
      const letters = chunks[wi++]
      const w: Word = { span: s, at: line.start + (u / total) * span, pen: p.pen, chars: [] }
      if (p.pen) { s.textContent = p.text; u++ }
      else for (const g of letters) {
        const c = el('span', 'display:inline-block;transform-origin:50% 80%;white-space:pre', s)
        c.textContent = g
        w.chars.push({ span: c, at: line.start + (u++ / total) * span })
      }
      words.push(w)
    }
    return { box, words }
  }

  update(t: number, line: LineCue | undefined, next: LineCue | undefined, layout: TypeLayout | false, theme: Theme) {
    const visible = layout && line && t >= line.start - 0.05 && t < Math.min(line.end + 0.35, next?.start ?? Infinity)
    if (!visible) { this.hide(); return }
    const key = `${line.id}|${JSON.stringify(layout)}`
    let b = this.cache.get(key)
    if (!b) { b = this.build(line, layout); this.cache.set(key, b) }
    if (this.shown !== b) { this.hide(); this.layer.appendChild(b.box); this.shown = b }

    const color = layout.color ?? DEFAULT_COLOR[theme], accent = layout.accent ?? DEFAULT_ACCENT[theme]
    const out = ease.in(seg(t, line.end + 0.1, line.end + 0.35))
    b.box.style.opacity = String(1 - out)
    b.words.forEach((w, i) => {
      const nextAt = b!.words[i + 1]?.at ?? line.end
      const active = t >= w.at && t < nextAt
      if (w.pen) {
        const k = seg(t, w.at, w.at + 0.16)
        w.span.style.opacity = String(clamp(k * 1.4))
        w.span.style.transform = `translateY(${(1 - ease.elastic(k)) * 26}px) scale(${0.86 + 0.14 * ease.elastic(k)}) rotate(-4deg)`
        return
      }
      for (const c of w.chars) {
        const k = seg(t, c.at, c.at + CHAR_POP)
        const pop = spring(k)
        c.span.style.opacity = String(clamp(k * 4))
        c.span.style.transform = `translateY(${(1 - pop) * 70}px) scale(${0.25 + 0.75 * pop})`
      }
      w.span.style.color = active ? accent : color
      w.span.style.textShadow = active && theme !== 'paper' ? `0 0 28px ${accent}66` : 'none'
    })
  }

  private hide() {
    this.shown?.box.remove()
    this.shown = null
  }
}
