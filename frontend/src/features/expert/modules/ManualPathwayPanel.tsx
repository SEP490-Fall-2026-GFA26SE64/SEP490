import { useEffect, useRef, useState } from 'react'
import {
  moduleRequest,
  type CatalogChoice,
  type ManualPathway,
} from '../../../shared/api/moduleAuthoringApi'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { FormField } from '../../../shared/components/ui/FormField'
import { Heading } from '../../../shared/components/typography/Heading'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
export function ManualPathwayPanel() {
  const { language } = useTranslation()
  const vi = language === 'vi'
  const [employees, setEmployees] = useState<CatalogChoice[]>([])
  const [options, setOptions] = useState<CatalogChoice[]>([])
  const [employee, setEmployee] = useState('')
  const [title, setTitle] = useState('')
  const [modules, setModules] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  const lock = useRef(false)
  useEffect(() => {
    let active = true
    void Promise.all([
      moduleRequest<CatalogChoice[]>('/catalog/Employee'),
      moduleRequest<CatalogChoice[]>('/catalog/ReleasedModule'),
    ])
      .then(([people, released]) => {
        if (active) {
          setEmployees(people)
          setOptions(released)
        }
      })
      .catch((e: unknown) => {
        if (active)
          setError(
            e instanceof Error ? e.message : 'Cannot load pathway options',
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [attempt])
  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <Heading level={2} size="card">
          {vi ? 'Xác nhận lộ trình học' : 'Confirm a learning pathway'}
        </Heading>
        <p className="text-sm text-muted-foreground">
          {vi
            ? 'Chọn Employee và các module đã được duyệt để người học bắt đầu.'
            : 'Choose an Employee and approved modules so they can start learning.'}
        </p>
        {loading ? (
          <p role="status">{vi ? 'Đang tải lựa chọn…' : 'Loading choices…'}</p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (lock.current) return
              lock.current = true
              setBusy(true)
              setError('')
              setNotice('')
              void moduleRequest<ManualPathway>('/pathways', 'POST', {
                learnerId: employee,
                title,
                moduleIds: modules,
              })
                .then(() => {
                  setNotice(
                    vi
                      ? 'Đã xác nhận lộ trình. Employee có thể mở học.'
                      : 'Pathway confirmed. The Employee can now learn.',
                  )
                  setTitle('')
                  setModules([])
                })
                .catch((e: unknown) =>
                  setError(
                    e instanceof Error ? e.message : 'Cannot assign pathway',
                  ),
                )
                .finally(() => {
                  lock.current = false
                  setBusy(false)
                })
            }}
          >
            <FormField label={vi ? 'Employee' : 'Employee'}>
              <select
                required
                disabled={busy}
                className="h-10 w-full rounded border border-border bg-card px-3"
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
              >
                <option value="">
                  {vi ? 'Chọn người học' : 'Select learner'}
                </option>
                {employees.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={vi ? 'Tên lộ trình' : 'Pathway title'}>
              <Input
                required
                maxLength={240}
                disabled={busy}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FormField>
            <fieldset disabled={busy}>
              <legend className="mb-2 text-sm font-medium">
                {vi ? 'Module đã phát hành' : 'Released modules'}
              </legend>
              {!options.length && (
                <p>
                  {vi
                    ? 'Chưa có module đã phát hành. Hãy gửi module để L&D duyệt trước.'
                    : 'No released modules. Submit a module for L&D approval first.'}
                </p>
              )}
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {options.map((m) => (
                  <label key={m.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={modules.includes(m.id)}
                      onChange={(e) =>
                        setModules((old) =>
                          e.target.checked
                            ? [...old, m.id]
                            : old.filter((id) => id !== m.id),
                        )
                      }
                    />
                    <span className="break-words text-sm">{m.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Button type="submit" disabled={busy || !modules.length}>
              {vi ? 'Xác nhận và gán lộ trình' : 'Confirm and assign pathway'}
            </Button>
          </form>
        )}
        {notice && (
          <p role="status" className="text-success">
            {notice}
          </p>
        )}
        {error && (
          <div role="alert" className="text-destructive">
            <p>{error}</p>
            <Button
              variant="outline"
              onClick={() => {
                setLoading(true)
                setError('')
                setAttempt((a) => a + 1)
              }}
            >
              {vi ? 'Thử lại' : 'Retry'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
