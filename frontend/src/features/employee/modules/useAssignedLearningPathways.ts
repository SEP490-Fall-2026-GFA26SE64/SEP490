import { useEffect, useState } from 'react'
import {
  moduleRequest,
  type LearningView,
  type ManualPathway,
} from '../../../shared/api/moduleAuthoringApi'

export interface AssignedModule {
  id: string
  view: LearningView | null
  error: string | null
}
export interface AssignedPathway {
  pathway: ManualPathway
  modules: AssignedModule[]
}

export function useAssignedLearningPathways(selectedId = '') {
  const [items, setItems] = useState<AssignedPathway[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const abort = new AbortController()
    async function load() {
      const pathways = await moduleRequest<ManualPathway[]>(
        '/pathways',
        'GET',
        undefined,
        abort.signal,
      )
      const selected =
        pathways.find((pathway) => pathway.id === selectedId) ?? pathways[0]
      const ids = [...new Set(selected?.moduleIds ?? [])]
      const modules = new Map<string, AssignedModule>()
      // Load only the visible pathway; other assignments remain selectable without blocking it.
      let next = 0
      await Promise.all(
        Array.from({ length: Math.min(4, ids.length) }, async () => {
          while (next < ids.length && !abort.signal.aborted) {
            const id = ids[next++]
            try {
              const view = await moduleRequest<LearningView>(
                `/learning/${encodeURIComponent(id)}/view`,
                'GET',
                undefined,
                abort.signal,
              )
              modules.set(id, { id, view, error: null })
            } catch (e: unknown) {
              if (abort.signal.aborted) return
              modules.set(id, {
                id,
                view: null,
                error: e instanceof Error ? e.message : 'Cannot load module',
              })
            }
          }
        }),
      )
      if (!abort.signal.aborted)
        setItems(
          pathways.map((pathway) => ({
            pathway,
            modules:
              pathway.id === selected?.id
                ? pathway.moduleIds.map((id) => modules.get(id)!)
                : [],
          })),
        )
    }
    void load()
      .catch((e: unknown) => {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : 'Cannot load pathways')
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false)
      })
    return () => abort.abort()
  }, [attempt, selectedId])
  function refresh() {
    setLoading(true)
    setError('')
    setAttempt((a) => a + 1)
  }
  return { items, loading, error, refresh }
}

export function assignedModuleProgress(view: LearningView) {
  const lessons = view.revision.payload.content.lessons ?? []
  const completed = lessons.filter((lesson) =>
    view.progress.some((p) => p.lessonId === lesson.id && p.completedAt),
  ).length
  const started = view.progress.some(
    (p) =>
      p.completedAt ||
      p.reachedEnd ||
      p.positionSeconds > 0 ||
      p.watchedIntervals.length > 0,
  )
  return {
    total: lessons.length,
    completed,
    percent: lessons.length
      ? Math.round((completed / lessons.length) * 100)
      : 0,
    started,
  }
}
