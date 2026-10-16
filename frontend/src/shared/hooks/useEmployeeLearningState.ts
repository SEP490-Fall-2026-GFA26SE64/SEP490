import * as React from 'react'

export interface NotificationItem {
  id: string
  title: string
  message: string
  timestamp: string
  type: 'role_assigned' | 'role_replaced' | 'role_selected' | 'deadline_revised' | 'diagnostic_required' | 'diagnostic_passed' | 'general'
  isRead: boolean
  actionUrl?: string
  actionLabel?: string
}

export interface HistoricalSkill {
  skillKey: string
  skillName: string
  macroCode?: string
  completedAt: string
  masteryScore: number
  status: 'completed' | 'superseded'
}

export interface HistoricalTargetRole {
  roleKey: string
  roleTitle: string
  version: string
  completedAt: string
  readinessScore: number
  diagnosticScore: number
  status: 'completed' | 'superseded'
  description: string
}

export interface TrackedSkillItem {
  skillName: string
  macroCode?: string | null
  level?: string | null
  assignedAt?: string | null
}

export interface LearnerLearningProfile {
  learnerId: string
  learnerName: string
  currentRole: string
  targetRole: string | null
  targetRoleVersion: string | null
  targetSkill?: string | null
  targetSkillMacroCode?: string | null
  targetSkillLevel?: string | null
  targetSkillAssignedAt?: string | null
  trackedSkills?: TrackedSkillItem[]
  deadline: string | null
  assignedByManager: string | null
  assignedAt: string | null
  targetReadinessScore: number
  diagnosticCompleted: boolean
  diagnosticScore: number | null
  diagnosticCompletedAt: string | null
  managerNotes?: string
  selectedViewType?: 'role' | 'skill'
  selectedViewRoleKey: string // 'active' or key of historical role
  selectedViewSkillKey?: string // 'active' or key of historical skill
  previousRoles: HistoricalTargetRole[]
  previousSkills?: HistoricalSkill[]
}

// Backwards compatibility alias
export type EmployeeLearningProfile = LearnerLearningProfile

import { getActiveCompany, getActiveCompanyId } from '../stores/companyStore'

const getProfileStorageKey = () => `alg_learner_learning_profile_${getActiveCompanyId()}`
const getNotifsStorageKey = () => `alg_learner_notifications_${getActiveCompanyId()}`
const SYNC_EVENT_NAME = 'alg_learning_state_sync'

const INITIAL_PROFILE: LearnerLearningProfile = {
  learnerId: 'lrn-101',
  learnerName: 'Alex Chen',
  currentRole: 'Junior Graph Developer',
  targetRole: 'AI Knowledge Architect',
  targetRoleVersion: 'v2.4 (Latest - Published 2026-06)',
  targetSkill: 'Google Gemini & LLM Orchestration',
  targetSkillMacroCode: 'GEN_AI',
  targetSkillLevel: 'Advanced',
  targetSkillAssignedAt: '2026-09-25',
  trackedSkills: [
    {
      skillName: 'Google Gemini & LLM Orchestration',
      macroCode: 'GEN_AI',
      level: 'Advanced',
      assignedAt: '2026-09-25',
    },
  ],
  deadline: '2026-12-31',
  assignedByManager: 'Self-Selected (Learner)',
  assignedAt: '2026-09-21 09:30',
  targetReadinessScore: 85,
  diagnosticCompleted: false, // Diagnostic lock rule is enforced
  diagnosticScore: null,
  diagnosticCompletedAt: null,
  managerNotes: 'Targeting Q4 2026 promotion. Complete diagnostic assessment to calibrate GNN and ontology pathway.',
  selectedViewType: 'role',
  selectedViewRoleKey: 'active',
  selectedViewSkillKey: 'active',
  previousRoles: [
    {
      roleKey: 'junior-graph-developer',
      roleTitle: 'Junior Graph Developer',
      version: 'v1.4',
      completedAt: '2026-06-15',
      readinessScore: 94,
      diagnosticScore: 90,
      status: 'completed',
      description: 'Foundations of graph querying, Cypher semantics, and RDF triples.',
    },
    {
      roleKey: 'data-engineer-track',
      roleTitle: 'Data Engineer (Knowledge Pipelines)',
      version: 'v2.0',
      completedAt: '2026-08-10',
      readinessScore: 88,
      diagnosticScore: 86,
      status: 'superseded',
      description: 'Distributed persistence, transactional CQRS, and Kafka outbox synchronizations.',
    },
  ],
  previousSkills: [
    {
      skillKey: 'python-core',
      skillName: 'Python Core & Async Semantics',
      macroCode: 'PROGRAMMING_LANGUAGES',
      completedAt: '2026-06-15',
      masteryScore: 95,
      status: 'completed',
    },
    {
      skillKey: 'cypher-basics',
      skillName: 'Neo4j Cypher Fundamentals',
      macroCode: 'GRAPH_DATABASE',
      completedAt: '2026-08-10',
      masteryScore: 92,
      status: 'completed',
    },
  ],
}

