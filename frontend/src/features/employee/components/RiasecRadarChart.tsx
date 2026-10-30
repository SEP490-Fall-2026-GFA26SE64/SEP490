import * as React from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { normalizeRoleKey } from '../data/employeeOverviewData'

interface RiasecRadarChartProps {
  selectedRoleKey?: string
}

interface RiasecAxis {
  code: 'R' | 'I' | 'A' | 'S' | 'E' | 'C'
  label: string
  fullName: string
  description: string
  userScore: number // 0-100
  targetScore: number // 0-100
}

interface HoveredPoint {
  code: string
  label: string
  fullName: string
  description: string
  userScore: number
  targetScore: number
  x: number
  y: number
}

const RIASEC_ROLE_PROFILES: Record<
  string,
  {
    roleTitle: string
    hollandCode: string
    fitPercentage: number
    archetype: string
    targets: Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', number>
  }
> = {
  'ai-knowledge-architect': {
    roleTitle: 'AI Knowledge Architect',
    hollandCode: 'ICA',
    fitPercentage: 94,
    archetype: 'Analytical Ontologies & Structured Knowledge',
    targets: { R: 70, I: 95, A: 65, S: 50, E: 60, C: 85 },
  },
  'senior-backend-engineer': {
    roleTitle: 'Senior Backend Engineer',
    hollandCode: 'CIR',
    fitPercentage: 88,
    archetype: 'Structured Systems & Platform Reliability',
    targets: { R: 80, I: 90, A: 45, S: 50, E: 55, C: 92 },
  },
  'graph-data-scientist': {
    roleTitle: 'Graph Data Scientist',
    hollandCode: 'IAC',
    fitPercentage: 91,
    archetype: 'Empirical Discovery & Machine Learning',
    targets: { R: 60, I: 96, A: 75, S: 45, E: 50, C: 80 },
  },
}

// User's verified Holland traits evaluated from the RIASEC assessment
const USER_RIASEC_SCORES: Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', number> = {
  R: 64, // Realistic
  I: 88, // Investigative
  A: 76, // Artistic
  S: 52, // Social
  E: 58, // Enterprising
  C: 82, // Conventional
}

