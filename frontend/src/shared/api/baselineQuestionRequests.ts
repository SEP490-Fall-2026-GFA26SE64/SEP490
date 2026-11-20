import { adaptiveHttp } from '../../features/manager/baseline-assessments/adaptiveBaselineApi'
export const linkRequestedQuestion = (request: string, questionId: string) => adaptiveHttp(`/api/v1/baseline-question-requests/${encodeURIComponent(request)}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId }) }, r => r)
