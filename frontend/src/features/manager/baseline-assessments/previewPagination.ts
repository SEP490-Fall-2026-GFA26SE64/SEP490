import type { AdaptiveSample } from './adaptiveBaselineApi'

export interface PreviewPart { text: string; option: boolean }
export interface PreviewPage { question: number; start: number; end: number; parts: PreviewPart[] }

/** Measure the same text styles as the reader. Split by Unicode code points, retaining every character. */
export function paginatePreview(sample: AdaptiveSample[], measure: HTMLDivElement): PreviewPage[] {
  const pages: PreviewPage[] = []
  function fits(parts: PreviewPart[]) {
    measure.replaceChildren(...parts.map(part => {
      const paragraph = document.createElement('p')
      paragraph.className = 'assessment-preview-copy'
      paragraph.dataset.option = String(part.option)
      paragraph.textContent = part.text
      return paragraph
    }))
    return measure.scrollHeight <= measure.clientHeight
  }
  sample.forEach((item, question) => {
    let parts: PreviewPart[] = [], start = 0, offset = 0
    function flush() {
      if (!parts.length) return
      pages.push({ question, start, end: offset, parts })
      parts = []; start = offset
    }
    const blocks = [{ text: item.prompt, option: false },
      ...Object.entries(item.options).map(([key, text]) => ({ text: key + '. ' + text, option: true }))]
    for (const block of blocks) {
      let remaining = Array.from(block.text)
      while (remaining.length) {
        const candidate = { ...block, text: remaining.join('') }
        if (fits([...parts, candidate])) {
          parts.push(candidate); offset += remaining.length; break
        }
        // Keep a complete option/paragraph together whenever it fits a fresh page.
        if (parts.length && fits([candidate])) { flush(); continue }
        let low = 0, high = remaining.length
        while (low < high) {
          const middle = Math.ceil((low + high) / 2)
          if (fits([...parts, { ...block, text: remaining.slice(0, middle).join('') }])) low = middle
          else high = middle - 1
        }
        if (!low && parts.length) { flush(); continue }
        // Prefer a nearby word boundary; the next page retains the whitespace.
        let take = Math.max(1, low)
        for (let index = take - 1; index > Math.max(0, take - 40); index--) {
          if (/\s/.test(remaining[index])) { take = index + 1; break }
        }
        parts.push({ ...block, text: remaining.slice(0, take).join('') })
        offset += take; remaining = remaining.slice(take); flush()
      }
    }
    flush()
  })
  measure.replaceChildren()
  return pages
}
