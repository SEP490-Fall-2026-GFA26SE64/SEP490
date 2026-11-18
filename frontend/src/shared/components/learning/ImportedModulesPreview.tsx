import { useState } from 'react'
import type { ModuleDocument } from '../../api/moduleAuthoringApi'
import { useTranslation } from '../../i18n/LanguageContext'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { DialogBody, DialogFooter } from '../ui/Dialog'
import { Heading } from '../typography/Heading'
import { LearningContentPreview } from './LearningContentPreview'

export function ImportedModulesPreview({ modules, onClose }: { modules: ModuleDocument[]; onClose?: () => void }) {
  const { language } = useTranslation(), vi = language === 'vi'
  const [selected, setSelected] = useState(modules[0]?.id ?? '')
  const current = modules.find(doc => doc.id === selected) ?? modules[0]
  const revision = current?.revisions.at(-1)
  const count = modules.reduce((sum, doc) => sum + (doc.revisions.at(-1)?.payload.content.lessons?.length ?? 0), 0)
  return <>
    <DialogBody className="space-y-4" aria-label={vi ? 'Module vừa nhập' : 'Imported modules'}>
      <Heading level={3} size="section">{vi ? `Import thành công · ${modules.length} module nháp` : `Import completed · ${modules.length} draft modules`}</Heading>
      <p role="status" className="text-body-sm text-muted-foreground">{vi ? 'Đã import. Các bản nháp cần được gửi duyệt.' : 'Imported. Submit the drafts for review.'}</p>
      {!current ? <p role="status">{vi ? 'Chưa tải được nội dung vừa nhập. Hãy mở lại module từ danh sách.' : 'Imported content is unavailable. Open the modules from the directory.'}</p> : <div className="grid min-w-0 gap-3 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-lg border border-border bg-background p-2">
          <label className="block lg:hidden"><span className="mb-2 block text-body-sm font-semibold">{vi ? 'Module vừa nhập' : 'Imported modules'}</span><select aria-label={vi ? 'Chọn module vừa nhập' : 'Select imported module'} className="h-10 w-full min-w-0 rounded border border-border bg-card px-2" value={current.id} onChange={event => setSelected(event.target.value)}>{modules.map((doc, index) => <option key={doc.id} value={doc.id}>{index + 1}. {doc.revisions.at(-1)?.payload.title}</option>)}</select></label>
          <nav className="hidden max-h-[65dvh] space-y-1 overflow-y-auto lg:block" aria-label={vi ? 'Module vừa nhập' : 'Imported modules'}>{modules.map((doc, index) => <Button key={doc.id} variant={doc.id === current.id ? 'secondary' : 'ghost'} className="h-auto min-h-12 w-full justify-start whitespace-normal p-3 text-left [&>span]:min-w-0 [&>span]:whitespace-normal" aria-current={doc.id === current.id ? 'step' : undefined} onClick={() => setSelected(doc.id)}><span className="block [overflow-wrap:anywhere]"><span className="block">{index + 1}. {doc.revisions.at(-1)?.payload.title}</span><Badge variant="outline" className="mt-1">{vi ? 'Bản nháp' : 'Draft'}</Badge></span></Button>)}</nav>
        </aside>
        <div className="min-w-0 space-y-3"><Heading level={4} size="card">{vi ? 'Xem như học viên' : 'View as learner'}</Heading>{revision && <LearningContentPreview key={`${current.id}:${revision.number}`} lessons={revision.payload.content.lessons ?? []} label={`${revision.payload.title} · ${vi ? 'Bản nháp' : 'Draft'} ${revision.number}`} />}</div>
      </div>}
    </DialogBody>
    <DialogFooter><p className="mr-auto text-caption text-muted-foreground">{modules.length} {vi ? 'module' : 'modules'} · {count} {vi ? 'bài học' : 'lessons'}</p>{onClose && <Button onClick={onClose}>{vi ? 'Về danh sách module' : 'Back to modules'}</Button>}</DialogFooter>
  </>
}
