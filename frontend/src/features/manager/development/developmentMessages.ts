import { PathwayError } from '../../../shared/api/initialPathway'

type Copy = (en: string, vi: string) => string

export function developmentErrorMessage(error: unknown, copy: Copy) {
  const code = error instanceof PathwayError ? error.code : 'NETWORK_ERROR'
  const status = error instanceof PathwayError ? error.status : 0
  if (status === 401 || code === 'UNAUTHENTICATED') return copy('Your session has expired. Sign in again to continue.', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
  if (status === 403 || code === 'FORBIDDEN' || code === 'UNAUTHORIZED_WORKSPACE') return copy('Only an L&D Manager of this organization can view employee development.', 'Chỉ L&D Manager của tổ chức này mới xem được dữ liệu phát triển nhân viên.')
  if (status === 404 || code === 'EMPLOYEE_NOT_FOUND') return copy('This employee is not part of your organization or no longer has the Employee role.', 'Nhân viên này không thuộc tổ chức của bạn hoặc không còn vai trò Employee.')
  if (code === 'NETWORK_ERROR') return copy('The server could not be reached. Check your connection and retry.', 'Không kết nối được máy chủ. Kiểm tra kết nối và thử lại.')
  return copy('A data source is temporarily unavailable. Retry in a moment.', 'Một nguồn dữ liệu tạm thời không khả dụng. Vui lòng thử lại sau.')
}

/** Explains why a report section has no data instead of showing invented values. */
export function sectionMessage(code: string | null, copy: Copy) {
  switch (code) {
    case 'TARGET_NOT_SELECTED': return copy('The employee has not selected a target role yet, so there is nothing to compare against.', 'Nhân viên chưa chọn vị trí mục tiêu nên chưa có yêu cầu để đối chiếu.')
    case 'PATHWAY_NOT_STARTED': return copy('No learning pathway has been requested for the current target yet.', 'Chưa có lộ trình học cho mục tiêu hiện tại.')
    case 'LEVEL_REQUIRED': return copy('The selected target role has no level chosen yet.', 'Vị trí mục tiêu đã chọn chưa có cấp độ.')
    case 'ROLE_NOT_AVAILABLE': return copy('The selected target role is no longer available in the catalog.', 'Vị trí mục tiêu đã chọn không còn trong danh mục.')
    default: return copy('This section is temporarily unavailable', 'Phần này tạm thời không khả dụng') + (code ? ` (${code}).` : '.')
  }
}
