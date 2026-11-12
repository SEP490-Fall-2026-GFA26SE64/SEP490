import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Text } from '../typography/Text'
import { Button } from './Button'

type Copy = (en: string, vi: string) => string

export function FileDropzone({ busy, accept, label, onFile, copy }: {
  busy: boolean
  accept: string
  label: string
  onFile: (file: File) => void
  copy: Copy
}) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  return <div aria-busy={busy} onDragOver={event => {
    event.preventDefault()
    if (!busy) { event.dataTransfer.dropEffect = 'copy'; setDragging(true) }
  }} onDragLeave={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
  }} onDrop={event => {
    event.preventDefault(); setDragging(false)
    if (!busy && event.dataTransfer.files[0]) onFile(event.dataTransfer.files[0])
  }} className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors sm:p-8 ${dragging && !busy ? 'border-primary bg-secondary' : 'border-border bg-muted/30'}`}>
    <Upload className="mx-auto mb-3 size-6 text-muted-foreground" aria-hidden="true" />
    <Text className="font-medium">{copy('Drag and drop your file here', 'Kéo và thả file vào đây')}</Text>
    <Text variant="body-sm" className="mb-4 mt-1 text-muted-foreground">{copy('or select a file from your device', 'hoặc chọn file từ thiết bị')}</Text>
    <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-label={label} accept={accept} disabled={busy} onChange={event => {
      const file = event.target.files?.[0]
      if (!busy && file) onFile(file)
      event.target.value = ''
    }} />
    <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>{copy('Browse files', 'Chọn file từ thiết bị')}</Button>
  </div>
}
