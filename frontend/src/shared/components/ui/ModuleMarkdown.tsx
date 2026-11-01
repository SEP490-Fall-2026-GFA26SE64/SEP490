import { useState } from 'react'
import { Heading } from '../typography/Heading'

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
      if (line.startsWith('# ')) return <Heading key={index} level={2}>{line.slice(2)}</Heading>
      if (line.startsWith('## ')) return <Heading key={index} level={3}>{line.slice(3)}</Heading>
      return line ? <p className="whitespace-pre-wrap leading-relaxed" key={index}>{line}</p> : null
    }))}
  </div>
}
