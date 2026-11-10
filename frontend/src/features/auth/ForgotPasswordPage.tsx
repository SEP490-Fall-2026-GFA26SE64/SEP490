import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowLeft, Mail } from 'lucide-react'
import { WorkspaceAuthLayout } from '../../shared/layouts/WorkspaceAuthLayout'
import { Input } from '../../shared/components/ui/Input'
import { Button } from '../../shared/components/ui/Button'
import { requestForgotPassword } from '../subscription/subscriptionApi'
import { Failure, useCopy } from '../subscription/SubscriptionFeedback'

export function ForgotPasswordPage() {
  const c = useCopy()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      await requestForgotPassword(email.trim())
      setSubmitted(true)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err)
      } else {
        setError(new Error(c('Unable to request password reset. Please try again.', 'Không thể yêu cầu đặt lại mật khẩu. Vui lòng thử lại.')))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <WorkspaceAuthLayout
      title={c('Forgot your password?', 'Quên mật khẩu?')}
      description={c(
        'Enter your work email address and we will send you a secure link to reset your password.',
        'Nhập địa chỉ email công việc của bạn để nhận liên kết bảo mật đặt lại mật khẩu.',
      )}
    >
      {submitted ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-success font-medium">
            <CheckCircle2 size={20} aria-hidden="true" />
            <span>{c('Check your inbox', 'Kiểm tra hộp thư của bạn')}</span>
          </div>
          <p className="text-body-sm text-muted-foreground leading-relaxed">
            {c(
              `If an active account exists for ${email}, a password reset link has been sent. This link is valid for 15 minutes.`,
              `Nếu tài khoản tồn tại cho ${email}, liên kết đặt lại mật khẩu đã được gửi. Liên kết này có hiệu lực trong 15 phút.`,
            )}
          </p>
          <p className="text-caption text-muted-foreground">
            {c(
              'Did not receive the email? Check your spam folder or verify that you entered the correct address.',
              'Không nhận được email? Kiểm tra thư mục rác hoặc kiểm tra lại địa chỉ email đã nhập.',
            )}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSubmitted(false)
                setEmail('')
              }}
            >
              {c('Send another link', 'Gửi liên kết khác')}
            </Button>
            <Link
              to="/login"
              className="razor-submit-btn inline-flex items-center justify-center text-primary-foreground! w-full"
            >
              {c('Return to sign in', 'Quay lại đăng nhập')}
            </Link>
          </div>
        </div>
      ) : (
        <form noValidate className="razor-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="forgot-email">
            {c('Email', 'Email')}
          </label>
          <div className="razor-input-wrapper">
            <Input
              id="forgot-email"
              className="razor-input"
              autoComplete="email"
              type="email"
              required
              placeholder={c('Enter your work email', 'Nhập email công việc của bạn')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
            <span className="razor-input-circle-icon" aria-hidden="true">
              <Mail size={16} className="text-muted-foreground" />
            </span>
          </div>

          <Button
            type="submit"
            className="razor-submit-btn"
            isLoading={isSubmitting}
            disabled={!email.trim() || isSubmitting}
          >
            {c('Send reset link', 'Gửi liên kết đặt lại')}
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

          {error && <Failure error={error} />}
        </form>
      )}
    </WorkspaceAuthLayout>
  )
}

