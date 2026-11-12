import type { ReactNode } from 'react'
import { WorkspaceLayout } from './WorkspaceLayout'

/** Reuses the authenticated workspace navbar without global feature navigation. */
export function LearnerLessonLayout({ children }: { children: ReactNode }) {
  return <WorkspaceLayout variant="lesson">{children}</WorkspaceLayout>
}
