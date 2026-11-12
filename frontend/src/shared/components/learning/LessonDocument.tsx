import { createElement, useId, useMemo, type ReactNode } from 'react'
import { Info, Lightbulb, TriangleAlert, Bookmark } from 'lucide-react'
import { LessonCodeBlock } from './LessonCodeBlock'

const allowedTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'sub', 'sup', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'hr', 'img', 'a', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'dl', 'dt', 'dd'])
const callouts = {
  NOTE: { icon: Info, en: 'Information', vi: 'Thông tin', style: 'info' },
  IMPORTANT: { icon: Bookmark, en: 'Important note', vi: 'Lưu ý quan trọng', style: 'important' },
  WARNING: { icon: TriangleAlert, en: 'Warning', vi: 'Cảnh báo', style: 'warning' },
  TIP: { icon: Lightbulb, en: 'Best practice', vi: 'Thực hành tốt', style: 'tip' },
} as const

/** Enhances server-sanitized HTML, preserving the existing CommonMark/security boundary. */
export function LessonDocument({ html, vi }: { html: string; vi: boolean }) {
  const prefix = useId()
  const content = useMemo(() => {
    const document = new DOMParser().parseFromString(html, 'text/html')
    const sections = Array.from(document.body.querySelectorAll('h1, h2, h3'))
      .filter(element => element.textContent?.trim())
      .map((element, index) => {
        const id = `${prefix}-section-${index}`
        element.id = id
        return { id, text: element.textContent ?? '', nested: element.tagName === 'H3' }
      })
    function children(node: Node, path: string): ReactNode[] { return Array.from(node.childNodes, (child, index) => render(child, `${path}.${index}`)) }
    function render(node: Node, key: string): ReactNode {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent
      if (node.nodeType !== Node.ELEMENT_NODE) return null
      const element = node as HTMLElement
      const tag = element.tagName.toLowerCase()
      if (!allowedTags.has(tag)) return null
      if (tag === 'pre') {
        const code = element.querySelector('code')
        const language = code?.className.match(/(?:^|\s)language-([a-zA-Z0-9_+-]{1,40})(?:\s|$)/)?.[1]
        return <LessonCodeBlock key={key} code={(code ?? element).textContent ?? ''} language={language} vi={vi} />
      }
      if (tag === 'blockquote') {
        const first = element.firstElementChild
        // Only explicit CommonMark blockquote markers become typed callouts.
        const match = first?.firstChild?.nodeType === Node.TEXT_NODE ? first.firstChild.textContent?.match(/^\s*\[!(NOTE|IMPORTANT|WARNING|TIP)\](?:\s|$)/) : null
        if (match && first?.firstChild) {
          const kind = callouts[match[1] as keyof typeof callouts]
          const clone = element.cloneNode(true) as HTMLElement
          const text = clone.firstElementChild?.firstChild
          if (text) text.textContent = text.textContent?.replace(/^\s*\[!(NOTE|IMPORTANT|WARNING|TIP)\]\s*/, '') ?? ''
          const Icon = kind.icon
          return <aside key={key} className={`lesson-callout lesson-callout--${kind.style}`} aria-label={vi ? kind.vi : kind.en}><div className="lesson-callout-label"><Icon size={16} aria-hidden="true" />{vi ? kind.vi : kind.en}</div>{children(clone, key)}</aside>
        }
      }
      if (tag === 'table') return <div key={key} className="lesson-table-scroll" tabIndex={0} role="region" aria-label={vi ? 'Bảng nội dung — cuộn ngang nếu cần' : 'Content table — scroll horizontally if needed'}><table>{children(element, key)}</table></div>
      const props: Record<string, unknown> = { key }
      if (/^h[1-6]$/.test(tag) && element.id.startsWith(`${prefix}-section-`)) { props.id = element.id; props.tabIndex = -1 }
      if (tag === 'a') {
        const href = element.getAttribute('href') ?? ''
        if (/^(https?:\/\/|\/(?!\/)|#|mailto:)/i.test(href)) props.href = href
        props.rel = 'noopener noreferrer'
      }
      if (tag === 'img') {
        const src = element.getAttribute('src') ?? ''
        if (!/^\/api\/v1\/module-management\/assets\/[a-f0-9-]{36}$/i.test(src)) return null
        props.src = src; props.alt = element.getAttribute('alt') ?? ''; props.loading = 'lazy'
      }
      if (element.hasAttribute('title')) props.title = element.getAttribute('title')
      if (tag === 'ol' && /^-?\d+$/.test(element.getAttribute('start') ?? '')) props.start = Number(element.getAttribute('start'))
      for (const [attribute, property] of [['colspan', 'colSpan'], ['rowspan', 'rowSpan']]) {
        if (['td', 'th'].includes(tag) && /^\d{1,3}$/.test(element.getAttribute(attribute) ?? '')) props[property] = Number(element.getAttribute(attribute))
      }
      // The containing lesson owns H1; authored top-level sections start at H2.
      const semanticTag = tag === 'h1' ? 'h2' : tag
      return createElement(semanticTag, props, ...(['br', 'hr', 'img'].includes(tag) ? [] : children(element, key)))
    }
    return { body: children(document.body, 'lesson'), sections }
  }, [html, vi, prefix])
  return <div className="lesson-document-layout">
    <div className="lesson-document">{content.body}</div>
    {content.sections.length > 1 && <nav className="lesson-page-contents" aria-label={vi ? 'Trong bài này' : 'On this page'}>
      <p className="text-eyebrow font-bold uppercase tracking-wide text-muted-foreground">{vi ? 'Trong bài này' : 'On this page'}</p>
      <ul>{content.sections.map(section => <li key={section.id}><a className={section.nested ? 'lesson-contents-nested' : undefined} href={`#${section.id}`} onClick={event => {
        event.preventDefault()
        const target = document.getElementById(section.id)
        target?.scrollIntoView({ block: 'start', behavior: 'instant' })
        target?.focus({ preventScroll: true })
      }}>{section.text}</a></li>)}</ul>
    </nav>}
  </div>
}
