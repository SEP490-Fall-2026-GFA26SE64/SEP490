import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Button } from '../../../shared/components/ui/Button'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { AssessmentStatus, KnowledgeMapDetails, RecognitionStatus } from './KnowledgeMapDetails'
import type { KnowledgeNode } from './knowledgeMap'

export function KnowledgeHistoryPanel({ nodes, incomplete, unavailable }: { nodes: KnowledgeNode[]; incomplete: boolean; unavailable: boolean }) {
  const { t, language } = useTranslation(), copy = (en: string, vi: string) => language === 'vi' ? vi : en
  const [open,setOpen] = useState(false), [selected,setSelected] = useState<string | null>(null)
  const close=()=>{setOpen(false);setSelected(null)}
  return <>
    <Button variant="outline" size="sm" onClick={()=>{setSelected(null);setOpen(true)}} disabled={unavailable && nodes.length===0}>{copy('View history','Xem lịch sử')}</Button>
    <Dialog open={open} onOpenChange={value=>{if(value)setOpen(true);else close()}} size="wide" className="max-w-4xl" ariaLabel={copy('Skill history','Lịch sử kỹ năng')} closeLabel={copy('Close history','Đóng lịch sử')}>
      <DialogHeader><DialogTitle>{copy('Skill history','Lịch sử kỹ năng')}</DialogTitle><Text variant="body-sm">{copy('Assessment results and evidence across skills. These are not Role assignments.', 'Kết quả đánh giá và minh chứng của các kỹ năng. Đây không phải dữ liệu phân công vị trí.')}</Text></DialogHeader>
      <DialogBody className="space-y-4">
        {incomplete&&<Text variant="body-sm">{copy('More available. Close history and load more to include older evidence and results.', 'Còn nữa. Đóng lịch sử và tải thêm để xem minh chứng và kết quả cũ hơn.')}</Text>}
        {unavailable&&<Text variant="body-sm">{copy('History could not be refreshed. The items shown were loaded earlier.', 'Chưa tải lại được lịch sử. Các mục đang hiển thị đã được tải trước đó.')}</Text>}
        {nodes.length===0?<Text>{copy('No data','Trống')}</Text>:<div className="grid gap-3 sm:grid-cols-2">{nodes.map(node=>{
          const passed=node.latestAssessment?.passed===true&&!node.latestAssessment.vetoTriggered
          return <button type="button" key={node.key} className={`rounded-lg border border-border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${passed?'bg-success/10':'bg-background hover:border-primary/60'}`} aria-haspopup="dialog" onClick={()=>setSelected(node.key)}>
            <Text as="span" variant="caption" tone="primary" className="mb-2 flex items-center gap-2 font-semibold uppercase"><Lightbulb size={16} aria-hidden="true" />{copy('Skill','Kỹ năng')}</Text>
            <Text as="span" className="block break-words font-semibold">{node.skillName}</Text>
            <Text as="span" variant="caption" className="mt-1 block">{t('knowledgeLevel.'+node.knowledgeLevel)} · {copy('Version','Phiên bản')} {node.skillVersion}</Text>
            <span className="mt-3 flex flex-wrap gap-2"><RecognitionStatus recognized={node.evidence.length>0} incomplete={incomplete||unavailable} /><AssessmentStatus entry={node.latestAssessment} /></span>
          </button>
        })}</div>}
      </DialogBody>
      <DialogFooter><Button variant="outline" onClick={close}>{copy('Close','Đóng')}</Button></DialogFooter>
    </Dialog>
    <KnowledgeMapDetails node={open?nodes.find(n=>n.key===selected):undefined} incomplete={incomplete} unavailable={unavailable} onClose={()=>setSelected(null)} contextLabel={copy('Skill history','Lịch sử kỹ năng')} />
  </>
}
