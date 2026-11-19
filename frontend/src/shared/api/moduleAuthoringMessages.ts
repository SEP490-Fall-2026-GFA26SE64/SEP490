/** User-facing Vietnamese equivalents for Module Authoring & Import API errors. */
export function moduleAuthoringMessage(value: string, vi: boolean): string {
  const parts = value.split(' / ')
  if (parts.length === 2) return vi ? parts[1].trim() : parts[0].trim()
  if (!vi) return value

  const phrases: Record<string, string> = {
    'This exact file was already imported': 'File này đã được import trước đó',
    'Learning content is not configured': 'Chưa cấu hình hệ thống nội dung học tập',
    'Expert or L&D access required': 'Cần quyền Chuyên gia hoặc L&D để truy cập',
    'L&D approval required': 'Cần quyền phê duyệt của L&D',
    'Expert authoring access required': 'Cần quyền biên soạn của Chuyên gia',
    'Only the responsible Expert can manage this module': 'Chỉ Chuyên gia phụ trách mới có thể quản lý module này',
    'Module not found': 'Không tìm thấy module',
    'Invalid catalog': 'Danh mục không hợp lệ',
    'Select an active Expert account': 'Vui lòng chọn tài khoản Chuyên gia đang hoạt động',
    'Unknown jobPosition': 'Vị trí công việc không tồn tại',
    'An assigned jobPosition is required': 'Cần chọn vị trí công việc được phân công',
    'Cannot create membership outside assigned jobPositions': 'Không thể tạo module ngoài các vị trí công việc được phân công',
    'Invalid module code': 'Mã module không hợp lệ',
    'Select one skill and knowledge level': 'Vui lòng chọn kỹ năng và mức kiến thức',
    'Invalid skill identity': 'Mã kỹ năng không hợp lệ',
    'Select a knowledge level': 'Vui lòng chọn mức kiến thức',
    'Module identity changed; retry creation': 'Mã module đã thay đổi, vui lòng thử tạo lại',
    'Select exactly one skill': 'Vui lòng chọn đúng 1 kỹ năng',
    'Unknown skill': 'Kỹ năng không tồn tại hoặc không hợp lệ',
    'Module is not editable': 'Module hiện không ở trạng thái cho phép chỉnh sửa',
    'Select an active responsible Expert': 'Vui lòng chọn Chuyên gia phụ trách đang hoạt động',
    'Select an active Expert in this organization': 'Vui lòng chọn Chuyên gia đang hoạt động trong tổ chức này',
    'Module changed. Reload and review the latest revision': 'Module đã thay đổi. Vui lòng tải lại và kiểm tra phiên bản mới nhất',
    'Skill knowledge definition changed; revise the module': 'Định nghĩa kiến thức của kỹ năng đã thay đổi; vui lòng cập nhật lại module',
    'Catalog changed since intake; publication requires reconciliation': 'Danh mục đã thay đổi kể từ khi tiếp nhận; cần đối chiếu lại trước khi xuất bản',
    'Archive would remove a required skill provider': 'Không thể lưu trữ vì sẽ làm mất nguồn cung cấp kỹ năng bắt buộc',
    'Module is not archived': 'Module chưa ở trạng thái lưu trữ',
    'Unknown action': 'Thao tác không hợp lệ',
    'Action is not available in the current state': 'Không thể thực hiện thao tác này ở trạng thái hiện tại',
    'Referenced modules must be archived': 'Module đang được tham chiếu, chỉ có thể lưu trữ thay vì xoá',
    'Employee access required': 'Cần quyền Học viên để truy cập',
    'This module is not in your confirmed learning pathway': 'Module này không nằm trong lộ trình học đã xác nhận của bạn',
    'No available learning package': 'Chưa có gói nội dung học khả dụng',
    'Unable to approve module': 'Chưa thể duyệt module',
  }

  let result = value
  for (const [en, vn] of Object.entries(phrases).sort((a, b) => b[0].length - a[0].length)) {
    result = result.split(en).join(vn)
  }
  result = result.replace(
    /^Confirm importing a new revision of your module: (.+)$/,
    'Xác nhận nhập phiên bản mới cho module của bạn: $1'
  )
  result = result.replace(
    /^Module has an unresolved draft\/review or changed since preview: (.+)$/,
    'Module đang có bản nháp/chờ duyệt chưa xử lý hoặc đã thay đổi sau khi xem trước: $1'
  )
  result = result.replace(
    /^Module code already exists and is not available for this import: (.+)$/,
    'Mã module đã tồn tại và không thể ghi đè trong lần import này: $1'
  )
  return result
}
