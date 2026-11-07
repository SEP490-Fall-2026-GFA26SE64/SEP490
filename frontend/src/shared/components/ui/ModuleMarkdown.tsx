import { useState, type ReactNode } from 'react'
import { Heading } from '../typography/Heading'

function inline(source: string): ReactNode[] {
  return source.split(/(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https:\/\/[^\s)]+\))/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong className="font-semibold text-foreground" key={index}>{part.slice(2, -2)}</strong>
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/)
    if (link) {
      try {
        const url = new URL(link[2])
        if (url.protocol === 'https:' && !url.username && !url.password) return <a key={index} href={url.href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">{link[1]}</a>
      } catch { /* Invalid links remain escaped text. */ }
    }
    return part
  })
}

/** A deliberately small, safe Markdown view: no raw HTML or executable URL schemes. */
export function ModuleMarkdown({ markdown }: { markdown: string }) {
  const [failed, setFailed] = useState<string[]>([])
  return <div className="space-y-3 break-words text-[length:var(--text-body)] text-foreground">
    {markdown.split(/^```.*$/m).map((block, blockIndex) => blockIndex % 2
      ? <pre className="overflow-x-auto rounded bg-muted p-2 text-[length:var(--text-body-sm)]" key={blockIndex}><code>{block.replace(/^\n/, '')}</code></pre>
      : block.split('\n').map((line, lineIndex) => {
      const index = `${blockIndex}:${lineIndex}`
      const video = line.match(/^\[video\]\((https:\/\/[^\s)]+)\)$/i)
      if (video) return <div key={index} className="space-y-2"><video controls preload="none" className="max-h-96 w-full rounded-lg bg-muted" src={video[1]} onError={() => setFailed(values => values.includes(video[1]) ? values : [...values, video[1]])} />
        <a className="text-primary underline" href={video[1]} target="_blank" rel="noreferrer">{failed.includes(video[1]) ? 'Video unavailable — open source / Không phát được — mở nguồn' : 'Open video source / Mở nguồn video'}</a></div>
      if (line.startsWith('# ')) return <Heading key={index} level={2}>{inline(line.slice(2))}</Heading>
      if (line.startsWith('## ')) return <Heading key={index} level={3}>{inline(line.slice(3))}</Heading>
      return line ? <p className="whitespace-pre-wrap leading-relaxed" key={index}>{inline(line)}</p> : null
    }))}
  </div>
}