const getInitialProfileForActiveCompany = (): LearnerLearningProfile => {
  const comp = getActiveCompany()
  if (comp.id === 'comp-technova') {
    return INITIAL_PROFILE
  }

  const employee = (comp.users || []).find((u) => u.role === 'Employee') || comp.users[0]
  const targetRole = employee?.targetRole || (comp.targetRoles[0]?.title ?? null)
  const targetRoleVersion = comp.targetRoles[0]?.version ? `v${comp.targetRoles[0].version}` : (targetRole ? 'v1.0' : null)

  return {
    learnerId: employee ? employee.id : `lrn-${Date.now()}`,
    learnerName: employee ? employee.name : 'Learner',
    currentRole: employee ? (employee.department || 'Associate') : 'Associate',
    targetRole,
    targetRoleVersion,
    targetSkill: null,
    targetSkillMacroCode: null,
    targetSkillLevel: null,
    targetSkillAssignedAt: null,
    trackedSkills: [],
    deadline: targetRole ? '2026-12-31' : null,
    assignedByManager: 'Self-Selected (Learner)',
    assignedAt: new Date().toISOString().slice(0, 10),
    targetReadinessScore: 80,
    diagnosticCompleted: false,
    diagnosticScore: null,
    diagnosticCompletedAt: null,
    managerNotes: targetRole ? `Calibrate your competency pathway for ${targetRole}.` : 'Select a target role to begin learning.',
    selectedViewType: 'role',
    selectedViewRoleKey: 'active',
    selectedViewSkillKey: 'active',
    previousRoles: [],
    previousSkills: [],
  }
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Active Target Role Calibrated',
    message: 'Review your selected target role and complete the diagnostic quiz to calibrate your pathway.',
    timestamp: '2 hours ago',
    type: 'role_selected',
    isRead: false,
    actionUrl: '/employee/assessment?diagnostic=true',
    actionLabel: 'Take Diagnostic Quiz',
  },
  {
    id: 'notif-2',
    title: 'Baseline Diagnostic Assessment Recommended',
    message: 'Your active Interactive Roadmap and upcoming module evaluations will be calibrated once you complete the diagnostic quiz.',
    timestamp: '1 hour ago',
    type: 'diagnostic_required',
    isRead: false,
    actionUrl: '/employee/assessment?diagnostic=true',
    actionLabel: 'Start Diagnostic',
  },
]

