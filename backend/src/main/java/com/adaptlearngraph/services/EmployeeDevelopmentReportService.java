package com.adaptlearngraph.services;

import com.adaptlearngraph.exception.InitialPathwayFailure;
import com.adaptlearngraph.repository.CurrentRoleSelectionStore;
import com.adaptlearngraph.repository.DevelopmentReportJpaRepository;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * FR-04.07 read model: an L&D Manager monitors same-organization employees. Every read is a projection over the
 * existing selection, pathway, assessment and evidence owners; it never finalizes attempts or writes learner state.
 */
public final class EmployeeDevelopmentReportService {
    /** Resolves the trusted L&D Manager's own organization or fails closed. */
    public interface Managers { UUID requireOrganization(); }

    public record Target(String roleId,String roleName,String levelId,String levelName,Instant selectedAt) {}
    public record PathwaySummary(UUID requestId,String roleName,String levelName,String generationStatus,String reviewStatus,String timingState,
            Instant startedAt,Instant deadlineAt,Instant completedAt,long requiredSteps,long fulfilledSteps,long bypassedSteps,
            long inProgressSteps,long expertSteps,long supplementSteps) {}
    public record AssessmentSummary(long attempts,long finalized,long inProgress,long baselineFinalized,long passedGroups,long totalGroups,Instant lastAssessmentAt) {
        static final AssessmentSummary NONE=new AssessmentSummary(0,0,0,0,0,0,null);
    }
    public record EvidenceSummary(long achievedLevels,long needReview,long completedModules,Instant lastAchievedAt) {}
    public record Employee(UUID accountId,String fullName,String email,boolean active,UUID departmentId,String departmentName,
            UUID jobPositionId,String jobPositionName,Target target,PathwaySummary pathway,AssessmentSummary assessments,
            EvidenceSummary evidence,Instant lastActivityAt) {}
    public record Report(Instant generatedAt,List<Employee> employees) {}
    public record GroupOutcome(UUID groupId,String skillId,String skillName,String knowledgeLevel,String role,int correctCount,int totalCount,
            boolean passed,boolean vetoTriggered) {}
    public record AttemptOutcome(UUID attemptId,String purpose,String state,UUID selectionId,long selectionRevision,String roleName,String levelName,
            UUID stepId,String moduleId,Integer moduleRevision,Instant startedAt,Instant deadlineAt,Instant finishedAt,String finishReason,
            List<GroupOutcome> groups) {}
    public record Achievement(String skillId,String skillName,String knowledgeLevel,String skillVersion,String sourceKind,Instant achievedAt) {}
    public record Section<T>(T data,String unavailableCode) {
        static <T> Section<T> of(T data){return new Section<>(data,null);}
        static <T> Section<T> unavailable(String code){return new Section<>(null,code);}
    }
    public record Detail(Instant generatedAt,Employee employee,Section<RequirementPathwayAdmissionService.Overview> competency,
            Section<RequirementPathwayView.View> pathway,List<AttemptOutcome> assessments,List<Achievement> achievements) {}

    static final String EMPLOYEE_ROLE="EMPLOYEE";
    static final int ATTEMPT_LIMIT=100;
    private static final org.slf4j.Logger LOG=org.slf4j.LoggerFactory.getLogger(EmployeeDevelopmentReportService.class);
    private final Managers managers;private final SubscriptionWorkspaceStore workspaces;private final CurrentRoleSelectionStore selections;
    private final DevelopmentReportJpaRepository reports;private final RequirementPathwayView pathways;private final RequirementPathwayAdmissionService admission;

    public EmployeeDevelopmentReportService(Managers managers,SubscriptionWorkspaceStore workspaces,CurrentRoleSelectionStore selections,
            DevelopmentReportJpaRepository reports,RequirementPathwayView pathways,RequirementPathwayAdmissionService admission) {
        this.managers=Objects.requireNonNull(managers);this.workspaces=Objects.requireNonNull(workspaces);this.selections=Objects.requireNonNull(selections);
        this.reports=Objects.requireNonNull(reports);this.pathways=Objects.requireNonNull(pathways);this.admission=Objects.requireNonNull(admission);
    }

