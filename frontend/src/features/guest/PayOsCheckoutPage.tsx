import * as React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { Heading } from '../../shared/components/typography/Heading'
import { Text } from '../../shared/components/typography/Text'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { useToast } from '../../shared/hooks/useToast'
import { logPlatformEvent } from '../platform-admin/platformAdminStore'
import { GuestLayout } from './GuestLayout'

const CHECKOUT_SELECTION_KEY = 'adaptlearn_selected_plan_checkout'

export function PayOsCheckoutPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [checkoutData] = React.useState<any>(() => {
    try {
      const raw = localStorage.getItem(CHECKOUT_SELECTION_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      // fallback
    }
    return {
      planId: 'plan-growth',
      tier: 'Growth',
      planName: 'Growth Tier',
      currency: 'USD',
      billingCycle: 'annual',
      seatLimit: 50,
      totalCharged: 4788,
      organizationName: 'Cognitive Dynamics Labs',
      subdomain: 'cognitive-dynamics',
      adminEmail: 'admin@cognitivedynamics.io',
      adminName: 'Elena Rostova',
    }
  })

  const [orderCode] = React.useState(() => `ORD-${Math.floor(100000 + Math.random() * 900000)}`)
  const [transferMemo] = React.useState(() => `ALG${Math.floor(100000 + Math.random() * 900000)}`)
  const [paymentStatus, setPaymentStatus] = React.useState<'PENDING' | 'SUCCESS' | 'FAILED'>('PENDING')
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [timeLeft, setTimeLeft] = React.useState(899) // 14:59

  // Countdown timer for pending payment
  React.useEffect(() => {
    if (paymentStatus !== 'PENDING') return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setPaymentStatus('FAILED')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [paymentStatus])

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to Clipboard',
      description: `${label}: ${text}`,
      variant: 'info',
    })
  }

  // Simulate instant successful PayOS webhook
  const handleSimulateSuccess = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setPaymentStatus('SUCCESS')

      // Record platform audit event for confirmed payment
      logPlatformEvent({
        organizationId: checkoutData.subdomain || 'org-new',
        organizationName: checkoutData.organizationName,
        actor: 'PayOS Webhook Service',
        action: 'PAYMENT_CONFIRMED',
        details: `Signature-verified PayOS payment confirmed for order ${orderCode}. Amount: ${
          checkoutData.currency === 'VND'
            ? `${checkoutData.totalCharged?.toLocaleString('vi-VN')} ₫`
            : `$${checkoutData.totalCharged}`
        }`,
        severity: 'success',
      })

      toast({
        title: 'Payment Confirmed by PayOS',
        description: 'Webhook signature verified. Initializing workspace provisioning.',
        variant: 'success',
      })

      setTimeout(() => {
        navigate('/guest/onboarding-status')
      }, 1200)
    }, 900)
  }

  // Simulate payment failure
  const handleSimulateFailure = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setPaymentStatus('FAILED')
      logPlatformEvent({
        organizationId: checkoutData.subdomain || 'org-new',
        organizationName: checkoutData.organizationName,
        actor: 'PayOS Gateway',
        action: 'PAYMENT_FAILED',
        details: `Payment attempt failed or timed out for order ${orderCode}.`,
        severity: 'error',
      })
      toast({
        title: 'Payment Not Detected',
        description: 'Unable to verify transaction. You can retry the payment checkout.',
        variant: 'destructive',
      })
    }, 700)
  }

  const handleRetryPayment = () => {
    setPaymentStatus('PENDING')
    setTimeLeft(899)
    toast({
      title: 'Payment Retried',
      description: 'Order reference regenerated. Please complete the QR payment.',
      variant: 'info',
    })
  }

  const formattedAmount =
    checkoutData.currency === 'VND'
      ? `${(checkoutData.totalCharged || 12250000).toLocaleString('vi-VN')} ₫`
      : `$${(checkoutData.totalCharged || 499).toLocaleString()}`

  return (
    <GuestLayout currentStep={3}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="primary" className="mx-auto mb-1">
            <CreditCard size={12} className="mr-1.5" /> Secure Checkout Integration
          </Badge>
          <Heading level={1} className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            PayOS Payment Checkout
          </Heading>
          <Text className="text-muted-foreground text-sm max-w-lg mx-auto">
            Scan the PayOS VietQR code or transfer to complete your workspace subscription. Real-time webhook will provision your database immediately.
          </Text>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: QR Code & PayOS Gateway (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="border-b border-border/70 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      payOS
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">VietQR Payment Transfer</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Order #{orderCode}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold bg-muted px-2.5 py-1 rounded-md text-foreground">
                    <Clock size={13} className="text-warning" />
                    <span>{formatTimer(timeLeft)}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-5">
                {paymentStatus === 'PENDING' && (
                  <>
                    {/* Simulated VietQR visual frame */}
                    <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-xl border border-dashed border-border">
                      <div className="p-3 bg-white rounded-lg shadow-xs border border-gray-200">
                        {/* Clean SVG QR mockup */}
                        <svg className="w-44 h-44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="100" height="100" fill="hsl(var(--card))" />
                          <rect x="10" y="10" width="25" height="25" fill="hsl(var(--foreground))" />
                          <rect x="14" y="14" width="17" height="17" fill="hsl(var(--card))" />
                          <rect x="18" y="18" width="9" height="9" fill="hsl(var(--primary))" />

                          <rect x="65" y="10" width="25" height="25" fill="hsl(var(--foreground))" />
                          <rect x="69" y="14" width="17" height="17" fill="hsl(var(--card))" />
                          <rect x="73" y="18" width="9" height="9" fill="hsl(var(--primary))" />

                          <rect x="10" y="65" width="25" height="25" fill="hsl(var(--foreground))" />
                          <rect x="14" y="69" width="17" height="17" fill="hsl(var(--card))" />
                          <rect x="18" y="73" width="9" height="9" fill="hsl(var(--primary))" />

                          {/* Data dots */}
                          <rect x="42" y="15" width="5" height="5" fill="hsl(var(--foreground))" />
                          <rect x="50" y="22" width="6" height="6" fill="hsl(var(--foreground))" />
                          <rect x="42" y="42" width="16" height="16" rx="3" fill="hsl(var(--primary))" />
                          <rect x="46" y="46" width="8" height="8" fill="hsl(var(--card))" />
                          <rect x="15" y="42" width="6" height="6" fill="hsl(var(--foreground))" />
                          <rect x="25" y="50" width="6" height="6" fill="hsl(var(--foreground))" />
                          <rect x="68" y="45" width="8" height="6" fill="hsl(var(--foreground))" />
                          <rect x="78" y="55" width="6" height="8" fill="hsl(var(--foreground))" />
                          <rect x="42" y="68" width="6" height="6" fill="hsl(var(--foreground))" />
                          <rect x="52" y="75" width="6" height="6" fill="hsl(var(--foreground))" />
                          <rect x="70" y="72" width="16" height="16" fill="hsl(var(--foreground))" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-muted-foreground mt-2 font-medium">
                        Scan with your banking app or PayOS wallet
                      </span>
                    </div>

                    {/* Bank Transfer Details Table */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                        <span className="text-muted-foreground">Bank:</span>
                        <span className="font-bold text-foreground">Military Bank (MB Bank) / VietinBank</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                        <span className="text-muted-foreground">Account Number:</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                          <span>0979091813</span>
                          <button
                            type="button"
                            onClick={() => handleCopy('0979091813', 'Account Number')}
                            className="text-primary hover:text-primary-hover"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-bold text-primary text-sm">{formattedAmount}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-primary/20 bg-secondary/50">
                        <span className="text-foreground font-semibold">Transfer Memo:</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-primary">
                          <span>{transferMemo}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(transferMemo, 'Transfer Memo')}
                            className="text-primary hover:text-primary-hover"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {paymentStatus === 'SUCCESS' && (
                  <div className="py-8 text-center space-y-3">
                    <div className="h-14 w-14 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto shadow-xs">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-lg font-extrabold text-foreground">Payment Successful!</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      PayOS signature confirmed for order #{orderCode}. Redirecting to automated workspace provisioning...
                    </p>
                  </div>
                )}

                {paymentStatus === 'FAILED' && (
                  <div className="py-6 text-center space-y-3">
                    <div className="h-14 w-14 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mx-auto shadow-xs">
                      <AlertTriangle size={30} />
                    </div>
                    <h3 className="text-base font-extrabold text-foreground">Payment Failed or Timed Out</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      We were unable to detect a confirmed PayOS transaction for this order. You can safely retry without double-charging.
                    </p>
                    <Button variant="primary" size="sm" onClick={handleRetryPayment} className="mt-2">
                      <RotateCcw size={14} className="mr-1.5" /> Retry Payment
                    </Button>
                  </div>
                )}
              </CardContent>

              {/* Simulation Testing Toolbar */}
              <CardFooter className="bg-muted/30 border-t border-border/70 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground font-medium">Interactive Demo Testing:</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 text-destructive hover:bg-destructive/10"
                    onClick={handleSimulateFailure}
                    disabled={isProcessing || paymentStatus !== 'PENDING'}
                  >
                    Simulate Failure
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="text-xs h-8"
                    onClick={handleSimulateSuccess}
                    disabled={isProcessing || paymentStatus !== 'PENDING'}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={13} className="animate-spin mr-1.5" /> Verifying...
                      </>
                    ) : (
                      'Simulate PayOS Success Webhook'
                    )}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Right Column: Order Summary (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="border-b border-border/70 pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building size={16} className="text-primary" />
                  Order Summary
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-4 space-y-3.5 text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Organization:</span>
                  <p className="font-bold text-foreground text-sm">{checkoutData.organizationName}</p>
                  <p className="font-mono text-muted-foreground text-[11px]">{checkoutData.subdomain}.adaptlearn.io</p>
                </div>

                <div className="border-t border-border/60 pt-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Plan:</span>
                    <Badge variant="primary" className="text-xs font-bold">
                      {checkoutData.planName}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Employee Seats:</span>
                    <span className="font-bold text-foreground">{checkoutData.seatLimit} seats</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Billing Cycle:</span>
                    <span className="font-medium text-foreground capitalize">{checkoutData.billingCycle}</span>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-mono text-foreground">{formattedAmount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">VAT / Processing:</span>
                    <span className="font-mono text-foreground">Included (0%)</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border font-bold text-sm">
                    <span className="text-foreground">Total Charged:</span>
                    <span className="text-primary text-base font-extrabold">{formattedAmount}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <ShieldCheck size={14} className="text-success" />
                    <span>PayOS Signature Verification</span>
                  </div>
                  <p>
                    All webhook notifications use HMAC SHA-256 signatures to guarantee cryptographic authenticity before tenant provisioning.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="border-t border-border/70 pt-3">
                <Link to="/guest/plans" className="text-xs text-muted-foreground hover:text-foreground">
                  ← Back to Subscription Plans
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </GuestLayout>
  )
}
