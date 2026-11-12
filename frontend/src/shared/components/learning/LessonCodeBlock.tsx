import { useEffect, useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import java from 'highlight.js/lib/languages/java'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import { Button } from '../ui/Button'

for (const [name, grammar] of Object.entries({ javascript, typescript, java, python, sql, bash, json, xml, css })) hljs.registerLanguage(name, grammar)
hljs.registerLanguage('cypher', api => ({
  name: 'Cypher', case_insensitive: true,
  keywords: { keyword: 'MATCH OPTIONAL WHERE RETURN WITH AS DISTINCT ORDER BY ASC DESC LIMIT SKIP UNWIND CALL YIELD UNION ALL CREATE MERGE SET REMOVE DELETE DETACH FOREACH IN IS NOT NULL AND OR XOR CASE WHEN THEN ELSE END EXISTS CONSTRAINT INDEX ON FOR REQUIRE UNIQUE', literal: 'true false null' },
  contains: [api.C_LINE_COMMENT_MODE, api.C_BLOCK_COMMENT_MODE, api.APOS_STRING_MODE, api.QUOTE_STRING_MODE, api.C_NUMBER_MODE, { className: 'variable', begin: /\$[a-zA-Z_][\w]*/ }, { className: 'symbol', begin: /:[a-zA-Z_][\w]*/ }],
}))
const aliases: Record<string, string> = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', sh: 'bash', shell: 'bash', html: 'xml', yml: 'plaintext', text: 'plaintext', txt: 'plaintext' }
const labels: Record<string, string> = { javascript: 'JavaScript', typescript: 'TypeScript', java: 'Java', python: 'Python', sql: 'SQL', bash: 'Shell', json: 'JSON', xml: 'HTML / XML', css: 'CSS', cypher: 'Cypher' }

export function LessonCodeBlock({ code, language, vi }: { code: string; language?: string; vi: boolean }) {
  const [copyResult, setCopyResult] = useState<{ code: string; status: 'idle' | 'busy' | 'done' | 'error' }>({ code, status: 'idle' })
  const copy = copyResult.code === code ? copyResult.status : 'idle'
  const setCopy = (status: 'idle' | 'busy' | 'done' | 'error') => setCopyResult({ code, status })
  const normalized = language?.toLowerCase() ?? ''
  const name = aliases[normalized] ?? normalized
  const supported = Boolean(name && hljs.getLanguage(name))
  // Unknown/unlabeled/very large blocks remain escaped readable text; never guess a language.
  const highlighted = useMemo(() => supported && code.length <= 100000 ? hljs.highlight(code, { language: name, ignoreIllegals: true }).value : null, [code, name, supported])
  useEffect(() => {
    if (copy !== 'done') return
    const timeout = window.setTimeout(() => setCopyResult({ code, status: 'idle' }), 2000)
    return () => window.clearTimeout(timeout)
  }, [copy, code])
  const label = labels[name] ?? language ?? (vi ? 'Mã nguồn' : 'Code')
  return <div className="lesson-code-block">
    <div className="lesson-code-toolbar"><span className="lesson-code-language">{label}</span>
      <Button variant="ghost" size="sm" disabled={copy === 'busy'} aria-label={`${vi ? 'Sao chép mã' : 'Copy code'}: ${label}`} onClick={async () => {
        setCopy('busy')
        try { await navigator.clipboard.writeText(code); setCopy('done') } catch { setCopy('error') }
      }}>{copy === 'done' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{copy === 'done' ? (vi ? 'Đã sao chép' : 'Copied') : (vi ? 'Sao chép' : 'Copy')}</Button>
    </div>
    <pre tabIndex={0} aria-label={`${label} ${vi ? '— mã nguồn' : 'code'}`}>{highlighted === null ? <code>{code}</code> : <code dangerouslySetInnerHTML={{ __html: highlighted }} />}</pre>
    {copy === 'done' && <span className="sr-only" role="status">{vi ? 'Đã sao chép mã nguồn.' : 'Code copied to clipboard.'}</span>}
    {copy === 'error' && <p className="lesson-code-feedback" role="alert">{vi ? 'Không thể sao chép tự động. Hãy chọn mã và sao chép thủ công.' : 'Could not copy automatically. Select the code and copy it manually.'}</p>}
  </div>
}
