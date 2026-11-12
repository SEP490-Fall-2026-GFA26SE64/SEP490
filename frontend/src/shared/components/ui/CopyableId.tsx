import { Copy } from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import { Button } from './Button'
export function CopyableId({ code, short = false, compact = false, vi, entity = 'ID' }: { code: string; short?: boolean; compact?: boolean; vi: boolean; entity?: string }) {
 const { toast } = useToast()
 const copy = (en: string, vn: string) => vi ? vn : en
 const copyCode = async () => {
  try { await navigator.clipboard.writeText(code); toast({ description: copy('Copied to clipboard!', 'Đã sao chép vào bộ nhớ tạm!'), variant: 'success', duration: 2500 }) }
  catch { toast({ description: copy('Unable to copy. Select the full ID and copy it manually.', 'Không thể sao chép. Hãy chọn mã đầy đủ và sao chép thủ công.'), variant: 'destructive', duration: 4000 }) }
 }
 return <div className="flex min-w-0 items-center gap-1"><span title={code} className={`${short || compact ? 'truncate text-xs' : 'break-all text-caption'} text-muted-foreground`}>{short && code.length > 18 ? code.slice(0, 9) + '…' + code.slice(-6) : code}</span><Button variant="ghost" size="icon" className="size-8 shrink-0" title={`${copy('Copy', 'Sao chép')} ${entity}`} aria-label={`${copy('Copy ID', 'Sao chép mã')} ${code}`} onClick={() => void copyCode()}><Copy className="size-3.5" aria-hidden="true" /></Button></div>
}