    public Report employees() {
        UUID organization=managers.requireOrganization();
        var members=employeeMembers(organization);
        var paths=latestBy(reports.pathways(organization),DevelopmentReportJpaRepository.PathwayRow::getLearnerId);
        var assessments=index(reports.assessmentStats(organization),DevelopmentReportJpaRepository.AssessmentStats::getLearnerId);
        var evidence=index(reports.evidenceStats(organization),DevelopmentReportJpaRepository.EvidenceStats::getLearnerId);
        var modules=new HashMap<String,DevelopmentReportJpaRepository.ModuleStats>();
        reports.moduleStats(organization).forEach(row->modules.put(row.getLearnerId(),row));
        var employees=members.stream().map(member->employee(organization,member,paths.get(member.accountId()),assessments.get(member.accountId()),
                evidence.get(member.accountId()),modules.get(member.accountId().toString()))).toList();
        return new Report(Instant.now(),employees);
    }

    public Detail employee(UUID accountId) {
        if(accountId==null)throw new InitialPathwayFailure(400,"INVALID_REQUEST");
        UUID organization=managers.requireOrganization();
        var member=employeeMembers(organization).stream().filter(item->item.accountId().equals(accountId)).findFirst()
                .orElseThrow(()->new InitialPathwayFailure(404,"EMPLOYEE_NOT_FOUND"));
        var path=latestBy(reports.pathways(organization).stream().filter(row->accountId.equals(row.getLearnerId())).toList(),
                DevelopmentReportJpaRepository.PathwayRow::getLearnerId).get(accountId);
        var assessmentStats=reports.assessmentStats(organization).stream().filter(row->accountId.equals(row.getLearnerId())).findFirst().orElse(null);
        var evidenceStats=reports.evidenceStats(organization).stream().filter(row->accountId.equals(row.getLearnerId())).findFirst().orElse(null);
        var moduleStats=reports.moduleStats(organization).stream().filter(row->accountId.toString().equals(row.getLearnerId())).findFirst().orElse(null);
        var summary=employee(organization,member,path,assessmentStats,evidenceStats,moduleStats);
        Section<RequirementPathwayAdmissionService.Overview> competency=summary.target()==null?Section.unavailable("TARGET_NOT_SELECTED")
                :guarded("competency",accountId,()->admission.overviewFor(organization,accountId).map(Section::of).orElseGet(()->Section.unavailable("TARGET_NOT_SELECTED")));
        Section<RequirementPathwayView.View> pathway=guarded("pathway",accountId,
                ()->pathways.currentFor(organization,accountId).map(Section::of).orElseGet(()->Section.unavailable("PATHWAY_NOT_STARTED")));
        return new Detail(Instant.now(),summary,competency,pathway,attempts(organization,accountId),achievements(organization,accountId));
    }

