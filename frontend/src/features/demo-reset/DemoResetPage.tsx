import { AlertTriangle, Building2, CheckCircle2, Database, FileX2, Network, RotateCcw, Users } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '../../shared/components/ui/Button'
import { Card, CardContent } from '../../shared/components/ui/Card'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { PageLoader } from '../../shared/components/ui/PageLoader'
import { StatCard } from '../../shared/components/ui/StatCard'
import { useCopy } from '../subscription/SubscriptionFeedback.helpers'
import { resetDemoData, type DemoResetResult } from './demoResetApi'

type State = { status: 'running' } | { status: 'done'; result: DemoResetResult } | { status: 'failed'; message: string }

/** Restores the configured isolated checkpoint, or the legacy seed in other environments. */
export function DemoResetPage() {
  const c = useCopy()
  const [state, setState] = useState<State>({ status: 'running' })
  const started = useRef(false)
  const commandKey = useRef(crypto.randomUUID())
  const checkpoint = import.meta.env.VITE_DEMO_CHECKPOINT_ENABLED === 'true'

  const run = useCallback(() => {
    setState({ status: 'running' })
    resetDemoData(commandKey.current)
      .then(result => setState({ status: 'done', result }))
      .catch((error: unknown) => setState({ status: 'failed', message: error instanceof Error ? error.message : String(error) }))
  }, [])

  useEffect(() => {
    // Guards against the StrictMode double effect so one visit triggers one reset.
    if (started.current) return
    started.current = true
    run()
  }, [run])

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <PageHeader
          forceShowTitle
          icon={<RotateCcw aria-hidden="true" />}
          title={c('Reset demo data', 'Đặt lại dữ liệu demo')}
          description={checkpoint ? c('Restores Brightpath to the end of step 8.7, after the baseline. Sign in and continue from step 8.8.', 'Khôi phục Brightpath cuối bước 8.7, sau baseline. Đăng nhập và tiếp tục từ bước 8.8.') : c(
            'Removes every organization, account, graph node and file created after the initial seed, so the demo can start again from onboarding.',
            'Xoá mọi tổ chức, tài khoản, nút đồ thị và tệp được tạo sau dữ liệu seed ban đầu để có thể chạy lại demo từ bước onboarding.',
          )}
        />

        {state.status === 'running' && (
          <Card><CardContent className="py-10">
            <PageLoader label={c('Resetting demo data…', 'Đang đặt lại dữ liệu demo…')} />
          </CardContent></Card>
        )}

        {state.status === 'failed' && (
          <Card className="border-destructive/40">
            <CardContent className="flex flex-col gap-4 py-6" role="alert">
              <div className="flex items-center gap-2 font-semibold text-destructive">
                <AlertTriangle size={20} aria-hidden="true" />
                <span>{c('The reset did not complete', 'Chưa đặt lại được dữ liệu')}</span>
              </div>
              <p className="text-body-sm text-muted-foreground">{state.message}</p>
              <div><Button onClick={run}>{c('Try again', 'Thử lại')}</Button></div>
            </CardContent>
          </Card>
        )}

        {state.status === 'done' && (
          <>
            <Card>
              <CardContent className="flex items-center gap-2 py-5 font-semibold text-success" role="status">
                <CheckCircle2 size={20} aria-hidden="true" />
                <span>{c('Demo data has been reset.', 'Đã đặt lại dữ liệu demo.')}</span>
              </CardContent>
            </Card>
            {state.result.warnings.length > 0 && (
              <Card className="border-warning/50">
                <CardContent className="flex flex-col gap-1 py-4 text-body-sm text-foreground" role="alert">
                  {state.result.warnings.map(warning => <p key={warning}>{warning}</p>)}
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard icon={<Building2 size={14} />} title={c('Organizations removed', 'Tổ chức đã xoá')} value={state.result.organizationsRemoved}
                description={c(`${state.result.organizationsRetained} seed organization kept`, `Giữ lại ${state.result.organizationsRetained} tổ chức seed`)} />
              <StatCard icon={<Users size={14} />} title={c('Accounts removed', 'Tài khoản đã xoá')} value={state.result.accountsRemoved} />
              <StatCard icon={<RotateCcw size={14} />} title={c('Registrations removed', 'Đăng ký đã xoá')} value={state.result.registrationsRemoved} />
              <StatCard icon={<Database size={14} />} title={c('Related records removed', 'Bản ghi liên quan đã xoá')} value={state.result.relatedRowsRemoved} />
              <StatCard icon={<Network size={14} />} title={c('Graph nodes removed', 'Nút đồ thị đã xoá')} value={state.result.graphNodesRemoved} />
              <StatCard icon={<FileX2 size={14} />} title={c('Files removed', 'Tệp đã xoá')} value={state.result.filesRemoved} />
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className={buttonVariants({ variant: 'primary' })} to={state.result.continueUrl ?? '/register'}>{state.result.checkpoint ? c('Sign in · continue step 8.8', 'Đăng nhập · tiếp tục bước 8.8') : c('Start onboarding', 'Bắt đầu onboarding')}</Link>
              <Link className={buttonVariants({ variant: 'outline' })} to="/">{c('Back to home', 'Về trang chủ')}</Link>
              <Button variant="ghost" onClick={() => { commandKey.current = crypto.randomUUID(); run() }}>{c('Reset again', 'Đặt lại lần nữa')}</Button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
