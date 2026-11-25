import * as XLSX from 'xlsx'
import type { Rq1CatalogStore, Rq1ExpertEvaluationRecord, Rq1ProfilePathwayResult } from './rq1BenchmarkEngine'
import { normalizeProfile, parseJsonRecords } from './rq1InputValidation'

function parseModuleIds(value: unknown): string[] {
  const ids = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,;\s]+/).filter(Boolean) : []
  if (ids.some(id => typeof id !== 'string' || !/^RQM-[A-F0-9]{12}$/i.test(id))) {
    throw new Error('Cột Grade chỉ chứa Module ID, phân tách bằng dấu phẩy; không nhập tên hoặc nhận xét.')
  }
  return ids.map(id => String(id).toUpperCase())
}

function parseRecords(rows: Record<string, unknown>[], catalog: Rq1CatalogStore): Map<string, Rq1ExpertEvaluationRecord> {
  const records = new Map<string, Rq1ExpertEvaluationRecord>()
  for (const row of rows) {
    const profileId = String(row.profileId ?? row['Profile ID'] ?? '').trim()
    if (!profileId.startsWith('SYN-')) throw new Error('Phiếu chuyên gia thiếu Profile ID hợp lệ.')
    if (records.has(profileId)) throw new Error(`${profileId}: Profile ID bị trùng trong phiếu chuyên gia.`)
    const rawSnapshot = row.inputProfile ?? row['Profile JSON Snapshot']
    if (!rawSnapshot) throw new Error(`${profileId}: File 2 phải chứa hồ sơ và baseline (Profile JSON Snapshot) từ File 1. Hãy tải mẫu mới sau Bước 1.`)
    const inputProfile = normalizeProfile(typeof rawSnapshot === 'string' ? JSON.parse(rawSnapshot) : rawSnapshot as Record<string, unknown>, catalog)
    if (inputProfile.profileId !== profileId) throw new Error('Profile ID không khớp snapshot của phiếu chuyên gia.')
    const source = String(row.evaluationSource ?? row['Evaluation Source'] ?? '')
    if (source !== 'HUMAN_EXPERT' && source !== 'SIMULATED_DEMO') throw new Error(`${profileId}: Chưa xác nhận nhãn từ chuyên gia độc lập (Evaluation Source = HUMAN_EXPERT); không dùng nhãn minh họa.`)
    const stamp = String(row.catalogStamp ?? row['Catalog Stamp'] ?? '')
    if (!stamp) throw new Error('Thiếu Catalog Stamp; hãy dùng mẫu Bước 2 mới.')
    // Only explicit expert fields are accepted. Catalog mappings are never labels.
    const hasGrades = ['grade0ModuleIds', 'grade1ModuleIds', 'grade2ModuleIds', 'Grade 0 Module IDs', 'Grade 1 Module IDs', 'Grade 2 Module IDs'].some(key => key in row)
    if (!hasGrades) throw new Error('Không có cột nhãn chuyên gia Grade 0/1/2.')
    records.set(profileId, {
      profileId, inputProfile, catalogStamp: stamp, evaluationSource: source,
      grade0ModuleIds: parseModuleIds(row.grade0ModuleIds ?? row['Grade 0 Module IDs']),
      grade1ModuleIds: parseModuleIds(row.grade1ModuleIds ?? row['Grade 1 Module IDs']),
      grade2ModuleIds: parseModuleIds(row.grade2ModuleIds ?? row['Grade 2 Module IDs']),
      reviewerNote: String(row.reviewerNote ?? row['Reviewer Note'] ?? ''),
    })
  }
  if (!records.size) throw new Error('File chuyên gia đang trống.')
  return records
}

export function parseExpertEvaluationsFromText(content: string, catalog: Rq1CatalogStore): Map<string, Rq1ExpertEvaluationRecord> {
  return parseRecords(parseJsonRecords(content), catalog)
}

export function parseExpertEvaluationsFromExcelBuffer(buffer: ArrayBuffer, catalog: Rq1CatalogStore): Map<string, Rq1ExpertEvaluationRecord> {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  const sheet = workbook.Sheets.Expert_Evaluations
  if (!sheet) throw new Error('Thiếu sheet Expert_Evaluations. File tổng quan catalog và mẫu cũ không phải phiếu chuyên gia; hãy tải mẫu Bước 2 mới.')
  return parseRecords(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }), catalog)
}

export function buildRq1ExpertTemplate(results: Rq1ProfilePathwayResult[], catalog: Rq1CatalogStore): XLSX.WorkBook {
  if (!results.length) throw new Error('Cần nạp File 1 trước khi tạo mẫu chuyên gia.')
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.json_to_sheet(results.map(result => ({
    'Profile ID': result.profileId,
    'Role Level': result.roleLevel,
    'Gap Count': result.gapCount,
    'Profile JSON Snapshot': JSON.stringify(result.inputProfile),
    'Catalog Stamp': result.catalogStamp,
    'Evaluation Source': '',
    'Grade 0 Module IDs': '',
    'Grade 1 Module IDs': '',
    'Grade 2 Module IDs': '',
    'Reviewer Note': '',
  })))
  sheet['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 35 }, { wch: 38 }, { wch: 20 }, { wch: 45 }, { wch: 45 }, { wch: 45 }, { wch: 45 }]
  sheet['!autofilter'] = { ref: sheet['!ref']! }
  XLSX.utils.book_append_sheet(workbook, sheet, 'Expert_Evaluations')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(catalog.modules.map(m => ({
    'Module ID': m.id, Title: m.title, Description: m.description, Level: m.knowledgeLevel, Outcomes: m.learningOutcomes.join('\n'),
  }))), 'Module_Reference')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Hướng dẫn / Instructions'],
    ['Đây là mẫu trống, chưa phải nhãn chuyên gia. Không dùng mapping hoặc gợi ý G0/C0 làm đáp án.'],
    ['Giữ nguyên Profile JSON Snapshot và Catalog Stamp. Snapshot chứa cùng hồ sơ và baseline đã nạp ở Bước 1.'],
    ['Chuyên gia đọc hồ sơ/baseline và Module_Reference; nhập mỗi Module ID vào đúng một cột Grade 0, 1 hoặc 2.'],
    ['Grade 0 = không phù hợp; Grade 1 = bổ trợ; Grade 2 = phù hợp trực tiếp. ID phân tách bằng dấu phẩy.'],
    ['Mỗi hồ sơ phải chấm đủ toàn bộ catalog. Module không liệt kê vẫn là chưa chấm, không tự trở thành Grade 0.'],
    ['Sau đánh giá độc lập, nhập HUMAN_EXPERT vào Evaluation Source. Đây là khai báo của người nộp, không phải xác thực danh tính.'],
    ['Hồ sơ không có Grade 2 cần được báo cáo riêng ngoài tập positive-query; hệ thống không tự bỏ qua hồ sơ này.'],
  ]), 'Instructions')
  return workbook
}

export function exportRq1ExpertTemplate(results: Rq1ProfilePathwayResult[], catalog: Rq1CatalogStore): void {
  XLSX.writeFile(buildRq1ExpertTemplate(results, catalog), 'RQ1_Expert_Evaluation_Blank.xlsx')
}