export function useEmployeeLearningState() {
  const [profile, setProfileState] = React.useState<LearnerLearningProfile>(() => {
    try {
      const key = getProfileStorageKey()
      const saved = localStorage.getItem(key)
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return getInitialProfileForActiveCompany()
  })

  const [notifications, setNotificationsState] = React.useState<NotificationItem[]>(() => {
    try {
      const key = getNotifsStorageKey()
      const saved = localStorage.getItem(key)
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return INITIAL_NOTIFICATIONS
  })

  const saveProfile = React.useCallback((newProfile: LearnerLearningProfile) => {
    setProfileState(newProfile)
    try {
      const key = getProfileStorageKey()
      localStorage.setItem(key, JSON.stringify(newProfile))
      window.dispatchEvent(new Event(SYNC_EVENT_NAME))
    } catch {
      // ignore
    }
  }, [])

  const saveNotifications = React.useCallback((newNotifs: NotificationItem[]) => {
    setNotificationsState(newNotifs)
    try {
      const key = getNotifsStorageKey()
      localStorage.setItem(key, JSON.stringify(newNotifs))
      window.dispatchEvent(new Event(SYNC_EVENT_NAME))
    } catch {
      // ignore
    }
  }, [])

  // Listen to cross-component sync and company change events
  React.useEffect(() => {
    const handleSync = () => {
      try {
        const profKey = getProfileStorageKey()
        const savedProf = localStorage.getItem(profKey)
        if (savedProf) {
          setProfileState(JSON.parse(savedProf))
        } else {
          setProfileState(getInitialProfileForActiveCompany())
        }

        const notifsKey = getNotifsStorageKey()
        const savedNotifs = localStorage.getItem(notifsKey)
        if (savedNotifs) {
          setNotificationsState(JSON.parse(savedNotifs))
        } else {
          setNotificationsState(INITIAL_NOTIFICATIONS)
        }
      } catch {
        // ignore
      }
    }

    window.addEventListener(SYNC_EVENT_NAME, handleSync)
    window.addEventListener('active_company_changed', handleSync)
    window.addEventListener('companies_updated', handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync)
      window.removeEventListener('active_company_changed', handleSync)
      window.removeEventListener('companies_updated', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  // Check if current view is active role or historical completed role
  const isViewingActiveRole = profile.selectedViewRoleKey === 'active'

  // If viewing active role, check if diagnostic is pending
  const isLearningLocked = isViewingActiveRole
    ? Boolean(profile.targetRole && !profile.diagnosticCompleted)
    : false

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length

  // Select target role view (Active vs Previous Completed)
  const setSelectedViewRoleKey = React.useCallback(
    (roleKey: string) => {
      saveProfile({
        ...profile,
        selectedViewRoleKey: roleKey,
      })
    },
    [profile, saveProfile]
  )

  // LEARNER SELF-SELECTION OF TARGET ROLE
  const selectTargetRole = React.useCallback(
    (
      roleTitle: string,
      version: string,
      deadline = '2026-12-31',
      benchmark = 85,
      notes = ''
    ) => {
      // Archive current active target role into previous roles if changing
      let updatedPreviousRoles = profile.previousRoles
      if (profile.targetRole && profile.targetRole !== roleTitle) {
        const archiveEntry: HistoricalTargetRole = {
          roleKey: `superseded-${Date.now()}`,
          roleTitle: profile.targetRole,
          version: profile.targetRoleVersion || 'v1.0',
          completedAt: new Date().toISOString().split('T')[0],
          readinessScore: 78,
          diagnosticScore: profile.diagnosticScore || 85,
          status: 'superseded',
          description: `Switched goal to ${roleTitle} on ${new Date().toLocaleDateString()}`,
        }
        updatedPreviousRoles = [archiveEntry, ...profile.previousRoles]
      }

      const updatedProfile: LearnerLearningProfile = {
        ...profile,
        targetRole: roleTitle,
        targetRoleVersion: version,
        deadline,
        assignedByManager: 'Self-Selected (Learner)',
        assignedAt: new Date().toLocaleString([], {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        targetReadinessScore: benchmark,
        managerNotes: notes,
        diagnosticCompleted: false, // Baseline diagnostic calibrates new role
        diagnosticScore: null,
        selectedViewRoleKey: 'active',
        previousRoles: updatedPreviousRoles,
      }
      saveProfile(updatedProfile)

      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: `Target Role Activated: ${roleTitle}`,
        message: `You selected "${roleTitle} (${version})" with target readiness ${benchmark}% and deadline ${deadline}. Complete the diagnostic quiz to calibrate your roadmap.`,
        timestamp: 'Just now',
        type: 'role_selected',
        isRead: false,
        actionUrl: '/employee/pathway',
        actionLabel: 'View Pathway',
      }
      saveNotifications([newNotif, ...notifications])
    },
    [profile, notifications, saveProfile, saveNotifications]
  )

  // UC-04 Backwards-compatibility
  const assignInitialTargetRole = React.useCallback(
    (roleTitle: string, version: string, deadline: string, benchmark = 85, notes = '') => {
      selectTargetRole(roleTitle, version, deadline, benchmark, notes)
    },
    [selectTargetRole]
  )

  // UC-05 Backwards-compatibility
  const replaceTargetRole = React.useCallback(
    (
      newRoleTitle: string,
      newVersion: string,
      newDeadline: string,
      benchmark = 85,
      replacementReason: string
    ) => {
      selectTargetRole(newRoleTitle, newVersion, newDeadline, benchmark, replacementReason)
    },
    [selectTargetRole]
  )

  // UC-06 Backwards-compatibility
  const reviseAssignmentDeadline = React.useCallback(
    (newDeadline: string, revisionReason: string) => {
      const prevDeadline = profile.deadline || 'None'
      const updatedProfile: LearnerLearningProfile = {
        ...profile,
        deadline: newDeadline,
      }
      saveProfile(updatedProfile)

      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: `Target Deadline Updated: ${newDeadline}`,
        message: `Updated target deadline from ${prevDeadline} to ${newDeadline}. (${revisionReason})`,
        timestamp: 'Just now',
        type: 'deadline_revised',
        isRead: false,
        actionUrl: '/employee/pathway',
        actionLabel: 'View Pathway',
      }
      saveNotifications([newNotif, ...notifications])
    },
    [profile, notifications, saveProfile, saveNotifications]
  )

  // Complete diagnostic assessment
  const completeDiagnosticAssessment = React.useCallback(
    (score: number) => {
      const updatedProfile: LearnerLearningProfile = {
        ...profile,
        diagnosticCompleted: true,
        diagnosticScore: score,
        diagnosticCompletedAt: new Date().toLocaleString([], {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
      }
      saveProfile(updatedProfile)

      const successNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: 'Diagnostic Assessment Passed! 🎉',
        message: `Score: ${score}%. Your Adaptive Learning Pathway, Interactive Roadmap, and upcoming evaluations are now calibrated and active!`,
        timestamp: 'Just now',
        type: 'diagnostic_passed',
        isRead: false,
        actionUrl: '/employee/pathway',
        actionLabel: 'View Roadmap',
      }
      saveNotifications([successNotif, ...notifications.map((n) => ({ ...n, isRead: true }))])
    },
    [profile, notifications, saveProfile, saveNotifications]
  )

  // Quick reset toggle for evaluator testing
  const toggleDiagnosticLock = React.useCallback(() => {
    const nextState = !profile.diagnosticCompleted
    saveProfile({
      ...profile,
      diagnosticCompleted: nextState,
      diagnosticScore: nextState ? 90 : null,
    })
  }, [profile, saveProfile])

  const markNotificationRead = React.useCallback(
    (id: string) => {
      saveNotifications(notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    },
    [notifications, saveNotifications]
  )

  const markAllNotificationsRead = React.useCallback(() => {
    saveNotifications(notifications.map((n) => ({ ...n, isRead: true })))
  }, [notifications, saveNotifications])

  const removeTargetRole = React.useCallback(() => {
    const updatedProfile: LearnerLearningProfile = {
      ...profile,
      targetRole: null,
      targetRoleVersion: null,
      deadline: null,
      assignedByManager: null,
      assignedAt: null,
      diagnosticCompleted: false,
      diagnosticScore: null,
      diagnosticCompletedAt: null,
    }
    saveProfile(updatedProfile)
  }, [profile, saveProfile])

  const setSelectedViewType = React.useCallback(
    (type: 'role' | 'skill') => {
      saveProfile({
        ...profile,
        selectedViewType: type,
      })
    },
    [profile, saveProfile]
  )

  const setSelectedViewSkillKey = React.useCallback(
    (skillKey: string) => {
      saveProfile({
        ...profile,
        selectedViewSkillKey: skillKey,
      })
    },
    [profile, saveProfile]
  )

  const getTrackedSkills = React.useCallback((): TrackedSkillItem[] => {
    if (profile.trackedSkills && profile.trackedSkills.length > 0) {
      return profile.trackedSkills
    }
    if (profile.targetSkill) {
      return [
        {
          skillName: profile.targetSkill,
          macroCode: profile.targetSkillMacroCode || null,
          level: profile.targetSkillLevel || 'Intermediate',
          assignedAt: profile.targetSkillAssignedAt || new Date().toISOString().split('T')[0],
        },
      ]
    }
    return []
  }, [profile])

  const trackedSkills = getTrackedSkills()

  const isSkillTracked = React.useCallback(
    (skillName: string): boolean => {
      return getTrackedSkills().some(
        (s) => s.skillName.toLowerCase() === skillName.toLowerCase()
      )
    },
    [getTrackedSkills]
  )

  const trackSkill = React.useCallback(
    (skillName: string, macroCode?: string, level = 'Intermediate') => {
      const currentList = getTrackedSkills()
      if (currentList.some((s) => s.skillName.toLowerCase() === skillName.toLowerCase())) {
        return
      }
      const newItem: TrackedSkillItem = {
        skillName,
        macroCode: macroCode || null,
        level,
        assignedAt: new Date().toISOString().split('T')[0],
      }
      const updatedList = [newItem, ...currentList]
      saveProfile({
        ...profile,
        targetSkill: skillName,
        targetSkillMacroCode: macroCode || null,
        targetSkillLevel: level,
        targetSkillAssignedAt: newItem.assignedAt,
        trackedSkills: updatedList,
      })
    },
    [profile, getTrackedSkills, saveProfile]
  )

  const untrackSkill = React.useCallback(
    (skillName: string) => {
      const currentList = getTrackedSkills()
      const updatedList = currentList.filter(
        (s) => s.skillName.toLowerCase() !== skillName.toLowerCase()
      )
      const nextActive = updatedList[0]
      saveProfile({
        ...profile,
        targetSkill: nextActive ? nextActive.skillName : null,
        targetSkillMacroCode: nextActive ? nextActive.macroCode : null,
        targetSkillLevel: nextActive ? nextActive.level : null,
        targetSkillAssignedAt: nextActive ? nextActive.assignedAt : null,
        trackedSkills: updatedList,
      })
    },
    [profile, getTrackedSkills, saveProfile]
  )

  const clearTargetSkill = React.useCallback(() => {
    saveProfile({
      ...profile,
      targetSkill: null,
      targetSkillMacroCode: null,
      targetSkillLevel: null,
      targetSkillAssignedAt: null,
      trackedSkills: [],
      selectedViewSkillKey: 'active',
    })
  }, [profile, saveProfile])

  const selectTargetSkill = React.useCallback(
    (skillName: string, macroCode?: string, level = 'Intermediate') => {
      trackSkill(skillName, macroCode, level)
    },
    [trackSkill]
  )

  const clearNotifications = React.useCallback(() => {
    saveNotifications([])
  }, [saveNotifications])

  return {
    profile,
    trackedSkills,
    isSkillTracked,
    trackSkill,
    untrackSkill,
    clearTrackedSkills: clearTargetSkill,
    isViewingActiveRole,
    isLearningLocked,
    unreadNotificationCount,
    notifications,
    setSelectedViewRoleKey,
    setSelectedViewType,
    setSelectedViewSkillKey,
    selectTargetRole,
    selectTargetSkill,
    clearTargetSkill,
    assignInitialTargetRole,
    replaceTargetRole,
    reviseAssignmentDeadline,
    removeTargetRole,
    completeDiagnosticAssessment,
    toggleDiagnosticLock,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
  }
}

// Backwards compatibility alias
export const useLearnerLearningState = useEmployeeLearningState
