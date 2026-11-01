import type { LearningLesson } from '../api/moduleAuthoringApi'

export function newLesson(type: 'TEXT' | 'VIDEO'): LearningLesson {
  return {
    id: crypto.randomUUID(),
    title: '',
    type,
    body: type === 'TEXT' ? '<p></p>' : null,
    bodyFormat: type === 'TEXT' ? 'HTML' : null,
    durationSeconds: 0,
    durationSource: 'ESTIMATED',
    videoSource: type === 'VIDEO' ? 'UPLOAD' : null,
    assetId: null,
    videoUrl: null,
  }
}
