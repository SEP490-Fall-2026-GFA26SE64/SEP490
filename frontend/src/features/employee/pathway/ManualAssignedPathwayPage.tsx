import { useState } from 'react'
import { GitFork, ListOrdered } from 'lucide-react'
import { Button } from '../../../shared/components/ui/Button'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../shared/components/ui/Tabs'
import { FormField } from '../../../shared/components/ui/FormField'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { AssignedPathwayViews } from '../modules/AssignedLearningPathways'
import { useAssignedLearningPathways } from '../modules/useAssignedLearningPathways'

export function ManualAssignedPathwayPage() {
  const [activeTab, setActiveTab] = useState('roadmap')
  const [selectedId, setSelectedId] = useState('')
  const { language } = useTranslation()
  const vi = language === 'vi'
  const { items, loading, error, refresh } =
    useAssignedLearningPathways(selectedId)
  const selected =
    items.find((item) => item.pathway.id === selectedId) ?? items[0]
  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <PageHeader
            actions={
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                {selected && !loading && !error && (
                  <div className="min-w-0 max-w-full rounded-xl border border-border bg-card px-3 py-1.5 shadow-xs">
                    <FormField label={vi ? 'Lộ trình học' : 'Learning pathway'}>
                      <select
                        className="h-8 w-full max-w-72 truncate rounded bg-card text-body-sm font-semibold text-foreground focus-visible:outline-primary"
                        value={selected.pathway.id}
                        onChange={(event) => {
                          setSelectedId(event.target.value)
                          refresh()
                        }}
                      >
                        {items.map((item) => (
                          <option key={item.pathway.id} value={item.pathway.id}>
                            {item.pathway.title}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                )}
                <TabsList
                  className="h-auto w-full bg-muted/70 p-1 sm:w-auto"
                  aria-label={vi ? 'Chế độ xem lộ trình' : 'Pathway view'}
                >
                  <TabsTrigger
                    value="roadmap"
                    aria-pressed={activeTab === 'roadmap'}
                    aria-label={vi ? 'Sơ đồ học tập' : 'Interactive roadmap'}
                    className="min-w-0 flex-1 gap-1.5 px-2 font-semibold sm:flex-none sm:px-3"
                  >
                    <GitFork
                      size={15}
                      className="shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="sm:hidden">
                      {vi ? 'Sơ đồ' : 'Roadmap'}
                    </span>
                    <span className="hidden sm:inline">
                      {vi ? 'Sơ đồ học tập' : 'Interactive roadmap'}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="timeline"
                    aria-pressed={activeTab === 'timeline'}
                    aria-label={vi ? 'Tiến trình học tập' : 'Learning timeline'}
                    className="min-w-0 flex-1 gap-1.5 px-2 font-semibold sm:flex-none sm:px-3"
                  >
                    <ListOrdered
                      size={15}
                      className="shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="sm:hidden">
                      {vi ? 'Tiến trình' : 'Timeline'}
                    </span>
                    <span className="hidden sm:inline">
                      {vi ? 'Tiến trình học tập' : 'Adaptive timeline'}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>
            }
          />
          {loading ? (
            <div
              role="status"
              className="mt-4 h-48 animate-pulse rounded-xl border border-border bg-muted p-5"
            >
              {vi ? 'Đang tải lộ trình…' : 'Loading pathway…'}
            </div>
          ) : error ? (
            <div
              role="alert"
              className="mt-4 space-y-3 rounded-xl border border-border bg-card p-5"
            >
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={refresh}>
                {vi ? 'Thử lại' : 'Retry'}
              </Button>
            </div>
          ) : selected ? (
            <>
              <TabsContent value="roadmap" className="mt-4">
                <AssignedPathwayViews
                  items={[selected]}
                  mode="roadmap"
                  retry={refresh}
                />
              </TabsContent>
              <TabsContent value="timeline" className="mt-4">
                <AssignedPathwayViews
                  items={[selected]}
                  mode="timeline"
                  retry={refresh}
                />
              </TabsContent>
            </>
          ) : (
            <div data-testid="empty-pathway" />
          )}
        </Tabs>
      </div>
    </WorkspaceLayout>
  )
}
