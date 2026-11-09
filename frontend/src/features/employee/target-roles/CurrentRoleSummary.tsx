import { Briefcase, Target, Eye, BookOpenCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Card } from '../../../shared/components/ui/Card'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { RoleBaselineGate } from './RoleBaselineGate'
import { normalizeLevelRank, type RoleFlowView } from './currentRoleFlowApi'

export function CurrentRoleSummary({ view, onDetails, disabled = false }: { view: RoleFlowView; onDetails: () => void; disabled?: boolean }) {
  const { t } = useTranslation()
  const startingPlacement = view.startingPlacement ?? null
  const startingTargetRank = startingPlacement?.levelId
    ? normalizeLevelRank(startingPlacement.levelId)
    : view.assignedLevelRank ?? normalizeLevelRank(view.assignedLevel)
  const startingLevel = startingPlacement
    ? (startingPlacement.role.levels.find(
        level =>
          level.id === startingPlacement.levelId ||
          level.name.toLowerCase() === startingPlacement.levelId?.toLowerCase() ||
          level.name.toLowerCase() === view.assignedLevel?.toLowerCase() ||
          (view.assignedLevel && level.name.toLowerCase().includes(view.assignedLevel.toLowerCase())) ||
          (view.assignedLevel && view.assignedLevel.toLowerCase().includes(level.name.toLowerCase())) ||
          level.code.toLowerCase() === startingPlacement.levelId?.toLowerCase(),
      ) ||
      (startingTargetRank !== null && startingTargetRank !== undefined
        ? startingPlacement.role.levels.find(
            level =>
              level.rank === startingTargetRank ||
              normalizeLevelRank(level.name) === startingTargetRank ||
              normalizeLevelRank(level.id) === startingTargetRank,
          )
        : null))
    : null

  const selection = view.selection
  const targetRank = selection?.levelId ? normalizeLevelRank(selection.levelId) : null
  const activeLevel = selection && selection.levelId
    ? (selection.role.levels.find(
        level =>
          level.id === selection.levelId ||
          level.name.toLowerCase() === selection.levelId?.toLowerCase() ||
          level.code.toLowerCase() === selection.levelId?.toLowerCase(),
      ) ||
      (targetRank !== null
        ? selection.role.levels.find(
            level =>
              level.rank === targetRank ||
              normalizeLevelRank(level.name) === targetRank ||
              normalizeLevelRank(level.id) === targetRank,
          )
        : null))
    : null

  if (view.progress.state === 'LEGACY_SELECTION_REQUIRES_RESELECTION') {
    return <Card className="p-5"><Text role="status">{t('roleFlow.legacySelection')}</Text></Card>
  }

  return (
    <div className="space-y-4">
      {startingPlacement && (
        <Card className="min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                <Briefcase size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Heading level={2} size="card">
                    {t('upskillingUi.startingCareerPlacement')}
                  </Heading>
                  <Badge
                    variant="secondary"
                    className="max-w-full whitespace-normal break-words border-primary/20 text-primary"
                  >
                    {startingPlacement.role.name}
                    {startingLevel
                      ? ` · ${startingLevel.name}`
                      : view.assignedLevel
                        ? ` · ${view.assignedLevel}`
                        : ''}
                  </Badge>
                </div>
                <Text variant="caption">{startingPlacement.role.jobPositionName}</Text>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <Target size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Heading level={2} size="card">
                  {t(
                    selection
                      ? selection.available
                        ? 'upskillingUi.activeRole'
                        : 'roleFlow.previousUnavailable'
                      : 'upskillingUi.activeRole',
                  )}
                </Heading>
                {selection ? (
                  <>
                    <Badge
                      variant={selection.available ? 'secondary' : 'warning'}
                      className={`max-w-full whitespace-normal break-words ${selection.available ? 'border-primary/20 text-primary' : ''}`}
                    >
                      {selection.role.name}
                      {activeLevel
                        ? ` · ${activeLevel.name}`
                        : selection.levelId
                          ? ` · ${t('initialPathway.state.UNAVAILABLE')}`
                          : ''}
                    </Badge>
                    {activeLevel?.duration && (
                      <Badge variant="outline" className="text-xs font-medium border-border/80">
                        Est. {activeLevel.duration}
                      </Badge>
                    )}
                  </>
                ) : (
                  <Badge variant="outline" className="text-xs font-medium text-muted-foreground border-border/80">
                    {t('upskillingUi.noActiveRoleSelected')}
                  </Badge>
                )}
              </div>
              <Text variant="caption">
                {selection ? selection.role.jobPositionName : t('upskillingUi.selectActiveRoleHint')}
              </Text>
            </div>
          </div>
          {selection && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                className="font-semibold"
                leftIcon={<Eye size={16} aria-hidden="true" />}
                disabled={disabled}
                onClick={onDetails}
              >
                {t('upskillingUi.showDetails')}
              </Button>
              <Link
                className={buttonVariants({
                  variant: 'outline',
                  className: `gap-2 border-primary/40 font-semibold text-primary hover:bg-secondary ${disabled ? 'pointer-events-none opacity-50' : ''}`,
                })}
                to="/employee/my-mastery"
                aria-disabled={disabled || undefined}
                tabIndex={disabled ? -1 : undefined}
                onClick={event => {
                  if (disabled) event.preventDefault()
                }}
              >
                <BookOpenCheck size={16} aria-hidden="true" />
                {t('baselineUi.viewProfile')}
              </Link>
            </div>
          )}
        </div>
        <RoleBaselineGate view={view} />
      </Card>
    </div>
  )
}
