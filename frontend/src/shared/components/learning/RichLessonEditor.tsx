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
import { useEffect, useState } from 'react'
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
  const textStyle = useEditorState({ editor, selector: ({ editor: current }) => !current || current.isDestroyed || !current.schema ? 'paragraph' : current.isActive('heading', { level: 2 }) ? 'heading2' : current?.isActive('heading', { level: 3 }) ? 'heading3' : current?.isActive('heading', { level: 1 }) ? 'heading1' : 'paragraph' })
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
  return (
    <div className="space-y-2">
      <div
        className="flex flex-wrap gap-1 rounded-t-md border border-border bg-muted p-2"
        role="toolbar"
        aria-label={vi ? 'Định dạng bài viết' : 'Text formatting'}
      >
        <select aria-label={vi ? 'Kiểu văn bản' : 'Text style'} className="min-h-9 max-w-full rounded-md border border-border bg-card px-3 text-body-sm" disabled={disabled} value={textStyle ?? 'paragraph'} onChange={event => {
          const value = event.target.value
          if (value === 'paragraph') editor.chain().focus().setParagraph().run()
          else editor.chain().focus().setHeading({ level: value === 'heading1' ? 1 : value === 'heading2' ? 2 : 3 }).run()
        }}><option value="paragraph">{vi ? 'Đoạn văn' : 'Paragraph'}</option><option value="heading1">{vi ? 'Tiêu đề cấp 1' : 'Heading 1'}</option><option value="heading2">{vi ? 'Tiêu đề mục' : 'Heading 2'}</option><option value="heading3">{vi ? 'Tiêu đề phụ' : 'Heading 3'}</option></select>
        {toolbar.map((item) => (
          <Button
            key={item.label}
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={item.run}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div className="learner-reader learner-reading-body learning-authoring-editor"><EditorContent editor={editor} /></div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          disabled={disabled}
          aria-label={vi ? 'Địa chỉ liên kết' : 'Link URL'}
          value={link}
          onChange={(event) => setLink(event.target.value)}
          placeholder="https://…"
          className="max-w-xs"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => {
            if (!/^https:\/\//i.test(link)) {
              setError(
                vi
                  ? 'Nhập liên kết HTTPS hợp lệ.'
                  : 'Enter a valid HTTPS link.',
              )
              return
            }
            editor
              .chain()
              .focus()
              .extendMarkRange('link')
              .setLink({ href: link })
              .run()
            setLink('')
            setError('')
          }}
        >
          {vi ? 'Gắn liên kết' : 'Add link'}
        </Button>
        <label className="text-sm">
          {vi ? 'Thêm ảnh' : 'Add image'}
          <Input
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
        </label>
      </div>
      {busy && <p role="status">{vi ? 'Đang tải ảnh…' : 'Uploading image…'}</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
