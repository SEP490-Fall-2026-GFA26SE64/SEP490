// Reruns RQ1 headlessly with the same TypeScript engine used by /platform-admin/rq1-benchmark.
// Inputs: RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx (profiles + baseline) and
// RQ1_Golden_Set_50_Dong_Thuan.xlsx (consensus priority shortlist). Writes results/rq1/<runId>/.
// Usage (from the repository root): node documents/research/tools/run_rq1_shortlist_agreement.mjs [runId]
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const frontend = join(repo, 'frontend')
const research = join(repo, 'documents/research')
const runId = process.argv[2] ?? '20261125-rerun'
const SEED = 20261125
const RESAMPLES = 10000

const require = createRequire(join(frontend, 'package.json'))
const { createServer } = await import(pathToFileURL(require.resolve('vite')))

// The engine fetches catalog fixtures by URL; serve them from frontend/public.
globalThis.fetch = async (url) => {
  const path = join(frontend, 'public', String(url).replace(/^\//, ''))
  const body = readFileSync(path)
  return { ok: true, status: 200, json: async () => JSON.parse(body.toString('utf8')), text: async () => body.toString('utf8') }
}

const server = await createServer({ root: frontend, configFile: false, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' })
try {
  const engine = await server.ssrLoadModule('/src/features/platform-admin/rq1BenchmarkEngine.ts')
  const reference = await server.ssrLoadModule('/src/features/platform-admin/rq1Top5Reference.ts')
  const XLSX = await server.ssrLoadModule('xlsx')

  const inputFile = join(research, 'RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx')
  const shortlistFile = join(research, 'RQ1_Golden_Set_50_Dong_Thuan.xlsx')
  const toArrayBuffer = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)

  const catalog = await engine.fetchBuiltInRq1Catalog()
  const profiles = engine.parseProfilesFromExcelBuffer(toArrayBuffer(readFileSync(inputFile)), catalog)
  const results = engine.runStep1PathwayAndRanking(profiles, catalog)

  // Engine's own summary (validates the shortlist against the published baseline and scores exact IDs).
  const engineSummary = await reference.readTop5Reference(toArrayBuffer(readFileSync(shortlistFile)), results, catalog)
  if (!engineSummary) throw new Error('Sheet "Golden Set 50" not found')

  const workbook = XLSX.read(readFileSync(shortlistFile), { type: 'buffer' })
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Golden Set 50'], { defval: '' })
  const shortlist = new Map(rows.map((row) => [String(row['Profile ID']).trim(),
    String(row['Module ưu tiên (ID)']).split('|').map((id) => id.trim()).filter(Boolean)]))

  const perProfile = results.map((r) => {
    const picks = new Set(shortlist.get(r.profileId))
    const g0 = r.g0Top5.map((i) => i.moduleId)
    const c0 = r.c0Top5.map((i) => i.moduleId)
    const g0Matches = g0.filter((id) => picks.has(id)).length
    const c0Matches = c0.filter((id) => picks.has(id)).length
    return {
      profileId: r.profileId,
      roleLevel: r.inputProfile.roleLevel,
      gapCount: r.inputProfile.learningNeeds.length,
      shortlist: [...picks],
      g0Top5: g0,
      c0Top5: c0,
      g0ExactGraphMatches: r.g0Top5.filter((i) => i.exactGraphMatch).length,
      g0Matches, c0Matches,
      g0Hit: g0Matches > 0 ? 1 : 0,
      c0Hit: c0Matches > 0 ? 1 : 0,
      // Shortlist-based precision/recall: the shortlist is a consensus subset, not the full relevant set.
      g0PrecisionAt5: g0Matches / 5, c0PrecisionAt5: c0Matches / 5,
      g0ShortlistRecall: g0Matches / picks.size, c0ShortlistRecall: c0Matches / picks.size,
    }
  })

  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
  const round = (x, d = 4) => Math.round(x * 10 ** d) / 10 ** d
  // Seeded Mulberry32 for a reproducible paired percentile bootstrap over profiles.
  const rng = (() => { let a = SEED >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } })()
  const bootstrap = (diffs) => {
    const n = diffs.length
    const means = Array.from({ length: RESAMPLES }, () => { let s = 0; for (let i = 0; i < n; i++) s += diffs[Math.floor(rng() * n)]; return s / n }).sort((a, b) => a - b)
    return { mean: round(mean(diffs)), ci95Low: round(means[Math.floor(0.025 * (RESAMPLES - 1))]), ci95High: round(means[Math.ceil(0.975 * (RESAMPLES - 1))]) }
  }
  const metric = (rowsSubset) => ({
    profiles: rowsSubset.length,
    g0Hits: rowsSubset.reduce((a, p) => a + p.g0Hit, 0),
    c0Hits: rowsSubset.reduce((a, p) => a + p.c0Hit, 0),
    g0HitRateAt5: round(mean(rowsSubset.map((p) => p.g0Hit))),
    c0HitRateAt5: round(mean(rowsSubset.map((p) => p.c0Hit))),
    g0MeanMatches: round(mean(rowsSubset.map((p) => p.g0Matches))),
    c0MeanMatches: round(mean(rowsSubset.map((p) => p.c0Matches))),
    g0PrecisionAt5: round(mean(rowsSubset.map((p) => p.g0PrecisionAt5))),
    c0PrecisionAt5: round(mean(rowsSubset.map((p) => p.c0PrecisionAt5))),
    g0ShortlistRecall: round(mean(rowsSubset.map((p) => p.g0ShortlistRecall))),
    c0ShortlistRecall: round(mean(rowsSubset.map((p) => p.c0ShortlistRecall))),
  })
  const overall = metric(perProfile)
  const report = {
    runId,
    method: 'Exact-module-ID agreement of G0/C0 top-5 with the consensus priority shortlist (two reviewer submissions)',
    seedForBootstrap: SEED,
    bootstrapResamples: RESAMPLES,
    engineSummary,
    overall,
    pairedDifferenceG0minusC0: {
      hitRateAt5: bootstrap(perProfile.map((p) => p.g0Hit - p.c0Hit)),
      meanMatches: bootstrap(perProfile.map((p) => p.g0Matches - p.c0Matches)),
      shortlistRecall: bootstrap(perProfile.map((p) => p.g0ShortlistRecall - p.c0ShortlistRecall)),
    },
    winsTiesLossesOnMatches: {
      g0Better: perProfile.filter((p) => p.g0Matches > p.c0Matches).length,
      tie: perProfile.filter((p) => p.g0Matches === p.c0Matches).length,
      c0Better: perProfile.filter((p) => p.g0Matches < p.c0Matches).length,
    },
    byRoleLevel: Object.fromEntries(['Junior', 'Middle', 'Senior'].map((l) => [l, metric(perProfile.filter((p) => p.roleLevel === l))])),
    profilesWithFewerThan5ExactGraphCandidates: perProfile.filter((p) => p.g0ExactGraphMatches < 5).length,
    perProfile,
  }

  const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
  const hashed = [
    'documents/research/RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx',
    'documents/research/RQ1_Golden_Set_50_Dong_Thuan.xlsx',
    ...['modules', 'prerequisites', 'requirements', 'role', 'skills', 'teaching-bindings'].map((f) => `frontend/public/fixtures/rq1-catalog/${f}.json`),
    'frontend/public/fixtures/rq1-samples/gold50-profiles.jsonl',
    'frontend/src/features/platform-admin/rq1BenchmarkEngine.ts',
    'frontend/src/features/platform-admin/rq1Top5Reference.ts',
    'frontend/src/features/platform-admin/rq1InputValidation.ts',
    'documents/research/tools/run_rq1_shortlist_agreement.mjs',
  ]
  let commit = 'unknown'
  try { commit = execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD']).toString().trim() } catch { /* not a git checkout */ }
  const manifest = {
    runId, generatedAt: new Date().toISOString(), gitCommit: commit, node: process.version,
    catalogStamp: results[0]?.catalogStamp ?? null,
    sha256: Object.fromEntries(hashed.map((f) => [f, sha(join(repo, f))])),
  }
  const out = join(research, 'results/rq1', runId)
  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  writeFileSync(join(out, 'run-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(JSON.stringify({ engineSummary, overall, paired: report.pairedDifferenceG0minusC0, wtl: report.winsTiesLossesOnMatches }, null, 1))
} finally {
  await server.close()
}
