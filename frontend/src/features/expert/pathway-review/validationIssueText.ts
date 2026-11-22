import type { RuleStep } from '../../../shared/api/requirementPathway'

/** Keep different validation failures distinguishable and give the next corrective action. */
export function validationIssueText(reason: string, step: RuleStep | undefined, vi: boolean) {
  const messages: Record<string, [string, string]> = {
    MODULE_OPTIONS_CHANGED: step?.options.length === 0
      ? ['No modules selected for this skill. Include a module from the list, then save.', 'Không còn module được chọn cho skill này. Thêm module từ danh sách rồi lưu.']
      : ['A selected module revision is no longer eligible. Refresh provision and replace the affected option.', 'Một phiên bản module đã chọn không còn đủ điều kiện. Làm mới nguồn học và thay lựa chọn đó.'],
    PROVISION_REQUIRES_EXPERT_ACTION: ['No suitable learning provision is included. Add an eligible module or configure the required certificate.', 'Chưa có nguồn học phù hợp. Thêm module đúng mức hoặc cấu hình chứng chỉ yêu cầu.'],
    PINNED_REQUIREMENT_SCOPE_CHANGED: ['The saved requirement differs from its original snapshot. Reload and inspect the requirement before saving.', 'Yêu cầu đã lưu khác bản gốc. Tải lại và kiểm tra yêu cầu trước khi lưu.'],
    CURRENT_REQUIREMENT_SCOPE_CHANGED: ['The catalog requirement changed. Refresh provision and review its Skill version and knowledge level.', 'Yêu cầu catalog đã đổi. Làm mới nguồn học, kiểm tra phiên bản Skill và mức kiến thức.'],
    CERTIFICATE_PROVISION_CHANGED: ['The certificate definition changed or is unavailable. Refresh provision and select the current definition.', 'Định nghĩa chứng chỉ đã đổi hoặc chưa khả dụng. Làm mới nguồn học và kiểm tra định nghĩa hiện tại.'],
    GENERATION_NOT_FINISHED: ['Wait for generation to finish, then reload this review.', 'Chờ tạo lộ trình hoàn tất rồi tải lại phần duyệt.'],
    REQUIRED_STEP_MISSING: ['A required node is missing. Reload the saved pathway and inspect its target requirements.', 'Thiếu node bắt buộc. Tải lại lộ trình đã lưu và kiểm tra yêu cầu mục tiêu.'],
    ASSESSED_SUPPLEMENT_SOURCE_REQUIRED: ['The supplementary requirement has no assessment source. Reload and check its originating result.', 'Yêu cầu bổ sung thiếu nguồn đánh giá. Tải lại và kiểm tra kết quả gốc.'],
    SUPPLEMENT_SOURCE_SCOPE_INVALID: ['The supplementary requirement references a different scope. Reload and inspect its originating requirement.', 'Yêu cầu bổ sung tham chiếu phạm vi khác. Tải lại và kiểm tra yêu cầu gốc.'],
    ASSESSED_SUPPLEMENT_SOURCE_INVALID: ['The assessment source could not be verified. Reload and inspect the originating result.', 'Chưa xác minh được nguồn đánh giá. Tải lại và kiểm tra kết quả gốc.'],
    OFFICIAL_COMPLETION_PROVENANCE_INVALID: ['Completion evidence could not be verified. Reload and inspect the approved evidence.', 'Chưa xác minh được minh chứng hoàn thành. Tải lại và kiểm tra minh chứng đã duyệt.'],
    SCOPED_BYPASS_REQUIRED: ['This bypass has no matching saved decision. Reload and check the scoped bypass history.', 'Bypass này thiếu quyết định đã lưu tương ứng. Tải lại và kiểm tra lịch sử Bypass đúng phạm vi.'],
  }
  return messages[reason]?.[vi ? 1 : 0] ?? (vi ? `Chưa xác minh được điều kiện (${reason}). Làm mới nguồn học và kiểm tra lại.` : `Could not verify condition (${reason}). Refresh provision and check again.`)
}
