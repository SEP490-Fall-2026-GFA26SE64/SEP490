import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { buildRq1ExpertTemplate } from './rq1ExpertInput'
import { testExpertRecords } from './__tests__/rq1TestFixtures'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  parseProfilesFromText,
  parseProfilesFromExcelBuffer,
  runStep1PathwayAndRanking,
  parseExpertEvaluationsFromText,
  parseExpertEvaluationsFromExcelBuffer,
  runStep2ExpertComparison,
  type Rq1CatalogStore,
} from './rq1BenchmarkEngine'

const REPO_ROOT = path.resolve(__dirname, '../../../..')
const CATALOG_DIR = path.join(REPO_ROOT, 'documents/research/data/rq1/application-developer-v0.1')
const PROFILES_DIR = path.join(REPO_ROOT, 'documents/research/data/rq1/profiles-v0.1')

function loadLocalCatalog(): Rq1CatalogStore {
  return {
    role: JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, 'role.json'), 'utf-8')),
    skills: JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, 'skills.json'), 'utf-8')),
    modules: JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, 'modules.json'), 'utf-8')),
    bindings: JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, 'teaching-bindings.json'), 'utf-8')),
    requirements: JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, 'requirements.json'), 'utf-8')),
    prerequisites: JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, 'prerequisites.json'), 'utf-8')),
  }
}