    private List<SubscriptionWorkspaceStore.Member> employeeMembers(UUID organization) {
        return workspaces.members(organization).stream().filter(member->member.roles()!=null && member.roles().contains(EMPLOYEE_ROLE))
                .sorted(Comparator.comparing((SubscriptionWorkspaceStore.Member member)->Objects.requireNonNullElse(member.fullName(),""),String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(member->member.accountId().toString())).toList();
    }

    private Employee employee(UUID organization,SubscriptionWorkspaceStore.Member member,DevelopmentReportJpaRepository.PathwayRow path,
            DevelopmentReportJpaRepository.AssessmentStats assessment,DevelopmentReportJpaRepository.EvidenceStats evidence,
            DevelopmentReportJpaRepository.ModuleStats modules) {
        var target=target(organization,member.accountId());
        var pathway=path==null?null:new PathwaySummary(path.getRequestId(),path.getRoleName(),path.getLevelName(),path.getGenerationStatus(),
                path.getReviewStatus(),path.getTimingState(),path.getStartedAt(),path.getDeadlineAt(),path.getCompletedAt(),path.getRequiredSteps(),
                path.getFulfilledSteps(),path.getBypassedSteps(),path.getInProgressSteps(),path.getExpertSteps(),path.getSupplementSteps());
        var assessments=assessment==null?AssessmentSummary.NONE:new AssessmentSummary(assessment.getAttempts(),assessment.getFinalized(),
                assessment.getInProgress(),assessment.getBaselineFinalized(),assessment.getPassedGroups(),assessment.getTotalGroups(),assessment.getLastAssessmentAt());
        var proof=new EvidenceSummary(evidence==null?0:evidence.getAchieved(),evidence==null?0:evidence.getNeedReview(),
                modules==null?0:modules.getCompletedModules(),evidence==null?null:evidence.getLastAchievedAt());
        var activity=latest(assessments.lastAssessmentAt(),proof.lastAchievedAt(),modules==null?null:modules.getLastCompletedAt(),
                pathway==null?null:pathway.startedAt(),target==null?null:target.selectedAt());
        return new Employee(member.accountId(),member.fullName(),member.email(),member.active() && member.accountActive(),member.departmentId(),
                member.departmentName(),member.jobPositionReferenceId(),member.jobPositionName(),target,pathway,assessments,proof,activity);
    }

    private Target target(UUID organization,UUID learner) {
        try {
            return selections.current(new RoleBaselineFlow.Actor(organization,learner)).map(selection->{
                var role=selection.role();
                String levelName=role.levels()==null?null:role.levels().stream().filter(level->level.id().equals(selection.levelId()))
                        .map(RoleBaselineFlow.Level::name).findFirst().orElse(null);
                return new Target(role.id(),role.name(),selection.levelId(),levelName,selection.selectedAt());
            }).orElse(null);
        }catch(RuntimeException unreadable) {
            LOG.warn("Development report could not read a target selection ({})",unreadable.getClass().getSimpleName());
            return null;
        }
    }

    private List<AttemptOutcome> attempts(UUID organization,UUID learner) {
        var rows=reports.attempts(organization,learner,ATTEMPT_LIMIT);
        var finalized=rows.stream().filter(row->"FINALIZED".equals(row.getState())).map(DevelopmentReportJpaRepository.AttemptRow::getAttemptId).toList();
        Map<UUID,List<GroupOutcome>> groups=finalized.isEmpty()?Map.of():reports.groups(organization,learner,finalized).stream()
                .collect(Collectors.groupingBy(DevelopmentReportJpaRepository.GroupRow::getAttemptId,LinkedHashMap::new,Collectors.mapping(row->
                        new GroupOutcome(row.getGroupId(),row.getSkillId(),row.getSkillName(),row.getKnowledgeLevel(),row.getRole(),row.getCorrectCount(),
                                row.getTotalCount(),row.getPassed(),row.getVetoTriggered()),Collectors.toList())));
        return rows.stream().map(row->new AttemptOutcome(row.getAttemptId(),row.getPurpose(),row.getState(),row.getSelectionId(),row.getSelectionRevision(),
                row.getRoleName(),row.getLevelName(),uuid(row.getStepId()),blank(row.getModuleId()),integer(row.getModuleRevision()),row.getStartedAt(),
                row.getDeadlineAt(),row.getFinishedAt(),row.getFinishReason(),List.copyOf(groups.getOrDefault(row.getAttemptId(),List.of())))).toList();
    }

    private List<Achievement> achievements(UUID organization,UUID learner) {
        return reports.evidence(organization,learner).stream().map(row->new Achievement(row.getSkillId(),row.getSkillName(),row.getKnowledgeLevel(),
                row.getSkillVersion(),row.getSourceKind(),row.getAchievedAt())).sorted(Comparator.comparing(Achievement::achievedAt).reversed()).toList();
    }

    /** One unreadable owner hides only its own section; the report states the reason rather than fabricating values. */
    private <T> Section<T> guarded(String section,UUID learner,java.util.function.Supplier<Section<T>> read) {
        try {return read.get();}
        catch(InitialPathwayFailure failure) {
            if(failure.status()==401 || failure.status()==403)throw failure;
            return Section.unavailable(failure.code());
        }catch(RuntimeException failure) {
            LOG.warn("Development report section {} unavailable ({})",section,failure.getClass().getSimpleName());
            return Section.unavailable("DEPENDENCY_UNAVAILABLE");
        }
    }

    private static <T> Map<UUID,T> index(List<T> rows,Function<T,UUID> key) {
        var result=new HashMap<UUID,T>();rows.forEach(row->result.put(key.apply(row),row));return result;
    }
    /** Rows arrive newest first per learner; keep the first, matching the single-current-pathway invariant. */
    private static <T> Map<UUID,T> latestBy(List<T> rows,Function<T,UUID> key) {
        var result=new LinkedHashMap<UUID,T>();rows.forEach(row->result.putIfAbsent(key.apply(row),row));return result;
    }
    private static Instant latest(Instant... values) {
        return Arrays.stream(values).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
    }
    private static UUID uuid(String value) {
        try{return value==null || value.isBlank()?null:UUID.fromString(value);}catch(IllegalArgumentException invalid){return null;}
    }
    private static Integer integer(String value) {
        try{return value==null || value.isBlank()?null:Integer.valueOf(value);}catch(NumberFormatException invalid){return null;}
    }
    private static String blank(String value){return value==null || value.isBlank()?null:value;}
}
