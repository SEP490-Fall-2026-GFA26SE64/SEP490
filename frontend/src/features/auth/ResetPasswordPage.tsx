import { useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, ArrowLeft } from 'lucide-react'
import { WorkspaceAuthLayout } from '../../shared/layouts/WorkspaceAuthLayout'
import { Input } from '../../shared/components/ui/Input'
import { Button } from '../../shared/components/ui/Button'
import { resetPassword } from '../subscription/subscriptionApi'
import { Failure, useCopy } from '../subscription/SubscriptionFeedback'

export function ResetPasswordPage() {
  const c = useCopy()
  const location = useLocation()
  const token = useMemo(() => {
    const rawHash = location.hash || window.location.hash || ''
    const hash = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash
    const hashToken = new URLSearchParams(hash).get('token')
    if (hashToken) return hashToken
    const searchToken = new URLSearchParams(location.search).get('token')
    return searchToken || ''
  }, [location.hash, location.search])

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmation?: string }>({})
  const [apiError, setApiError] = useState<Error | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const errors: typeof fieldErrors = {}

    if ([...password].length < 12 || [...password].length > 128) {
      errors.password = c('Use 12–128 characters.', 'Sử dụng từ 12–128 ký tự.')
    }
    if (!confirmation || password !== confirmation) {
      errors.confirmation = c('Passwords do not match.', 'Mật khẩu không khớp.')
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    setApiError(null)

    try {
      await resetPassword(token, password)
      setSuccess(true)
      setPassword('')
      setConfirmation('')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setApiError(err)
      } else {
        setApiError(new Error(c('Unable to reset password. The link may be expired or invalid.', 'Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn hoặc không hợp lệ.')))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <WorkspaceAuthLayout
        title={c('Invalid Reset Link', 'Liên kết không hợp lệ')}
        description={c(
          'This password reset link is missing or malformed.',
          'Liên kết đặt lại mật khẩu này bị thiếu hoặc không đúng định dạng.',
        )}
      >
        <div className="space-y-4">
          <p className="text-body-sm text-muted-foreground">
            {c(
              'Please request a fresh reset link from the forgot password page.',
              'Vui lòng yêu cầu liên kết mới từ trang quên mật khẩu.',
            )}
          </p>
          <Link
            to="/forgot-password"
            className="razor-submit-btn inline-flex items-center justify-center text-primary-foreground! w-full"
          >
            {c('Request new reset link', 'Yêu cầu liên kết mới')}
          </Link>
          <div className="flex justify-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              <ArrowLeft size={14} />
              <span>{c('Back to sign in', 'Quay lại đăng nhập')}</span>
            </Link>
          </div>
        </div>
      </WorkspaceAuthLayout>
    )
  }

  return (
    <WorkspaceAuthLayout
      title={c('Reset your password', 'Đặt lại mật khẩu')}
      description={c(
        'Create a strong new password for your enterprise workspace account.',
        'Tạo mật khẩu mới an toàn cho tài khoản không gian làm việc doanh nghiệp của bạn.',
      )}
    >
      {success ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-success font-medium">
            <CheckCircle2 size={20} aria-hidden="true" />
            <span>{c('Password reset successfully.', 'Đặt lại mật khẩu thành công.')}</span>
          </div>
          <p className="text-body-sm text-muted-foreground leading-relaxed">
            {c(
              'Your password has been updated. All active sessions have been terminated for security. Please sign in with your new credentials.',
              'Mật khẩu của bạn đã được cập nhật. Tất cả phiên đăng nhập đã được chấm dứt để bảo mật. Vui lòng đăng nhập với thông tin mới.',
            )}
          </p>
          <Link
            to="/login"
            className="razor-submit-btn inline-flex items-center justify-center text-primary-foreground! w-full mt-4"
          >
            {c('Sign in with new password', 'Đăng nhập với mật khẩu mới')}
          </Link>
        </div>
      ) : (
        <form noValidate className="razor-form" onSubmit={handleSubmit}>
          {/* New Password */}
          <label className="block text-xs font-semibold text-foreground mb-1" htmlFor="reset-new-password">
            {c('New Password *', 'Mật khẩu mới *')}
          </label>
          <div className="razor-input-wrapper">
            <Input
              id="reset-new-password"
              className="razor-input"
              autoComplete="new-password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder={c('12–128 characters', '12–128 ký tự')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
            <Button
              variant="ghost"
              type="button"
              className="razor-hide-btn"
              aria-controls="reset-new-password"
              aria-label={showPassword ? c('Hide password', 'Ẩn mật khẩu') : c('Show password', 'Hiện mật khẩu')}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? c('Hide', 'Ẩn') : c('Show', 'Hiện')}
            </Button>
          </div>
          {fieldErrors.password && <p className="text-destructive text-xs mt-1">{fieldErrors.password}</p>}

          {/* Confirm Password */}
          <label className="block text-xs font-semibold text-foreground mb-1 mt-3" htmlFor="reset-confirm-password">
            {c('Confirm New Password *', 'Xác nhận mật khẩu mới *')}
          </label>
          <div className="razor-input-wrapper">
            <Input
              id="reset-confirm-password"
              className="razor-input"
              autoComplete="new-password"
              type={showConfirm ? 'text' : 'password'}
              required
              placeholder={c('Re-enter new password', 'Nhập lại mật khẩu mới')}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={isSubmitting}
            />
            <Button
              variant="ghost"
              type="button"
              className="razor-hide-btn"
              aria-controls="reset-confirm-password"
              aria-label={showConfirm ? c('Hide password', 'Ẩn mật khẩu') : c('Show password', 'Hiện mật khẩu')}
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? c('Hide', 'Ẩn') : c('Show', 'Hiện')}
            </Button>
          </div>
          {fieldErrors.confirmation && <p className="text-destructive text-xs mt-1">{fieldErrors.confirmation}</p>}

          {password && confirmation && (
            <p
              className={`text-xs mt-1.5 flex items-center gap-1 font-medium ${
                password === confirmation ? 'text-success' : 'text-destructive'
              }`}
            >
              {password === confirmation ? (
                <>
                  <CheckCircle2 size={13} /> {c('Passwords match', 'Mật khẩu khớp')}
                </>
              ) : (
                <>{c('Passwords do not match', 'Mật khẩu không khớp')}</>
              )}
            </p>
          )}

          <Button
            type="submit"
            className="razor-submit-btn mt-4"
            isLoading={isSubmitting}
            disabled={!password || !confirmation || isSubmitting}
          >
            {c('Reset password', 'Đặt lại mật khẩu')}
          </Button>

          <div className="flex justify-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              <ArrowLeft size={14} />
              <span>{c('Back to sign in', 'Quay lại đăng nhập')}</span>
            </Link>
          </div>

          {apiError && <Failure error={apiError} />}
        </form>
      )}
    </WorkspaceAuthLayout>
  )
}