describe('RQ1 Benchmark Engine (Step 1 Pathway Generation & Step 2 Expert Comparison)', () => {
  const catalog = loadLocalCatalog()

  it('loads the built-in catalog with 20 skills, 72 modules, 58 requirements, and 31 prerequisites', () => {
    expect(catalog.skills).toHaveLength(20)
    expect(catalog.modules).toHaveLength(72)
    expect(catalog.bindings).toHaveLength(72)
    expect(catalog.requirements).toHaveLength(58)
    expect(catalog.prerequisites).toHaveLength(31)
  })

  it('parses all 50 Golden Set profiles from gold50-profiles.jsonl and derives exact learning needs & G0/C0 rankings', () => {
    const rawJsonl = fs.readFileSync(path.join(PROFILES_DIR, 'gold50-profiles.jsonl'), 'utf-8')
    const profiles = parseProfilesFromText(rawJsonl, catalog)
    expect(profiles).toHaveLength(50)

    const results = runStep1PathwayAndRanking(profiles, catalog)
    expect(results).toHaveLength(50)

    const first = results[0]
    expect(first.profileId).toBe('SYN-0DBAA5DE1F7F')
    expect(first.roleLevel).toBe('Junior')
    expect(first.needsLearningCount).toBe(1)
    expect(first.pathwaySteps).toHaveLength(1)
    expect(first.pathwaySteps[0].skillId).toBe('MS-FS04')
    expect(first.pathwaySteps[0].knowledgeLevel).toBe('FOUNDATION')
    expect(first.g0Top5).toHaveLength(5)
    expect(first.c0Top5).toHaveLength(5)
    expect(first.g0Top5[0].exactGraphMatch).toBe(true)
  })

  it('parses all 50 Golden Set profiles from Step-1 Excel (.xlsx) and produces identical gap counts to JSONL', () => {
    const rawJsonl = fs.readFileSync(path.join(PROFILES_DIR, 'gold50-profiles.jsonl'), 'utf-8')
    const jsonlProfiles = parseProfilesFromText(rawJsonl, catalog)

    const xlsxPath = path.join(REPO_ROOT, 'documents/research/RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx')
    const buf = fs.readFileSync(xlsxPath)
    const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    const excelProfiles = parseProfilesFromExcelBuffer(arrayBuffer, catalog)

    expect(excelProfiles).toHaveLength(50)
    for (let i = 0; i < 50; i++) {
      expect(excelProfiles[i].profileId).toBe(jsonlProfiles[i].profileId)
      expect(excelProfiles[i].gapCount).toBe(jsonlProfiles[i].gapCount)
    }
  })

  it('rejects legacy mapping-based expert files instead of reporting synthetic labels as expert results', () => {
    for (const name of ['RQ1_Input_2_50_Golden_Expert_Evaluation.xlsx', 'RQ1_Catalog_And_Profiles_v0.1.xlsx']) {
      const bytes = fs.readFileSync(path.join(REPO_ROOT, 'documents/research', name))
      expect(() => parseExpertEvaluationsFromExcelBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), catalog)).toThrow(/Expert_Evaluations/)
    }
  })

  const profiles = () => parseProfilesFromText(fs.readFileSync(path.join(PROFILES_DIR, 'gold50-profiles.jsonl'), 'utf8'), catalog)
  const results = () => runStep1PathwayAndRanking(profiles(), catalog)
  const compare = (rs = results(), records = testExpertRecords(rs)) => runStep2ExpertComparison(rs, parseExpertEvaluationsFromText(JSON.stringify(records), catalog))

  it('accepts a pretty-printed JSON profile but does not silently skip malformed records', () => {
    const p = profiles()[0]
    expect(parseProfilesFromText(JSON.stringify(p, null, 2), catalog)).toEqual([p])
    expect(() => parseProfilesFromText(JSON.stringify([p, {}]), catalog)).toThrow(/Profile ID/)
    expect(() => parseProfilesFromText(`${JSON.stringify(p)}\nnot-json`, catalog)).toThrow()
  })

  it('round-trips a blank template and a fully labeled Excel with the same baseline; blanks are never prefilled', () => {
    const rs = results()
    const wb = buildRq1ExpertTemplate(rs, catalog)
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.Expert_Evaluations, { defval: '' })
    expect(rows).toHaveLength(50)
    expect(rows.every(row => row['Grade 0 Module IDs'] === '' && row['Grade 2 Module IDs'] === '' && row['Evaluation Source'] === '')).toBe(true)
    const toBuffer = () => XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    expect(() => parseExpertEvaluationsFromExcelBuffer(toBuffer(), catalog)).toThrow(/chuyên gia độc lập/)
    const records = testExpertRecords(rs)
    rows.forEach((row, index) => {
      row['Evaluation Source'] = records[index].evaluationSource
      row['Grade 0 Module IDs'] = records[index].grade0ModuleIds.join(', ')
      row['Grade 2 Module IDs'] = records[index].grade2ModuleIds.join(', ')
    })
    wb.Sheets.Expert_Evaluations = XLSX.utils.json_to_sheet(rows)
    expect(runStep2ExpertComparison(rs, parseExpertEvaluationsFromExcelBuffer(toBuffer(), catalog))).toEqual(compare(rs, records))
  })

  it('does not score a single judgment as complete Recall/nDCG', () => {
    const rs = results(), records = testExpertRecords(rs)
    records[0].grade0ModuleIds = []
    expect(() => compare(rs, records)).toThrow(/Chưa đủ dữ liệu/)
  })

  it('requires the exact cohort and rejects duplicates, unknown modules, conflicting grades and demo labels', () => {
    const rs = results(), records = testExpertRecords(rs)
    expect(() => compare(rs, records.slice(1))).toThrow(/cùng tập Profile ID/)
    expect(() => compare(rs, [...records, records[0]])).toThrow(/trùng/)
    const missing = structuredClone(records); missing[0].grade0ModuleIds[0] = 'RQM-000000000000'
    expect(() => compare(rs, missing)).toThrow(/Chưa đủ dữ liệu/)
    const conflict = structuredClone(records); conflict[0].grade1ModuleIds = conflict[0].grade2ModuleIds
    expect(() => compare(rs, conflict)).toThrow(/mâu thuẫn/)
    const demo = structuredClone(records); demo[0].evaluationSource = 'SYNTHETIC'
    expect(() => compare(rs, demo)).toThrow(/chuyên gia độc lập/)
  })

  it('rejects changed baseline or catalog even when profile IDs match', () => {
    const rs = results(), records = testExpertRecords(rs)
    const baseline = records[0].inputProfile.baselineObservations
    const passed = baseline.find(b => b.outcome === 'PASSED')!
    const failed = baseline.find(b => b.outcome === 'FAILED')!
    passed.outcome = 'FAILED'; failed.outcome = 'PASSED'
    expect(() => compare(rs, records)).toThrow(/không khớp/)
    const stamp = testExpertRecords(rs); stamp[0].catalogStamp += '-changed'
    expect(() => compare(rs, stamp)).toThrow(/không khớp/)
  })

  it('rejects missing/invalid/duplicate baseline, unknown roles, duplicate profiles and stale evidence', () => {
    const p = profiles()[0]
    for (const invalid of [
      { ...p, baselineObservations: p.baselineObservations.slice(1) },
      { ...p, roleLevel: 'typo' },
      { ...p, catalogVersion: 'old' },
      { ...p, baselineObservations: [...p.baselineObservations, p.baselineObservations[0]] },
      { ...p, officialEvidence: p.officialEvidence.map(e => ({ ...e, skillVersion: 'old' })) },
      { ...p, baselineObservations: p.baselineObservations.map(b => ({ ...b, outcome: 'UNKNOWN' })) },
    ]) expect(() => parseProfilesFromText(JSON.stringify([invalid]), catalog)).toThrow()
    expect(() => parseProfilesFromText(JSON.stringify([p, p]), catalog)).toThrow(/trùng/)
  })

  it('does not match bindings from another skill version', () => {
    const incompatible = structuredClone(catalog)
    incompatible.bindings.forEach(binding => { binding.skillVersion = 'old' })
    const rs = runStep1PathwayAndRanking(profiles().slice(0, 1), incompatible)
    expect(rs[0].allGraphMatchedModules).toHaveLength(0)
    expect(rs[0].g0Top5.every(item => item.score === 0 && !item.exactGraphMatch)).toBe(true)
  })

  it('reports no-positive profiles explicitly rather than returning zero Recall or silently dropping them', () => {
    const rs = results(), records = testExpertRecords(rs)
    records[0].grade0ModuleIds.push(...records[0].grade2ModuleIds); records[0].grade2ModuleIds = []
    expect(() => compare(rs, records)).toThrow(/Recall không áp dụng/)
  })

  it('calculates hand-checked metrics and can report a CBF win', () => {
    const rs = results().slice(0, 1), r = rs[0], ids = r.candidateModuleIds
    r.g0Top5 = ids.slice(5, 10).map((moduleId, index) => ({ ...r.g0Top5[0], moduleId, rank: index + 1 }))
    r.c0Top5 = ids.slice(0, 5).map((moduleId, index) => ({ ...r.c0Top5[0], moduleId, rank: index + 1 }))
    const records = testExpertRecords(rs)
    records[0].grade2ModuleIds = ids.slice(0, 5); records[0].grade0ModuleIds = ids.slice(5)
    const summary = compare(rs, records)
    expect(summary.c0MeanHitRateAt5).toBe(1)
    expect(summary.c0MeanPrecisionAt5).toBe(1)
    expect(summary.c0MeanRecallAt5).toBe(1)
    expect(summary.c0MeanNdcgAt5).toBe(1)
    expect(summary.g0MeanHitRateAt5).toBe(0)
    expect(summary.cbfWins).toBe(1)
    r.g0Top5[0].moduleId = ids[0]
    const oneHit = compare(rs, records)
    expect(oneHit.g0MeanHitRateAt5).toBe(1)
    expect(oneHit.g0MeanPrecisionAt5).toBe(0.2)
    expect(oneHit.g0MeanRecallAt5).toBe(0.2)
  })

  it('uses linear graded gain with a hand-checked nDCG example', () => {
    const rs = results().slice(0, 1), r = rs[0], ids = r.candidateModuleIds
    r.g0Top5 = [ids[1], ids[0], ...ids.slice(2, 5)].map((moduleId, index) => ({ ...r.g0Top5[0], moduleId, rank: index + 1 }))
    const records = testExpertRecords(rs)
    records[0].grade1ModuleIds = [ids[1]]
    records[0].grade0ModuleIds = ids.slice(2)
    expect(compare(rs, records).g0MeanNdcgAt5).toBe(0.8597)
  })
})
