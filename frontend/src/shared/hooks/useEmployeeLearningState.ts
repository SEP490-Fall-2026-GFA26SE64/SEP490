import * as React from 'react'

export interface NotificationItem {
  id: string
  title: string
  message: string
  timestamp: string
  type: 'role_assigned' | 'role_replaced' | 'deadline_revised' | 'diagnostic_required' | 'diagnostic_passed' | 'general'
  isRead: boolean
  actionUrl?: string
  actionLabel?: string
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

export interface EmployeeLearningProfile {
  employeeId: string
  employeeName: string
  currentRole: string
  targetRole: string | null
  targetRoleVersion: string | null
  deadline: string | null
  assignedByManager: string | null
  assignedAt: string | null
  targetReadinessScore: number
  diagnosticCompleted: boolean
  diagnosticScore: number | null
  diagnosticCompletedAt: string | null
  managerNotes?: string
  selectedViewRoleKey: string // 'active' or key of historical role
  previousRoles: HistoricalTargetRole[]
}

const STORAGE_KEY_PROFILE = 'alg_employee_learning_profile_v2'
const STORAGE_KEY_NOTIFS = 'alg_employee_notifications_v2'
const SYNC_EVENT_NAME = 'alg_learning_state_sync'

const INITIAL_PROFILE: EmployeeLearningProfile = {
  employeeId: 'emp-101',
  employeeName: 'Alex Chen',
  currentRole: 'Junior Graph Developer',
  targetRole: 'AI Knowledge Architect',
  targetRoleVersion: 'v2.4 (Latest - Published 2026-06)',
  deadline: '2026-12-31',
  assignedByManager: 'David Miller (Line Manager)',
  assignedAt: '2026-09-21 09:30',
  targetReadinessScore: 85,
  diagnosticCompleted: false, // Initially false for active role so diagnostic lock rule is enforced!
  diagnosticScore: null,
  diagnosticCompletedAt: null,
  managerNotes: 'Targeting Q4 2026 promotion. Complete diagnostic assessment to calibrate GNN and ontology pathway.',
  selectedViewRoleKey: 'active',
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
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'New Target Role Assigned (UC-04)',
    message: 'David Miller assigned you "AI Knowledge Architect (v2.4)" with deadline 2026-12-31. Complete baseline diagnostic to unlock your pathway.',
    timestamp: '2 hours ago',
    type: 'role_assigned',
    isRead: false,
    actionUrl: '/employee/assessment?diagnostic=true',
    actionLabel: 'Take Diagnostic Quiz',
  },
  {
    id: 'notif-2',
    title: 'Mandatory Diagnostic Assessment Required',
    message: 'Your active Interactive Roadmap and upcoming module evaluations are locked until you complete the baseline diagnostic quiz.',
    timestamp: '1 hour ago',
    type: 'diagnostic_required',
    isRead: false,
    actionUrl: '/employee/assessment?diagnostic=true',
    actionLabel: 'Start Diagnostic',
  },
]

