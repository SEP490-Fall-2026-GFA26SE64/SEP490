import { ArrowRight, CheckCircle2, Lock, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { TargetRoleSelector } from '../../../shared/components/ui/TargetRoleSelector'
import { useEmployeeLearningState } from '../../../shared/hooks/useEmployeeLearningState'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { CompetencyGapAnalysis } from '../components/CompetencyGapAnalysis'
import './CompetencyGapAnalysisPage.css'

export function CompetencyGapAnalysisPage() {
  const { profile, isLearningLocked, toggleDiagnosticLock } = useEmployeeLearningState()
  const { t, language } = useTranslation()

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Actions Bar */}
        <PageHeader
          actions={
            <div className="w-full flex items-center justify-between gap-2.5 flex-wrap">
              <TargetRoleSelector />
              {isLearningLocked ? (
                <Badge variant="warning" className="text-xs font-semibold px-2.5 py-1">
                  <Lock size={12} className="mr-1 inline" /> {t('Diagnostic Assessment Required')}
                </Badge>
              ) : (
                <Badge variant="success" className="text-xs font-semibold px-2.5 py-1">
                  <CheckCircle2 size={12} className="mr-1 inline" /> {t('Gaps Evaluated & Calibrated')}
                </Badge>
              )}
            </div>
          }
        />

        {/* LOCKED STATE IF DIAGNOSTIC NOT COMPLETED */}
        {isLearningLocked ? (
          <Card className="border border-warning/30 bg-gradient-to-br from-card via-card to-warning/5 shadow-xs overflow-hidden">
            <CardContent className="py-12 px-6 text-center max-w-2xl mx-auto space-y-5">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-warning/15 text-warning border border-warning/30 flex items-center justify-center shadow-xs">
                <Lock size={28} />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground tracking-tight">
                  {t('Competency Gap Analysis Locked')}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {language === 'vi'
                    ? 'Nếu chưa hoàn thành bài đánh giá chuẩn đoán ban đầu, hệ thống chưa thể xác định mức độ thành thạo thực tế hoặc khoảng cách năng lực cho '
                    : 'Without completing your baseline diagnostic assessment, the system cannot determine your actual skill proficiencies or identify what your competency gaps are for '}
                  <strong className="text-primary">{profile.targetRole || 'AI Knowledge Architect'}</strong>.
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {language === 'vi'
                    ? `Hoàn thành bài đánh giá trong trung tâm khảo thí để hiệu chuẩn đồ thị tri thức. Sau khi hiệu chuẩn, kỹ năng của bạn sẽ được đối sánh với yêu cầu sẵn sàng tối thiểu ${profile.targetReadinessScore}%.`
                    : `Complete the diagnostic assessment in the assessment center to calibrate your knowledge graph. Once calibrated, your skill proficiencies will be benchmarked against your target readiness requirement of ${profile.targetReadinessScore}%.`}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/employee/assessment?diagnostic=true">
                  <Button
                    variant="primary"
                    size="default"
                    rightIcon={<ArrowRight size={16} />}
                    className="font-bold shadow-xs px-5"
                  >
                    {t('Take Diagnostic Assessment Now')}
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="default"
                  onClick={toggleDiagnosticLock}
                  className="text-xs font-semibold hover:border-primary/40"
                  leftIcon={<RefreshCw size={13} />}
                >
                  {t('Quick Unlock (Demo Test)')}
                </Button>
              </div>

              <div className="pt-4 border-t border-border/60 text-[11px] text-muted-foreground font-mono">
                System Policy: Diagnostic Baseline Required Before Gap Detection
              </div>
            </CardContent>
          </Card>
        ) : (
          <CompetencyGapAnalysis />
        )}
      </div>
    </WorkspaceLayout>
  )
}
