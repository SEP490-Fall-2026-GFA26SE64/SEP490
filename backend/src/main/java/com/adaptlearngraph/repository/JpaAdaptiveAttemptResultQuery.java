package com.adaptlearngraph.repository;

import com.adaptlearngraph.services.AdaptiveAttemptUseCase.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

/** TMP-REQ002-08: own-Employee result/history read model with an explicit safe projection. */
public final class JpaAdaptiveAttemptResultQuery implements Results {
    private static final int ATTEMPT_ID = 0, ORGANIZATION_ID = 1, JOB_POSITION_ID = 2, JOB_POSITION_NAME = 3, POLICY_MODE = 4,
            POLICY_VERSION = 5, POLICY_HASH = 6, POLICY_SNAPSHOT = 7, SKILL_POLICY_VERSION = 8, SKILL_POLICY_HASH = 9, PURPOSE = 10,
            TARGET_ROLE_ID = 11, ROLE_NAME = 12, STATE = 13, SCOPE_POLICY = 14, BLUEPRINT_SCOPE_POLICY = 15, COMPLETION_REASON = 16,
            STARTED_AT = 17, FINISHED_AT = 18, REPLACES_ATTEMPT_ID = 19, REPLACEMENT_ATTEMPT_ID = 20, RAW_SCORE = 21, MICRO_SKILL_ID = 22,
            MICRO_SKILL_NAME = 23, SNAPSHOT_VARIANTS = 24, MASTERY = 25, CONFIDENCE_LABEL = 26;
    private final BaselineAttemptResultJpaRepository results;
    private final com.fasterxml.jackson.databind.ObjectMapper policyJson=new com.fasterxml.jackson.databind.ObjectMapper();
    private final AdaptiveAttemptContextPort context;
    private final boolean workspaceIdentity;

    public JpaAdaptiveAttemptResultQuery(BaselineAttemptResultJpaRepository results, AdaptiveAttemptContextPort context) {
        this(results, context, false);
    }
    public JpaAdaptiveAttemptResultQuery(BaselineAttemptResultJpaRepository results, AdaptiveAttemptContextPort context, boolean workspaceIdentity) {
        this.results = Objects.requireNonNull(results);
        this.context = Objects.requireNonNull(context);
        this.workspaceIdentity = workspaceIdentity;
    }

    @Override public List<Result> history() {
        var employee = context.requireEmployee();
        var found = read(results.history(employee.organizationId(), employee.learnerId(), workspaceIdentity));
        if (found.isEmpty()) context.requireEmployee();
        return found;
    }

    @Override public Result result(UUID attemptId) {
        if (attemptId == null || attemptId.equals(new UUID(0, 0))) throw new Failure(Code.INVALID_REQUEST);
        var employee = context.requireEmployee();
        var found = read(results.result(employee.organizationId(), employee.learnerId(), workspaceIdentity, attemptId));
        if (found.isEmpty()) {
            context.requireEmployee();
            throw new Failure(Code.NOT_FOUND);
        }
        return found.getFirst();
    }

    private List<Result> read(List<Object[]> found) {
        var rows = new LinkedHashMap<UUID, MutableResult>();
        for (Object[] result : found) {
            try{
                var policy=com.adaptlearngraph.helper.AssessmentPolicyProvenance.read((String) result[POLICY_MODE],(UUID) result[POLICY_VERSION],
                        (String) result[POLICY_HASH],(String) result[POLICY_SNAPSHOT],policyJson,(UUID) result[ORGANIZATION_ID]);
                if(result[MICRO_SKILL_ID]!=null && (!Objects.equals(result[SKILL_POLICY_VERSION],policy.map(p->p.versionId()).orElse(null))
                        || !Objects.equals(result[SKILL_POLICY_HASH],policy.map(p->p.hash()).orElse(null))))throw new IllegalStateException("Result policy mismatch");
            }catch(Exception invalid){throw new Failure(Code.DEPENDENCY_UNAVAILABLE);}
            UUID id = (UUID) result[ATTEMPT_ID];
            var view = rows.get(id);
            if (view == null) {
                view = new MutableResult(header(result));
                rows.put(id, view);
            }
            String skillId = (String) result[MICRO_SKILL_ID];
            if (skillId != null) {
                String name = (String) result[MICRO_SKILL_NAME];
                long variants = result[SNAPSHOT_VARIANTS] == null ? 0 : ((Number) result[SNAPSHOT_VARIANTS]).longValue();
                if (name == null || name.isBlank() || view.header.assessmentScope() == AssessmentScope.JOB_POSITION
                        && variants != 1) throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
                view.skills.add(new SkillResult(skillId, name, (BigDecimal) result[MASTERY], (String) result[CONFIDENCE_LABEL]));
            }
        }
        return rows.values().stream().map(MutableResult::view).toList();
    }

    private static Header header(Object[] result) {
        String policy = (String) result[SCOPE_POLICY];
        if (!Objects.equals(policy, result[BLUEPRINT_SCOPE_POLICY])
                || policy != null && !policy.equals("FULL_JOB_POSITION_V2")) throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
        AssessmentScope publicScope = policy != null ? AssessmentScope.JOB_POSITION
                : result[TARGET_ROLE_ID] == null ? AssessmentScope.EARLIER_JOB_POSITION : AssessmentScope.EARLIER_ROLE;
        return new Header((UUID) result[ATTEMPT_ID], (String) result[JOB_POSITION_ID],
                (String) result[JOB_POSITION_NAME], (String) result[PURPOSE],
                (String) result[TARGET_ROLE_ID], (String) result[ROLE_NAME], (String) result[STATE],
                (String) result[COMPLETION_REASON], AdaptiveAttemptRows.instant(result[STARTED_AT]),
                Objects.requireNonNull(AdaptiveAttemptRows.instant(result[FINISHED_AT])), (UUID) result[REPLACES_ATTEMPT_ID],
                (UUID) result[REPLACEMENT_ATTEMPT_ID], (BigDecimal) result[RAW_SCORE], publicScope);
    }

    private record Header(UUID attemptId, String jobPositionId, String jobPositionName, String purpose,
                          String roleId, String roleName, String state, String completionReason,
                          Instant startedAt, Instant completedAt, UUID replacesAttemptId,
                          UUID replacementAttemptId, BigDecimal rawScore, AssessmentScope assessmentScope) {
        Result view(List<SkillResult> skills) {
            return new Result(attemptId, jobPositionId, jobPositionName, purpose, roleId, roleName, state,
                    completionReason, startedAt, completedAt, replacesAttemptId, replacementAttemptId, rawScore, skills, assessmentScope);
        }
    }

    private static final class MutableResult {
        private final Header header;
        private final List<SkillResult> skills = new ArrayList<>();
        private MutableResult(Header header) { this.header = header; }
        private Result view() {
            boolean invalidated = "INVALIDATED".equals(header.state());
            if (invalidated && (header.rawScore() != null || !skills.isEmpty())
                    || !invalidated && (header.rawScore() == null || skills.isEmpty())) throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
            return header.view(skills);
        }
    }
}
