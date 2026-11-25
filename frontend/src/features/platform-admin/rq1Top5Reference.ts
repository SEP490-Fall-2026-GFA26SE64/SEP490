import * as XLSX from 'xlsx'
import { parseProfilesFromText, type Rq1CatalogStore, type Rq1ProfilePathwayResult } from './rq1BenchmarkEngine'
import { profileSnapshot } from './rq1InputValidation'

export async function readTop5Reference(
  file: ArrayBuffer,
  results: Rq1ProfilePathwayResult[],
  catalog: Rq1CatalogStore,
) {
  const workbook = XLSX.read(file, { type: 'array' })
  const sheet = workbook.Sheets['Golden Set 50']
  if (!sheet) return null

  // This workbook contains IDs and selections, so bind it to the published baseline fixture.
  const response = await fetch('/fixtures/rq1-samples/gold50-profiles.jsonl')
  if (!response.ok) throw new Error('Không tải được baseline chuẩn để kiểm tra Golden Set.')
  const baseline = new Map(parseProfilesFromText(await response.text(), catalog).map(p => [p.profileId, profileSnapshot(p)]))
  if (baseline.size !== 50 || results.length !== 50 ||
      new Set(results.map(r => r.profileId)).size !== 50 ||
      results.some(r => baseline.get(r.profileId) !== profileSnapshot(r.inputProfile))) {
    throw new Error('Hãy nộp đúng baseline mẫu 50 hồ sơ Golden Set ở Bước 1.')
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const picks = new Map<string, Set<string>>()
  const knownModules = new Set(catalog.modules.map(m => m.id))
  for (const row of rows) {
    const profile = String(row['Profile ID']).trim()
    const ids = String(row['Module ưu tiên (ID)'] ?? '').split('|').map(id => id.trim()).filter(Boolean)
    if (!baseline.has(profile) || picks.has(profile) || !ids.length || ids.length > 5 ||
        new Set(ids).size !== ids.length || ids.some(id => !knownModules.has(id))) {
      throw new Error(`Hồ sơ ${profile}: mã hồ sơ hoặc danh sách module ưu tiên không hợp lệ.`)
    }
    picks.set(profile, new Set(ids))
  }
  if (picks.size !== 50) throw new Error('Sheet Golden Set 50 phải có đúng 50 hồ sơ đã chọn module.')

  const score = (method: 'g0Top5' | 'c0Top5') => {
    const counts = results.map(r => r[method].filter(item => picks.get(r.profileId)?.has(item.moduleId)).length)
    return {
      profilesWithMatch: counts.filter(n => n > 0).length,
      meanMatches: counts.reduce((a, b) => a + b, 0) / results.length,
    }
  }
  return { profiles: results.length, graph: score('g0Top5'), cbf: score('c0Top5') }
}