export function useEmployeeLearningState() {
  const [profile, setProfileState] = React.useState<EmployeeLearningProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILE)
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return INITIAL_PROFILE
  })

  const [notifications, setNotificationsState] = React.useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTIFS)
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return INITIAL_NOTIFICATIONS
  })

  const saveProfile = React.useCallback((newProfile: EmployeeLearningProfile) => {
    setProfileState(newProfile)
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(newProfile))
      window.dispatchEvent(new Event(SYNC_EVENT_NAME))
    } catch {
      // ignore
    }
  }, [])

  const saveNotifications = React.useCallback((newNotifs: NotificationItem[]) => {
    setNotificationsState(newNotifs)
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(newNotifs))
      window.dispatchEvent(new Event(SYNC_EVENT_NAME))
    } catch {
      // ignore
    }
  }, [])

  // Listen to cross-component sync events
  React.useEffect(() => {
    const handleSync = () => {
      try {
        const savedProf = localStorage.getItem(STORAGE_KEY_PROFILE)
        if (savedProf) setProfileState(JSON.parse(savedProf))
        const savedNotifs = localStorage.getItem(STORAGE_KEY_NOTIFS)
        if (savedNotifs) setNotificationsState(JSON.parse(savedNotifs))
      } catch {
        // ignore
      }
    }
    window.addEventListener(SYNC_EVENT_NAME, handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  // Check if current view is active role or historical completed role
  const isViewingActiveRole = profile.selectedViewRoleKey === 'active'

  // If viewing active role, check if diagnostic is pending
  // If viewing a previous role, it is unlocked because baseline was already done!
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

  // UC-04: Assign Initial Target Role
  const assignInitialTargetRole = React.useCallback(
    (roleTitle: string, version: string, deadline: string, benchmark = 85, notes = '') => {
      const updatedProfile: EmployeeLearningProfile = {
        ...profile,
        targetRole: roleTitle,
        targetRoleVersion: version,
        deadline,
        assignedByManager: 'David Miller (Line Manager)',
        assignedAt: new Date().toLocaleString([], {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        targetReadinessScore: benchmark,
        managerNotes: notes,
        diagnosticCompleted: false, // Mandatory diagnostic required
        diagnosticScore: null,
        selectedViewRoleKey: 'active',
      }
      saveProfile(updatedProfile)

      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: `Initial Target Role Assigned: ${roleTitle} (${version})`,
        message: `Your Line Manager assigned target role "${roleTitle}" with deadline ${deadline}. Complete baseline diagnostic to unlock your roadmap.`,
        timestamp: 'Just now',
        type: 'role_assigned',
        isRead: false,
        actionUrl: '/employee/assessment?diagnostic=true',
        actionLabel: 'Take Diagnostic Quiz',
      }
      saveNotifications([newNotif, ...notifications])
    },
    [profile, notifications, saveProfile, saveNotifications]
  )

  // UC-05: Replace Target Role (Closes active assignment, archives to previous, supersedes pathway, requires reason, rechecks diagnostic)
  const replaceTargetRole = React.useCallback(
    (
      newRoleTitle: string,
      newVersion: string,
      newDeadline: string,
      benchmark = 85,
      replacementReason: string
    ) => {
      // Archive current role into previousRoles
      const archivedRole: HistoricalTargetRole | null = profile.targetRole
        ? {
            roleKey: `superseded-${Date.now()}`,
            roleTitle: profile.targetRole,
            version: profile.targetRoleVersion || 'v1.0',
            completedAt: new Date().toISOString().split('T')[0],
            readinessScore: 78,
            diagnosticScore: profile.diagnosticScore || 85,
            status: 'superseded',
            description: `Superseded on ${new Date().toLocaleDateString()}. Reason: ${replacementReason}`,
          }
        : null

      const updatedProfile: EmployeeLearningProfile = {
        ...profile,
        targetRole: newRoleTitle,
        targetRoleVersion: newVersion,
        deadline: newDeadline,
        assignedByManager: 'David Miller (Line Manager)',
        assignedAt: new Date().toLocaleString([], {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        targetReadinessScore: benchmark,
        diagnosticCompleted: false, // Relocked for diagnostic recheck!
        diagnosticScore: null,
        selectedViewRoleKey: 'active',
        previousRoles: archivedRole
          ? [archivedRole, ...profile.previousRoles]
          : profile.previousRoles,
      }
      saveProfile(updatedProfile)

      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: `Target Role Replaced: ${newRoleTitle} (${newVersion})`,
        message: `Your Line Manager superseded your previous target role. Reason: "${replacementReason}". Retaining verified evidence; please complete diagnostic coverage recheck.`,
        timestamp: 'Just now',
        type: 'role_replaced',
        isRead: false,
        actionUrl: '/employee/assessment?diagnostic=true',
        actionLabel: 'Recheck Diagnostic',
      }
      saveNotifications([newNotif, ...notifications])
    },
    [profile, notifications, saveProfile, saveNotifications]
  )

  // UC-06: Revise Assignment Deadline (Retains target role version, updates deadline, requires reason)
  const reviseAssignmentDeadline = React.useCallback(
    (newDeadline: string, revisionReason: string) => {
      const prevDeadline = profile.deadline || 'None'
      const updatedProfile: EmployeeLearningProfile = {
        ...profile,
        deadline: newDeadline,
      }
      saveProfile(updatedProfile)

      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: `Assignment Deadline Revised: ${newDeadline}`,
        message: `Your Line Manager updated target deadline from ${prevDeadline} to ${newDeadline}. Reason: "${revisionReason}". Target role version retained.`,
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
      const updatedProfile: EmployeeLearningProfile = {
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
        message: `Score: ${score}%. Your Adaptive Learning Pathway, Interactive Roadmap, and upcoming evaluations are now unlocked!`,
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
    const updatedProfile: EmployeeLearningProfile = {
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

  const clearNotifications = React.useCallback(() => {
    saveNotifications([])
  }, [saveNotifications])

  return {
    profile,
    isViewingActiveRole,
    isLearningLocked,
    unreadNotificationCount,
    notifications,
    setSelectedViewRoleKey,
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
