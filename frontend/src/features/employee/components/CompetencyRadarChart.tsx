import * as React from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Target,
} from 'lucide-react'
import { getActiveCompany } from '../../../shared/stores/companyStore'
import { TARGET_ROLE_BENCHMARKS, type TargetRoleBenchmark } from '../data/employeeOverviewData'

interface CompetencyRadarChartProps {
  selectedRoleKey: string
  onSelectRoleKey: (key: string) => void
}

interface HoveredPoint {
  axisName: string
  currentLevel: number
  requiredLevel: number
  x: number
  y: number
  percentage: number
}

export function CompetencyRadarChart({
  selectedRoleKey,
  onSelectRoleKey,
}: CompetencyRadarChartProps) {
  const [activeCompany, setActiveCompany] = React.useState(getActiveCompany)

  React.useEffect(() => {
    const handleSync = () => setActiveCompany(getActiveCompany())
    window.addEventListener('active_company_changed', handleSync)
    window.addEventListener('companies_updated', handleSync)
    return () => {
      window.removeEventListener('active_company_changed', handleSync)
      window.removeEventListener('companies_updated', handleSync)
    }
  }, [])

  const [showCurrentMastery, setShowCurrentMastery] = React.useState(true)
  const [showTargetBenchmark, setShowTargetBenchmark] = React.useState(true)
  const [hoveredPoint, setHoveredPoint] = React.useState<HoveredPoint | null>(null)
  const [hoveredAxisIndex, setHoveredAxisIndex] = React.useState<number | null>(null)

  const benchmark: TargetRoleBenchmark = React.useMemo(() => {
    return TARGET_ROLE_BENCHMARKS[selectedRoleKey] || TARGET_ROLE_BENCHMARKS['ai-knowledge-architect']
  }, [selectedRoleKey])

  const dimensions = React.useMemo(() => {
    if (activeCompany.id === 'comp-technova') {
      return benchmark.dimensions
    }

    if (activeCompany.competencies && activeCompany.competencies.length >= 3) {
      return activeCompany.competencies.slice(0, 6).map((c, i) => ({
        axisName: c.name,
        currentLevel: Math.min(90, 50 + ((i * 14) % 40)),
        requiredLevel: 80,
      }))
    }

    if (activeCompany.microSkills && activeCompany.microSkills.length >= 3) {
      return activeCompany.microSkills.slice(0, 6).map((ms) => ({
        axisName: ms.name,
        currentLevel: ms.status === 'published' ? 85 : 55,
        requiredLevel: 80,
      }))
    }

    return []
  }, [activeCompany, selectedRoleKey])

  if (dimensions.length < 3) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground">
        <Target size={28} className="mx-auto mb-2 text-muted-foreground/50" />
        <p className="font-semibold text-foreground">Insufficient Competencies for Radar</p>
        <p className="text-[11px] mt-1">
          At least 3 competencies are required to render an active radar chart for this organization.
        </p>
      </div>
    )
  }

  const totalAxes = dimensions.length

  // Enhanced Radar geometry with ample label breathing room
  // Width 540, Height 400, Center (270, 200), Radius 130
  const width = 540
  const height = 400
  const centerX = width / 2
  const centerY = height / 2
  const radius = 130
  const rings = [0.25, 0.5, 0.75, 1.0]

  // Calculate coordinates for an axis at a given normalized distance (0 to 1)
  const getCoordinates = (index: number, normalizedValue: number, customRadius = radius) => {
    // Start at -90 degrees (12 o'clock)
    const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2
    const distance = customRadius * Math.min(Math.max(normalizedValue, 0), 1.0)
    const x = centerX + distance * Math.cos(angle)
    const y = centerY + distance * Math.sin(angle)
    return { x, y, angle }
  }

  // Generate SVG polygon points string
  const currentPolygonPoints = dimensions
    .map((dim, i) => {
      const { x, y } = getCoordinates(i, dim.currentLevel / 100)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const targetPolygonPoints = dimensions
    .map((dim, i) => {
      const { x, y } = getCoordinates(i, dim.requiredLevel / 100)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  // Aggregated alignment
  const totalReq = dimensions.reduce((acc, d) => acc + d.requiredLevel, 0)
  const totalCur = dimensions.reduce((acc, d) => acc + d.currentLevel, 0)
  const roleReadiness = Math.round((totalCur / totalReq) * 100)
  const gapsCount = dimensions.filter((d) => d.currentLevel < d.requiredLevel).length
  const masteredCount = dimensions.filter((d) => d.currentLevel >= d.requiredLevel).length

  return (
    <div className="flex flex-col items-center w-full space-y-4">
      {/* Target Role Comparator Pill Selector */}
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Target size={13} className="text-primary" /> Benchmark Alignment Track
          </span>
          <span className="font-mono text-primary font-bold">
            {benchmark.readinessPercentage}% Fit
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
          {Object.values(TARGET_ROLE_BENCHMARKS).map((r) => {
            const isSelected = r.roleId === selectedRoleKey
            return (
              <button
                key={r.roleId}
                type="button"
                onClick={() => onSelectRoleKey(r.roleId)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-2xs ring-1 ring-primary/30'
                    : 'border-border bg-card/60 hover:bg-muted/50 hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-xs font-bold truncate ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {r.roleTitle}
                  </span>
                  <span
                    className={`font-mono text-[11px] font-bold shrink-0 ${
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {r.readinessPercentage}%
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                  {r.department}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Visual Radar SVG Container */}
      <div className="relative w-full flex items-center justify-center p-1 bg-gradient-to-b from-muted/20 to-card/40 rounded-2xl border border-border/80">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[500px] h-auto overflow-visible select-none drop-shadow-xs"
          role="img"
          aria-label={`Competency spider radar chart comparing skills against ${benchmark.roleTitle}`}
        >
          {/* Subtle Ambient Background Circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="hsl(var(--card))"
            className="opacity-70"
          />

          {/* Background Concentric Polygon Web Rings */}
          {rings.map((ringValue) => {
            const points = dimensions
              .map((_, i) => {
                const { x, y } = getCoordinates(i, ringValue)
                return `${x.toFixed(1)},${y.toFixed(1)}`
              })
              .join(' ')

            return (
              <g key={ringValue}>
                <polygon
                  points={points}
                  fill={ringValue === 1.0 ? 'hsl(var(--muted) / 0.15)' : 'none'}
                  stroke="hsl(var(--border))"
                  strokeWidth={ringValue === 1.0 ? '1.5' : '1'}
                  strokeDasharray={ringValue === 1.0 ? '0' : '3,3'}
                />
                {/* Ring percentage label placed on vertical spoke */}
                <text
                  x={centerX + 4}
                  y={centerY - radius * ringValue + 3}
                  fontSize="9.5"
                  fill="hsl(var(--muted-foreground))"
                  className="font-mono font-medium opacity-70 pointer-events-none select-none"
                >
                  {Math.round(ringValue * 100)}%
                </text>
              </g>
            )
          })}

          {/* Radial Spokes and Outer Axis Labels with Shield Backdrops */}
          {dimensions.map((dim, i) => {
            const outerCoord = getCoordinates(i, 1.0)
            const labelCoord = getCoordinates(i, 1.22, radius)
            const isAxisHovered = hoveredAxisIndex === i || hoveredPoint?.axisName === dim.axisName

            // Compute anchor based on horizontal alignment
            let textAnchor: 'middle' | 'start' | 'end' = 'middle'
            if (labelCoord.x > centerX + 20) textAnchor = 'start'
            else if (labelCoord.x < centerX - 20) textAnchor = 'end'

            // Compute vertical offset
            let dy = '0.35em'
            if (labelCoord.y < centerY - 40) dy = '0em'
            else if (labelCoord.y > centerY + 40) dy = '0.7em'

            const isMastered = dim.currentLevel >= dim.requiredLevel

            return (
              <g
                key={dim.axisName}
                onMouseEnter={() => setHoveredAxisIndex(i)}
                onMouseLeave={() => setHoveredAxisIndex(null)}
                className="cursor-pointer transition-opacity"
              >
                {/* Radial Line */}
                <line
                  x1={centerX}
                  y1={centerY}
                  x2={outerCoord.x}
                  y2={outerCoord.y}
                  stroke={isAxisHovered ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                  strokeWidth={isAxisHovered ? '1.8' : '1.2'}
                  className="transition-colors duration-150"
                />

                {/* Outer Axis Title Label */}
                <text
                  x={labelCoord.x}
                  y={labelCoord.y}
                  textAnchor={textAnchor}
                  dy={dy}
                  fontSize="11"
                  fontWeight={isAxisHovered ? '700' : '600'}
                  fill={isAxisHovered ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'}
                  className="transition-colors duration-150"
                >
                  {dim.axisName}
                </text>

                {/* Micro Score Pill underneath the label */}
                <text
                  x={labelCoord.x}
                  y={labelCoord.y + (dy === '0em' ? -13 : 14)}
                  textAnchor={textAnchor}
                  fontSize="9.5"
                  className="font-mono font-semibold"
                  fill={isMastered ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))'}
                >
                  {dim.currentLevel}% / {dim.requiredLevel}%
                </text>
              </g>
            )
          })}

          {/* LAYER 1: Target Role Benchmark Polygon */}
          {showTargetBenchmark && (
            <g className="transition-all duration-300">
              <polygon
                points={targetPolygonPoints}
                fill="hsl(var(--secondary) / 0.35)"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="1.8"
                strokeDasharray="4,4"
                className="opacity-80"
              />
              {dimensions.map((dim, i) => {
                const { x, y } = getCoordinates(i, dim.requiredLevel / 100)
                return (
                  <circle
                    key={`target-${dim.axisName}`}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill="hsl(var(--card))"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1.5"
                    className="cursor-pointer"
                  />
                )
              })}
            </g>
          )}

          {/* LAYER 2: Current Learner Mastery Polygon */}
          {showCurrentMastery && (
            <g className="transition-all duration-300">
              <polygon
                points={currentPolygonPoints}
                fill="hsl(var(--primary) / 0.24)"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                className="filter drop-shadow-xs transition-all duration-300"
              />
              {dimensions.map((dim, i) => {
                const { x, y } = getCoordinates(i, dim.currentLevel / 100)
                const isHovered =
                  hoveredPoint?.axisName === dim.axisName || hoveredAxisIndex === i

                return (
                  <g key={`cur-${dim.axisName}`}>
                    {/* Pulsing ring on hover */}
                    {isHovered && (
                      <circle
                        cx={x}
                        cy={y}
                        r="10"
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="1.5"
                        className="animate-ping opacity-60 pointer-events-none"
                      />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? '6.5' : '4.5'}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--card))"
                      strokeWidth="2"
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          axisName: dim.axisName,
                          currentLevel: dim.currentLevel,
                          requiredLevel: dim.requiredLevel,
                          x,
                          y,
                          percentage: Math.round((dim.currentLevel / dim.requiredLevel) * 100),
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                )
              })}
            </g>
          )}

          {/* Interactive Vertex Tooltip */}
          {hoveredPoint && (
            <g
              transform={`translate(${hoveredPoint.x}, ${
                hoveredPoint.y < 100 ? hoveredPoint.y + 40 : hoveredPoint.y - 15
              })`}
              className="pointer-events-none animate-in fade-in zoom-in-95 duration-100"
            >
              <rect
                x="-85"
                y="-55"
                width="170"
                height="54"
                rx="8"
                fill="hsl(var(--card))"
                stroke="hsl(var(--primary) / 0.6)"
                strokeWidth="1.5"
                className="drop-shadow-lg"
              />
              <text
                x="0"
                y="-39"
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="hsl(var(--foreground))"
              >
                {hoveredPoint.axisName}
              </text>
              <text
                x="0"
                y="-25"
                textAnchor="middle"
                fontSize="10"
                fill="hsl(var(--muted-foreground))"
              >
                Verified: <tspan fontWeight="700" fill="hsl(var(--primary))">{hoveredPoint.currentLevel}%</tspan> | Req: <tspan fontWeight="600" fill="hsl(var(--foreground))">{hoveredPoint.requiredLevel}%</tspan>
              </text>
              <text
                x="0"
                y="-12"
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="600"
                fill={
                  hoveredPoint.currentLevel >= hoveredPoint.requiredLevel
                    ? 'hsl(var(--success))'
                    : 'hsl(var(--destructive))'
                }
              >
                {hoveredPoint.currentLevel >= hoveredPoint.requiredLevel
                  ? 'Mastered (+ verified)'
                  : `Gap: -${hoveredPoint.requiredLevel - hoveredPoint.currentLevel}% required`}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Layer Toggles & Color Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 w-full pt-1 px-1 text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCurrentMastery(!showCurrentMastery)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              showCurrentMastery
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : 'border-border bg-muted/60 text-muted-foreground line-through'
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />
            <span>My Verified Mastery</span>
            {showCurrentMastery ? <Eye size={13} className="text-primary" /> : <EyeOff size={13} />}
          </button>

          <button
            type="button"
            onClick={() => setShowTargetBenchmark(!showTargetBenchmark)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              showTargetBenchmark
                ? 'border-border bg-muted/70 text-foreground'
                : 'border-border bg-muted/40 text-muted-foreground line-through'
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-muted-foreground inline-block" />
            <span>Role Target Benchmark</span>
            {showTargetBenchmark ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
        </div>

        {/* Alignment summary stats badge */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground font-mono">
            Role Alignment: <strong className="text-primary font-bold">{roleReadiness}%</strong>
          </span>
          <span className="text-border">&bull;</span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 size={13} className="text-success" />
            <strong className="text-foreground">{masteredCount}</strong> Mastered
          </span>
          <span className="text-border">&bull;</span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <AlertTriangle size={13} className="text-warning" />
            <strong className="text-foreground">{gapsCount}</strong> Gaps
          </span>
        </div>
      </div>
    </div>
  )
}
