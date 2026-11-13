import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import {
  uploadLearningFile,
  type LearningAsset,
} from '../../api/moduleAuthoringApi'
import { useEffect, useRef, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { ImagePlus, Link2, Bold, Italic, List, ListOrdered, Code2, Table2, MoreHorizontal } from 'lucide-react'
import { useTranslation } from '../../i18n/LanguageContext'
import '../../styles/learningReader.css'
import '../../styles/learningAuthoring.css'
export function RichLessonEditor({
  html,
  onChange,
  disabled = false,
  onBusyChange,
}: {
  html: string
  onChange: (value: string) => void
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
}) {
  const { language } = useTranslation()
  const vi = language === 'vi'
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!moreOpen) return
    const close = (event: PointerEvent) => { if (!toolbarRef.current?.contains(event.target as Node)) setMoreOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [moreOpen])
  const fileInput = useRef<HTMLInputElement>(null)
  const applyLink = useRef<HTMLButtonElement>(null)
  const linkSelection = useRef<{ from: number; to: number } | null>(null)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Image,
      TableKit,
    ],
    content: html,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': vi ? 'Nội dung bài đọc' : 'Reading content',
        class:
          'lesson-document min-h-80 rounded-b-md border border-border bg-card p-4 sm:p-6 outline-none',
      },
    },
  })
  useEffect(() => {
    onBusyChange?.(busy)
    return () => onBusyChange?.(false)
  }, [busy, onBusyChange])
  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [editor, disabled])
  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.schema && editor.getHTML() !== html) editor.commands.setContent(html, { emitUpdate: false })
  }, [editor, html])
  const formatting = useEditorState({ editor, selector: ({ editor: current }) => {
    if (!current || current.isDestroyed || !current.schema) return null
    return {
      textStyle: current.isActive("heading", { level: 2 }) ? "heading2" : current.isActive("heading", { level: 3 }) ? "heading3" : current.isActive("heading", { level: 1 }) ? "heading1" : "paragraph",
      bold: current.isActive("bold"), italic: current.isActive("italic"), bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"), codeBlock: current.isActive("codeBlock"), table: current.isActive("table"), link: current.isActive("link"),
    }
  } })
  const textStyle = formatting?.textStyle ?? "paragraph"
  if (!editor) return null
  const toolbar: { label: string; run: () => void }[] = [
    {
      label: vi ? 'Đậm' : 'Bold',
      run: () => {
        editor.chain().focus().toggleBold().run()
      },
    },
    {
      label: vi ? 'Nghiêng' : 'Italic',
      run: () => {
        editor.chain().focus().toggleItalic().run()
      },
    },
    {
      label: vi ? 'Danh sách' : 'List',
      run: () => {
        editor.chain().focus().toggleBulletList().run()
      },
    },
    {
      label: vi ? 'Đánh số' : 'Numbered',
      run: () => {
        editor.chain().focus().toggleOrderedList().run()
      },
    },
    {
      label: 'Code',
      run: () => {
        editor.chain().focus().toggleCodeBlock().run()
      },
    },
    {
      label: vi ? 'Bảng' : 'Table',
      run: () => {
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run()
      },
    },
  ]
  const icons = [Bold, Italic, List, ListOrdered, Code2, Table2]
  const active = [formatting?.bold, formatting?.italic, formatting?.bulletList, formatting?.orderedList, formatting?.codeBlock, formatting?.table]
  const toolButton = (item: typeof toolbar[number], index: number) => {
    const Icon = icons[index]
    return <Button key={item.label} size="icon" variant="ghost" className={`size-8 shrink-0 rounded ${active[index] ? "bg-secondary text-primary" : "text-muted-foreground"}`} aria-label={item.label} title={item.label} aria-pressed={!!active[index]} disabled={disabled} onClick={item.run}><Icon size={16} aria-hidden="true" /></Button>
  }
  return (
    <div className="min-w-0 space-y-2 p-1">
      <div
        ref={toolbarRef}
        className="relative flex flex-wrap items-center gap-1 rounded-t-md border border-border bg-card p-1.5"
        onKeyDown={event => { if (event.key === 'Escape' && moreOpen && !linkOpen) { event.preventDefault(); event.stopPropagation(); setMoreOpen(false) } }}
        role="toolbar"
        aria-label={vi ? 'Định dạng bài viết' : 'Text formatting'}
      >
        <select aria-label={vi ? 'Kiểu văn bản' : 'Text style'} className="h-8 max-w-28 shrink-0 rounded border-0 bg-transparent px-1.5 text-body-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-36" disabled={disabled} value={textStyle ?? 'paragraph'} onChange={event => {
          const value = event.target.value
          if (value === 'paragraph') editor.chain().focus().setParagraph().run()
          else editor.chain().focus().setHeading({ level: value === 'heading1' ? 1 : value === 'heading2' ? 2 : 3 }).run()
        }}><option value="paragraph">{vi ? 'Đoạn văn' : 'Paragraph'}</option><option value="heading1">{vi ? 'Tiêu đề cấp 1' : 'Heading 1'}</option><option value="heading2">{vi ? 'Tiêu đề mục' : 'Heading 2'}</option><option value="heading3">{vi ? 'Tiêu đề phụ' : 'Heading 3'}</option></select>
        <span className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
        {toolbar.slice(0, 2).map((item, index) => toolButton(item, index))}
        <span className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
        {toolButton(toolbar[2], 2)}
        <Button size="icon" variant="ghost" className="size-8 sm:hidden" aria-label={vi ? "Thêm công cụ" : "More formatting"} title={vi ? "Thêm công cụ" : "More formatting"} aria-expanded={moreOpen} disabled={disabled} onClick={() => setMoreOpen(!moreOpen)}><MoreHorizontal size={18} aria-hidden="true" /></Button>
        <div role="group" aria-label={vi ? "Công cụ bổ sung" : "Additional formatting"} className={`${moreOpen ? "flex" : "hidden"} absolute right-0 top-full z-30 mt-1 flex-wrap items-center gap-1 rounded-md border border-border bg-card p-2 shadow-md sm:static sm:mt-0 sm:flex sm:border-0 sm:p-0 sm:shadow-none`}>
          {toolbar.slice(3).map((item, index) => toolButton(item, index + 3))}
          <span className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
        <Popover.Root open={linkOpen} onOpenChange={open => {
          if (open) {
            linkSelection.current = { from: editor.state.selection.from, to: editor.state.selection.to }
            setLink(editor.getAttributes('link').href ?? '')
            setError('')
          }
          setLinkOpen(open)
        }}>
          <Popover.Trigger asChild><Button size="icon" variant="ghost" className={`size-8 ${formatting?.link ? 'bg-secondary text-primary' : 'text-muted-foreground'}`} disabled={disabled} aria-label={vi ? 'Chèn liên kết' : 'Insert link'} title={vi ? 'Chèn liên kết' : 'Insert link'} aria-pressed={!!formatting?.link}><Link2 size={16} aria-hidden="true" /></Button></Popover.Trigger>
          <Popover.Content sideOffset={8} collisionPadding={12} className="z-[100] w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-lg border border-border bg-card p-4 text-foreground shadow-lg" aria-label={vi ? 'Chèn liên kết' : 'Insert link'} onEscapeKeyDown={event => { event.preventDefault(); setLinkOpen(false) }} onCloseAutoFocus={event => { event.preventDefault(); editor.commands.focus() }}>
        <label className="block space-y-2 text-body-sm"><span>{vi ? 'Địa chỉ liên kết' : 'Link URL'}</span>
        <Input
          disabled={disabled}
          aria-label={vi ? 'Địa chỉ liên kết' : 'Link URL'}
          value={link}
          onChange={(event) => setLink(event.target.value)}
          placeholder="https://…"
          type="url"
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); applyLink.current?.click() } }}
        />
        </label>
        <Button
          ref={applyLink}
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => {
            let url: URL
            try { url = new URL(link.trim()); if (url.protocol !== 'https:') throw new Error() } catch {
              setError(
                vi
                  ? 'Nhập liên kết HTTPS hợp lệ.'
                  : 'Enter a valid HTTPS link.',
              )
              return
            }
            const chain = editor.chain().focus()
            if (linkSelection.current) chain.setTextSelection(linkSelection.current)
            if (linkSelection.current?.from === linkSelection.current?.to && !editor.isActive('link')) chain.insertContent({ type: 'text', text: url.href, marks: [{ type: 'link', attrs: { href: url.href } }] }).run()
            else chain.extendMarkRange('link').setLink({ href: url.href }).run()
            setLink('')
            setError('')
            setLinkOpen(false)
          }}
        >
          {vi ? 'Áp dụng' : 'Apply'}
        </Button>
        {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
          </Popover.Content>
        </Popover.Root>
        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground" disabled={disabled || busy} onClick={() => fileInput.current?.click()} aria-label={vi ? 'Chèn ảnh' : 'Insert image'} title={vi ? 'Chèn ảnh' : 'Insert image'}><ImagePlus size={16} aria-hidden="true" /></Button>
        </div>
          <Input
            ref={fileInput}
            className="hidden"
            aria-label={vi ? 'Thêm ảnh' : 'Add image'}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled || busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              setBusy(true)
              setError('')
              void uploadLearningFile<LearningAsset>('/assets', file)
                .then((asset) => {
                  editor
                    .chain()
                    .focus()
                    .setImage({
                      src: `/api/v1/module-management/assets/${asset.id}`,
                      alt: asset.filename,
                    })
                    .run()
                })
                .catch((err: unknown) =>
                  setError(
                    err instanceof Error ? err.message : 'Upload failed',
                  ),
                )
                .finally(() => setBusy(false))
              event.target.value = ''
            }}
          />
      </div>
      <div className="learner-reader learner-reading-body learning-authoring-editor"><EditorContent editor={editor} /></div>
      {busy && <p role="status">{vi ? 'Đang tải ảnh…' : 'Uploading image…'}</p>}
      {error && !linkOpen && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
