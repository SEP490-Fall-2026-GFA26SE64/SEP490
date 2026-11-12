import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react'

/** Question fields grow to their CSS cap, then keep all text available by scrolling. */
export function QuestionTextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const fit = () => {
      node.style.height = 'auto'
      const border = node.offsetHeight - node.clientHeight
      const cap = Number.parseFloat(getComputedStyle(node).maxHeight)
      node.style.height = `${Math.min(node.scrollHeight + border, Number.isFinite(cap) ? cap : Infinity)}px`
    }
    fit()
    let width = node.getBoundingClientRect().width
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      const next = node.getBoundingClientRect().width
      if (next !== width) { width = next; fit() }
    })
    observer?.observe(node)
    window.addEventListener('resize', fit)
    return () => { observer?.disconnect(); window.removeEventListener('resize', fit) }
  }, [props.value])
  return <textarea {...props} ref={ref} wrap="soft" className={`min-w-0 max-w-full resize-none overflow-x-hidden overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere] leading-relaxed focus-visible:ring-inset ${props.className ?? ''}`} />
}