export function RiasecRadarChart({ selectedRoleKey }: RiasecRadarChartProps) {
  const { language } = useTranslation()
  const roleKey = normalizeRoleKey(selectedRoleKey)
  const roleData = RIASEC_ROLE_PROFILES[roleKey] || RIASEC_ROLE_PROFILES['ai-knowledge-architect']

  const [showUserProfile, setShowUserProfile] = React.useState(true)
  const [showRoleBenchmark, setShowRoleBenchmark] = React.useState(true)
  const [hoveredPoint, setHoveredPoint] = React.useState<HoveredPoint | null>(null)
  const [hoveredAxisIndex, setHoveredAxisIndex] = React.useState<number | null>(null)

  const axes: RiasecAxis[] = React.useMemo(() => {
    return [
      {
        code: 'R',
        label: 'Realistic (R)',
        fullName: language === 'vi' ? 'Thực tế (Doers)' : 'Realistic (Doers)',
        description: language === 'vi' ? 'Thực hành kỹ thuật, công cụ và hệ thống máy tính' : 'Hands-on practical engineering, tooling, and systems',
        userScore: USER_RIASEC_SCORES.R,
        targetScore: roleData.targets.R,
      },
      {
        code: 'I',
        label: 'Investigative (I)',
        fullName: language === 'vi' ? 'Nghiên cứu (Thinkers)' : 'Investigative (Thinkers)',
        description: language === 'vi' ? 'Tư duy trừu tượng, giải quyết vấn đề và phân tích thuật toán' : 'Abstract reasoning, mathematical analysis, and research',
        userScore: USER_RIASEC_SCORES.I,
        targetScore: roleData.targets.I,
      },
      {
        code: 'A',
        label: 'Artistic (A)',
        fullName: language === 'vi' ? 'Nghệ thuật (Creators)' : 'Artistic (Creators)',
        description: language === 'vi' ? 'Thiết kế kiến trúc sáng tạo, mô hình hóa và đổi mới' : 'Creative architecture design, mental modeling, and innovation',
        userScore: USER_RIASEC_SCORES.A,
        targetScore: roleData.targets.A,
      },
      {
        code: 'S',
        label: 'Social (S)',
        fullName: language === 'vi' ? 'Xã hội (Helpers)' : 'Social (Helpers)',
        description: language === 'vi' ? 'Hợp tác liên chức năng, hướng dẫn và truyền đạt tri thức' : 'Cross-functional mentoring, collaboration, and knowledge sharing',
        userScore: USER_RIASEC_SCORES.S,
        targetScore: roleData.targets.S,
      },
      {
        code: 'E',
        label: 'Enterprising (E)',
        fullName: language === 'vi' ? 'Quản lý (Persuaders)' : 'Enterprising (Persuaders)',
        description: language === 'vi' ? 'Định hướng sản phẩm, ra quyết định và dẫn dắt kỹ thuật' : 'Strategic initiative, technical influence, and delivery leadership',
        userScore: USER_RIASEC_SCORES.E,
        targetScore: roleData.targets.E,
      },
      {
        code: 'C',
        label: 'Conventional (C)',
        fullName: language === 'vi' ? 'Quy củ (Organizers)' : 'Conventional (Organizers)',
        description: language === 'vi' ? 'Độ chính xác dữ liệu, tuân thủ tiêu chuẩn W3C và hệ thống' : 'Precision, schema compliance, W3C standards, and data rigor',
        userScore: USER_RIASEC_SCORES.C,
        targetScore: roleData.targets.C,
      },
    ]
  }, [language, roleData])

  // Identical SVG geometry matching CompetencyRadarChart
  const width = 540
  const height = 400
  const centerX = width / 2
  const centerY = height / 2
  const radius = 118
  const rings = [0.25, 0.5, 0.75, 1.0]
  const totalAxes = 6

  const getCoordinates = (index: number, normalizedValue: number, customRadius = radius) => {
    // 12 o'clock start (-PI/2)
    const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2
    const distance = customRadius * Math.min(Math.max(normalizedValue, 0), 1.0)
    const x = centerX + distance * Math.cos(angle)
    const y = centerY + distance * Math.sin(angle)
    return { x, y, angle }
  }

  const userPolygonPoints = axes
    .map((axis, i) => {
      const { x, y } = getCoordinates(i, axis.userScore / 100)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const targetPolygonPoints = axes
    .map((axis, i) => {
      const { x, y } = getCoordinates(i, axis.targetScore / 100)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const alignedCount = axes.filter((a) => a.userScore >= a.targetScore).length
  const gapsCount = axes.filter((a) => a.userScore < a.targetScore).length

  return (
    <div className="flex flex-col items-center w-full space-y-4">
      {/* Main Visual Radar SVG Container */}
      <div className="relative w-full flex items-center justify-center p-1 bg-gradient-to-b from-muted/20 to-card/40 rounded-2xl border border-border/80">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[500px] h-auto overflow-visible select-none drop-shadow-xs"
          role="img"
          aria-label="Holland RIASEC Interest Radar Chart"
        >
          {/* Subtle Ambient Center Circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="hsl(var(--card))"
            className="opacity-70"
          />

          {/* Web Rings */}
          {rings.map((ringValue) => {
            const points = axes
              .map((_, i) => {
                const { x, y } = getCoordinates(i, ringValue)
                return `${x.toFixed(1)},${y.toFixed(1)}`
              })
              .join(' ')

            // Position ring scale labels at -60 degrees (in open space between index 0 and 1)
            const ringAngle = -Math.PI / 3
            const ringLabelX = centerX + radius * ringValue * Math.cos(ringAngle)
            const ringLabelY = centerY + radius * ringValue * Math.sin(ringAngle)

            return (
              <g key={ringValue}>
                <polygon
                  points={points}
                  fill={ringValue === 1.0 ? 'hsl(var(--muted) / 0.15)' : 'none'}
                  stroke="hsl(var(--border))"
                  strokeWidth={ringValue === 1.0 ? '1.5' : '1'}
                  strokeDasharray={ringValue === 1.0 ? '0' : '3,3'}
                />
                {/* Ring percentage label with subtle backdrop pill to prevent line clash */}
                <rect
                  x={ringLabelX - 11}
                  y={ringLabelY - 6.5}
                  width="22"
                  height="12"
                  rx="3"
                  fill="hsl(var(--card))"
                  fillOpacity="0.88"
                />
                <text
                  x={ringLabelX}
                  y={ringLabelY + 2.5}
                  textAnchor="middle"
                  fontSize="8.5"
                  fill="hsl(var(--muted-foreground))"
                  className="font-mono font-medium select-none pointer-events-none"
                >
                  {Math.round(ringValue * 100)}%
                </text>
              </g>
            )
          })}

          {/* Radial Spokes and Outer Axis Labels */}
          {axes.map((axis, i) => {
            const outerCoord = getCoordinates(i, 1.0)
            const isAxisHovered = hoveredAxisIndex === i || hoveredPoint?.code === axis.code
            const isAligned = axis.userScore >= axis.targetScore

            // Precise non-overlapping coordinates matching CompetencyRadarChart
            const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2
            const cosAngle = Math.cos(angle)
            const sinAngle = Math.sin(angle)

            let textAnchor: 'middle' | 'start' | 'end' = 'middle'
            let titleX = centerX
            let titleY = centerY
            let scoreX = centerX
            let scoreY = centerY

            if (Math.abs(cosAngle) <= 0.25) {
              // Vertical axis (pure top or pure bottom)
              textAnchor = 'middle'
              titleX = outerCoord.x
              scoreX = outerCoord.x

              if (sinAngle < 0) {
                // Pure top (index 0 - Realistic): Score on top, Title below
                scoreY = outerCoord.y - 28
                titleY = outerCoord.y - 13
              } else {
                // Pure bottom (index 3 - Social): Title below vertex, Score below Title
                titleY = outerCoord.y + 18
                scoreY = outerCoord.y + 33
              }
            } else if (cosAngle > 0.25) {
              // Right side (index 1 - Investigative, index 2 - Artistic)
              textAnchor = 'start'
              const anchorX = outerCoord.x + 14
              titleX = anchorX
              scoreX = anchorX

              if (sinAngle < 0) {
                // Top-right (index 1): Score on top, Title below
                scoreY = outerCoord.y - 10
                titleY = outerCoord.y + 6
              } else {
                // Bottom-right (index 2): Title on top, Score below
                titleY = outerCoord.y + 5
                scoreY = outerCoord.y + 21
              }
            } else {
              // Left side (index 4 - Enterprising, index 5 - Conventional)
              textAnchor = 'end'
              const anchorX = outerCoord.x - 14
              titleX = anchorX
              scoreX = anchorX

              if (sinAngle < 0) {
                // Top-left (index 5): Score on top, Title below
                scoreY = outerCoord.y - 10
                titleY = outerCoord.y + 6
              } else {
                // Bottom-left (index 4): Title on top, Score below
                titleY = outerCoord.y + 5
                scoreY = outerCoord.y + 21
              }
            }

            return (
              <g
                key={axis.code}
                onMouseEnter={() => setHoveredAxisIndex(i)}
                onMouseLeave={() => setHoveredAxisIndex(null)}
                className="cursor-pointer"
              >
                {/* Radial Line */}
                <line
                  x1={centerX}
                  y1={centerY}
                  x2={outerCoord.x}
                  y2={outerCoord.y}
                  stroke={isAxisHovered ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                  strokeWidth={isAxisHovered ? '1.8' : '1.2'}
                />

                {/* Outer Axis Title Label */}
                <text
                  x={titleX}
                  y={titleY}
                  textAnchor={textAnchor}
                  fontSize="11"
                  fontWeight={isAxisHovered ? '700' : '600'}
                  fill={isAxisHovered ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'}
                >
                  {axis.label}
                </text>

                {/* Micro Score Pill */}
                <text
                  x={scoreX}
                  y={scoreY}
                  textAnchor={textAnchor}
                  fontSize="9.5"
                  className="font-mono font-semibold"
                  fill={isAligned ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))'}
                >
                  {axis.userScore}% / {axis.targetScore}%
                </text>
              </g>
            )
          })}

          {/* LAYER 1: Role Target Benchmark Polygon */}
          {showRoleBenchmark && (
            <g>
              <polygon
                points={targetPolygonPoints}
                fill="hsl(var(--secondary) / 0.35)"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="1.8"
                strokeDasharray="4,4"
                className="opacity-80"
              />
              {axes.map((axis, i) => {
                const { x, y } = getCoordinates(i, axis.targetScore / 100)
                return (
                  <circle
                    key={`target-${axis.code}`}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill="hsl(var(--card))"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1.5"
                  />
                )
              })}
            </g>
          )}

          {/* LAYER 2: User Profile Polygon */}
          {showUserProfile && (
            <g>
              <polygon
                points={userPolygonPoints}
                fill="hsl(var(--primary) / 0.24)"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                className="filter drop-shadow-xs"
              />
              {axes.map((axis, i) => {
                const { x, y } = getCoordinates(i, axis.userScore / 100)

                return (
                  <circle
                    key={`user-${axis.code}`}
                    cx={x}
                    cy={y}
                    r="4.5"
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--card))"
                    strokeWidth="2"
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredPoint({
                        code: axis.code,
                        label: axis.label,
                        fullName: axis.fullName,
                        description: axis.description,
                        userScore: axis.userScore,
                        targetScore: axis.targetScore,
                        x,
                        y,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                )
              })}
            </g>
          )}

          {/* Interactive In-SVG Vertex Tooltip matching CompetencyRadarChart */}
          {hoveredPoint && (
            <g
              transform={`translate(${hoveredPoint.x}, ${
                hoveredPoint.y < 100 ? hoveredPoint.y + 40 : hoveredPoint.y - 15
              })`}
              className="pointer-events-none"
            >
              <rect
                x="-95"
                y="-55"
                width="190"
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
                {hoveredPoint.fullName}
              </text>
              <text
                x="0"
                y="-25"
                textAnchor="middle"
                fontSize="10"
                fill="hsl(var(--muted-foreground))"
              >
                Score: <tspan fontWeight="700" fill="hsl(var(--primary))">{hoveredPoint.userScore}%</tspan> | Target: <tspan fontWeight="600" fill="hsl(var(--foreground))">{hoveredPoint.targetScore}%</tspan>
              </text>
              <text
                x="0"
                y="-12"
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="600"
                fill={
                  hoveredPoint.userScore >= hoveredPoint.targetScore
                    ? 'hsl(var(--success))'
                    : 'hsl(var(--destructive))'
                }
              >
                {hoveredPoint.userScore >= hoveredPoint.targetScore
                  ? 'Aligned with role traits'
                  : `Trait Gap: -${hoveredPoint.targetScore - hoveredPoint.userScore}% benchmark`}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Layer Toggles & Color Legend matching CompetencyRadarChart */}
      <div className="flex flex-wrap items-center justify-between gap-3 w-full pt-1 px-1 text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowUserProfile(!showUserProfile)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              showUserProfile
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : 'border-border bg-muted/60 text-muted-foreground line-through'
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />
            <span>{language === 'vi' ? 'Hồ sơ RIASEC của bạn' : 'My RIASEC Profile'}</span>
            {showUserProfile ? <Eye size={13} className="text-primary" /> : <EyeOff size={13} />}
          </button>

          <button
            type="button"
            onClick={() => setShowRoleBenchmark(!showRoleBenchmark)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              showRoleBenchmark
                ? 'border-border bg-muted/70 text-foreground'
                : 'border-border bg-muted/40 text-muted-foreground line-through'
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-muted-foreground inline-block" />
            <span>{language === 'vi' ? 'Chuẩn vai trò (O*NET)' : 'Role Target Benchmark'}</span>
            {showRoleBenchmark ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
        </div>

        {/* Alignment summary stats badge matching CompetencyRadarChart */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground font-mono">
            {language === 'vi' ? 'Độ tương thích:' : 'Role Fit:'}{' '}
            <strong className="text-primary font-bold">{roleData.fitPercentage}%</strong>
          </span>
          <span className="text-border">&bull;</span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 size={13} className="text-success" />
            <strong className="text-foreground">{alignedCount}</strong>{' '}
            {language === 'vi' ? 'Đạt chuẩn' : 'Aligned'}
          </span>
          <span className="text-border">&bull;</span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <AlertTriangle size={13} className="text-warning" />
            <strong className="text-foreground">{gapsCount}</strong>{' '}
            {language === 'vi' ? 'Khoảng trống' : 'Gaps'}
          </span>
        </div>
      </div>
    </div>
  )
}
