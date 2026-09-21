import * as React from 'react'
import { CheckCircle2, AlertTriangle, Target, Eye, EyeOff } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { TARGET_ROLE_BENCHMARKS, type TargetRoleBenchmark } from '../data/learnerOverviewData'

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
  angle: number
}

export function CompetencyRadarChart({
  selectedRoleKey,
  onSelectRoleKey,
}: CompetencyRadarChartProps) {
  const [showCurrentMastery, setShowCurrentMastery] = React.useState(true)
  const [showTargetBenchmark, setShowTargetBenchmark] = React.useState(true)
  const [hoveredPoint, setHoveredPoint] = React.useState<HoveredPoint | null>(null)

  const benchmark: TargetRoleBenchmark =
    TARGET_ROLE_BENCHMARKS[selectedRoleKey] || TARGET_ROLE_BENCHMARKS['ai-knowledge-architect']

  const dimensions = benchmark.dimensions
  const totalAxes = dimensions.length

  // Radar geometry configuration
  const size = 440
  const center = size / 2
  const radius = 150
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0]

  // Calculate coordinates for an axis at a given normalized distance (0 to 1)
  const getCoordinates = (index: number, normalizedValue: number) => {
    // Start at -90 degrees (12 o'clock)
    const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2
    const distance = radius * Math.min(Math.max(normalizedValue, 0), 1)
    const x = center + distance * Math.cos(angle)
    const y = center + distance * Math.sin(angle)
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

  // Aggregated alignment for this benchmark
  const totalReq = dimensions.reduce((acc, d) => acc + d.requiredLevel, 0)
  const totalCur = dimensions.reduce((acc, d) => acc + d.currentLevel, 0)
  const roleReadiness = Math.round((totalCur / totalReq) * 100)

  const gapsCount = dimensions.filter((d) => d.currentLevel < d.requiredLevel).length
  const masteredCount = dimensions.filter((d) => d.currentLevel >= d.requiredLevel).length

  return (
    <div className="flex flex-col xl:flex-row items-center gap-8 w-full">
      {/* Visual Chart Container */}
      <div className="relative flex flex-col items-center justify-center p-2">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full max-w-[390px] sm:max-w-[430px] h-auto overflow-visible select-none drop-shadow-xs"
          role="img"
          aria-label={`Competency spider radar chart comparing skills against ${benchmark.roleTitle}`}
        >
          {/* Background Concentric Polygon Rings */}
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
                  fill="hsl(var(--muted) / 0.15)"
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                  strokeDasharray={ringValue === 1.0 ? '0' : '2,2'}
                />
                {/* Ring percentage label on vertical axis */}
                <text
                  x={center + 5}
                  y={center - radius * ringValue + 3}
                  fontSize="10"
                  fill="hsl(var(--muted-foreground))"
                  className="font-mono font-medium opacity-60 pointer-events-none"
                >
                  {Math.round(ringValue * 100)}%
                </text>
              </g>
            )
          })}

          {/* Radial Spokes / Axes */}
          {dimensions.map((dim, i) => {
            const outerCoord = getCoordinates(i, 1.0)
            const labelCoord = getCoordinates(i, 1.22)

            // Text alignment heuristics based on horizontal position
            let textAnchor: 'middle' | 'start' | 'end' = 'middle'
            if (outerCoord.x > center + 15) textAnchor = 'start'
            else if (outerCoord.x < center - 15) textAnchor = 'end'

            return (
              <g key={dim.axisName}>
                {/* Spoke Line */}
                <line
                  x1={center}
                  y1={center}
                  x2={outerCoord.x}
                  y2={outerCoord.y}
                  stroke="hsl(var(--border))"
                  strokeWidth="1.2"
                />

                {/* Outer Axis Title Label */}
                <text
                  x={labelCoord.x}
                  y={labelCoord.y}
                  textAnchor={textAnchor}
                  dominantBaseline="central"
                  fontSize="11.5"
                  fill="hsl(var(--foreground))"
                  className="font-semibold transition-colors hover:fill-primary cursor-default"
                >
                  {dim.axisName}
                </text>
              </g>
            )
          })}

          {/* LAYER 1: Target Role Benchmark Polygon */}
          {showTargetBenchmark && (
            <g className="transition-all duration-300">
              <polygon
                points={targetPolygonPoints}
                fill="hsl(var(--muted-foreground) / 0.08)"
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
                fill="hsl(var(--primary) / 0.22)"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                className="filter drop-shadow-sm transition-all duration-300"
              />
              {dimensions.map((dim, i) => {
                const { x, y, angle } = getCoordinates(i, dim.currentLevel / 100)
                const isHovered = hoveredPoint?.axisName === dim.axisName

                return (
                  <circle
                    key={`cur-${dim.axisName}`}
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
                        angle,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                )
              })}
            </g>
          )}

          {/* Interactive Vertex Tooltip */}
          {hoveredPoint && (
            <g
              transform={`translate(${hoveredPoint.x}, ${hoveredPoint.y - 12})`}
              className="pointer-events-none animate-in fade-in zoom-in-95 duration-100"
            >
              <rect
                x="-80"
                y="-56"
                width="160"
                height="50"
                rx="6"
                fill="hsl(var(--card))"
                stroke="hsl(var(--border))"
                strokeWidth="1.2"
                className="drop-shadow-lg"
              />
              <text
                x="0"
                y="-40"
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="hsl(var(--foreground))"
              >
                {hoveredPoint.axisName}
              </text>
              <text
                x="0"
                y="-26"
                textAnchor="middle"
                fontSize="10"
                fill="hsl(var(--muted-foreground))"
              >
                Current: <tspan fontWeight="700" fill="hsl(var(--primary))">{hoveredPoint.currentLevel}%</tspan> | Req: <tspan fontWeight="600" fill="hsl(var(--foreground))">{hoveredPoint.requiredLevel}%</tspan>
              </text>
              <text
                x="0"
                y="-13"
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="600"
                fill={hoveredPoint.currentLevel >= hoveredPoint.requiredLevel ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
              >
                {hoveredPoint.currentLevel >= hoveredPoint.requiredLevel
                  ? 'Mastered (+ ready)'
                  : `Gap: -${hoveredPoint.requiredLevel - hoveredPoint.currentLevel}% deficit`}
              </text>
            </g>
          )}
        </svg>

        {/* Layer Toggles & Color Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3 pt-3 border-t border-border w-full text-xs">
          <button
            type="button"
            onClick={() => setShowCurrentMastery(!showCurrentMastery)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all cursor-pointer ${
              showCurrentMastery
                ? 'border-primary/40 bg-primary/10 text-foreground font-semibold'
                : 'border-border bg-muted text-muted-foreground line-through'
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />
            <span>My Current Mastery</span>
            {showCurrentMastery ? <Eye size={13} className="text-primary" /> : <EyeOff size={13} />}
          </button>

          <button
            type="button"
            onClick={() => setShowTargetBenchmark(!showTargetBenchmark)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all cursor-pointer ${
              showTargetBenchmark
                ? 'border-border bg-muted/70 text-foreground font-semibold'
                : 'border-border bg-muted/50 text-muted-foreground line-through'
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-muted-foreground inline-block" />
            <span>Target Role Threshold</span>
            {showTargetBenchmark ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
        </div>
      </div>

      {/* Role Benchmark Selection & Diagnostic Summary */}
      <div className="flex-1 space-y-4 w-full max-w-md">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Target size={14} className="text-primary" /> Compare Against Target Role
          </label>
          <div className="grid grid-cols-1 gap-2">
            {Object.values(TARGET_ROLE_BENCHMARKS).map((r) => {
              const isSelected = r.roleId === selectedRoleKey
              return (
                <button
                  key={r.roleId}
                  type="button"
                  onClick={() => onSelectRoleKey(r.roleId)}
                  className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-border bg-card hover:bg-muted/40 hover:border-border'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {r.roleTitle}
                      </span>
                      {isSelected && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold">
                          ACTIVE
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{r.department}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-bold text-foreground">{r.readinessPercentage}%</span>
                    <span className="block text-[10px] uppercase text-muted-foreground font-semibold">Match</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Alignment Breakdown Callout */}
        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              Role Match Diagnostic
            </span>
            <span className="text-primary font-bold">{roleReadiness}% Aggregate Match</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 rounded-lg bg-card border border-border flex items-center gap-2">
              <CheckCircle2 size={16} className="text-success shrink-0" />
              <div>
                <span className="font-bold text-foreground text-sm">{masteredCount}</span>
                <span className="block text-[11px] text-muted-foreground">Mastered Axes</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-card border border-border flex items-center gap-2">
              <AlertTriangle size={16} className="text-destructive shrink-0" />
              <div>
                <span className="font-bold text-destructive text-sm">{gapsCount}</span>
                <span className="block text-[11px] text-muted-foreground">Skill Deficits</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Derived from continuous Bayesian Knowledge Tracing across assessment results, PR artifacts, and mentor sign-offs.
          </p>
        </div>
      </div>
    </div>
  )
}
