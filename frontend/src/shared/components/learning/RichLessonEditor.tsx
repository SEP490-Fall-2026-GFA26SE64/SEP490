import { useEditor, EditorContent } from '@tiptap/react'
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
          'min-h-64 rounded-b-md border border-border bg-card p-4 outline-none [&_h1]:text-section [&_h2]:text-subsection [&_h3]:font-semibold [&_p]:my-2 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-6 [&_pre]:overflow-x-auto [&_pre]:bg-muted [&_pre]:p-3 [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_img]:max-w-full',
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
  if (!editor) return null
  const toolbar: { label: string; run: () => void }[] = [
    {
      label: vi ? 'Tiêu đề' : 'Heading',
      run: () => {
        editor.chain().focus().toggleHeading({ level: 2 }).run()
      },
    },
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
      <EditorContent editor={editor} />
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
