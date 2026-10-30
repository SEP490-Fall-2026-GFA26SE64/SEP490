package com.adaptlearngraph.assessment.adaptive.attempt.infrastructure;

import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.AdaptiveAttemptContextPort;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** TMP-REQ002-08: own-Employee result/history read model with an explicit safe projection. */
public final class JdbcAdaptiveAttemptResultQuery implements Results {
    private static final String QUERY = """
            SELECT attempt.attempt_id,attempt.occupation_id,version.occupation_name_snapshot,
                attempt.attempt_purpose,attempt.target_role_id,role.role_name_snapshot,attempt.state,
                attempt.scope_policy,version.scope_policy AS blueprint_scope_policy,
                attempt.completion_reason,attempt.started_at,attempt.finished_at,attempt.replaces_attempt_id,
                successor.attempt_id AS replacement_attempt_id,result.raw_score,
                skill.micro_skill_id,skill_name.micro_skill_name_snapshot,skill_name.snapshot_variants,skill.mastery,skill.confidence_label
            FROM platform.baseline_adaptive_attempt attempt
            JOIN platform.account employee
              ON employee.account_id=attempt.learner_id AND employee.organization_id=attempt.organization_id
             AND employee.active
            JOIN platform.baseline_adaptive_blueprint_version version
              ON version.blueprint_id=attempt.blueprint_id AND version.version=attempt.blueprint_version
             AND version.organization_id=attempt.organization_id AND version.occupation_id=attempt.occupation_id
            LEFT JOIN platform.baseline_adaptive_blueprint_role role
              ON role.blueprint_id=attempt.blueprint_id AND role.blueprint_version=attempt.blueprint_version
             AND role.role_id=attempt.target_role_id
            LEFT JOIN platform.baseline_attempt_result result
              ON result.attempt_id=attempt.attempt_id AND result.organization_id=attempt.organization_id
            LEFT JOIN platform.baseline_adaptive_attempt successor
              ON successor.replaces_attempt_id=attempt.attempt_id
             AND successor.organization_id=attempt.organization_id AND successor.learner_id=attempt.learner_id
            LEFT JOIN platform.baseline_attempt_skill_result skill
              ON skill.attempt_id=attempt.attempt_id AND skill.organization_id=attempt.organization_id
            LEFT JOIN LATERAL (
                SELECT MIN(snapshot.micro_skill_name_snapshot) AS micro_skill_name_snapshot,
                    count(DISTINCT (snapshot.micro_skill_name_snapshot,snapshot.catalog_version)) AS snapshot_variants
                FROM platform.baseline_adaptive_blueprint_skill snapshot
                WHERE snapshot.blueprint_id=attempt.blueprint_id
                  AND snapshot.blueprint_version=attempt.blueprint_version
                  AND snapshot.micro_skill_id=skill.micro_skill_id
                  AND (attempt.scope_policy='FULL_OCCUPATION_V2' OR attempt.target_role_id IS NULL OR snapshot.role_id=attempt.target_role_id)
            ) skill_name ON skill.micro_skill_id IS NOT NULL
            WHERE attempt.organization_id=:org AND attempt.learner_id=:learner
              AND ((:workspaceIdentity AND EXISTS(
                SELECT 1 FROM platform.organization_membership membership
                JOIN platform.organization_membership_role role USING(membership_id)
                WHERE membership.account_id=employee.account_id AND membership.organization_id=:org
                  AND membership.active AND role.role_code='EMPLOYEE'))
                OR (NOT :workspaceIdentity AND EXISTS(
                SELECT 1 FROM platform.account_role role
                WHERE role.account_id=employee.account_id AND role.role_code='EMPLOYEE')))
              AND attempt.state<>'IN_PROGRESS'
            """;
    private final NamedParameterJdbcTemplate jdbc;
    private final AdaptiveAttemptContextPort context;
    private final boolean workspaceIdentity;

    public JdbcAdaptiveAttemptResultQuery(NamedParameterJdbcTemplate jdbc, AdaptiveAttemptContextPort context) {
        this(jdbc, context, false);
    }
    public JdbcAdaptiveAttemptResultQuery(NamedParameterJdbcTemplate jdbc, AdaptiveAttemptContextPort context, boolean workspaceIdentity) {
        this.jdbc = Objects.requireNonNull(jdbc);
        this.context = Objects.requireNonNull(context);
        this.workspaceIdentity = workspaceIdentity;
    }

    @Override public List<Result> history() {
        var employee = context.requireEmployee();
        var results = read(scope(employee), " ORDER BY attempt.finished_at DESC,attempt.attempt_id,skill.micro_skill_id");
        if (results.isEmpty()) context.requireEmployee();
        return results;
    }

    @Override public Result result(UUID attemptId) {
        if (attemptId == null || attemptId.equals(new UUID(0, 0))) throw new Failure(Code.INVALID_REQUEST);
        var employee = context.requireEmployee();
        var results = read(scope(employee).addValue("id", attemptId),
                " AND attempt.attempt_id=:id ORDER BY skill.micro_skill_id");
        if (results.isEmpty()) {
            context.requireEmployee();
            throw new Failure(Code.NOT_FOUND);
        }
        return results.getFirst();
    }

    private List<Result> read(MapSqlParameterSource parameters, String suffix) {
        var rows = new LinkedHashMap<UUID, MutableResult>();
        jdbc.query(QUERY + suffix, parameters.addValue("workspaceIdentity", workspaceIdentity), result -> {
            UUID id = result.getObject("attempt_id", UUID.class);
            var view = rows.get(id);
            if (view == null) {
                view = new MutableResult(header(result));
                rows.put(id, view);
            }
            String skillId = result.getString("micro_skill_id");
            if (skillId != null) {
                String name = result.getString("micro_skill_name_snapshot");
                if (name == null || name.isBlank() || view.header.assessmentScope() == AssessmentScope.OCCUPATION
                        && result.getLong("snapshot_variants") != 1) throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
                view.skills.add(new SkillResult(skillId, name, result.getBigDecimal("mastery"), result.getString("confidence_label")));
            }
        });
        return rows.values().stream().map(MutableResult::view).toList();
    }

    private static Header header(ResultSet result) throws SQLException {
        String policy = result.getString("scope_policy");
        if (!Objects.equals(policy, result.getString("blueprint_scope_policy"))
                || policy != null && !policy.equals("FULL_OCCUPATION_V2")) throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
        AssessmentScope publicScope = policy != null ? AssessmentScope.OCCUPATION
                : result.getString("target_role_id") == null ? AssessmentScope.EARLIER_OCCUPATION : AssessmentScope.EARLIER_ROLE;
        return new Header(result.getObject("attempt_id", UUID.class), result.getString("occupation_id"),
                result.getString("occupation_name_snapshot"), result.getString("attempt_purpose"),
                result.getString("target_role_id"), result.getString("role_name_snapshot"), result.getString("state"),
                result.getString("completion_reason"), result.getTimestamp("started_at").toInstant(),
                result.getTimestamp("finished_at").toInstant(), result.getObject("replaces_attempt_id", UUID.class),
                result.getObject("replacement_attempt_id", UUID.class), result.getBigDecimal("raw_score"), publicScope);
    }

    private static MapSqlParameterSource scope(AdaptiveAttemptContextPort.Employee employee) {
        return new MapSqlParameterSource("org", employee.organizationId()).addValue("learner", employee.learnerId());
    }

    private record Header(UUID attemptId, String occupationId, String occupationName, String purpose,
                          String roleId, String roleName, String state, String completionReason,
                          Instant startedAt, Instant completedAt, UUID replacesAttemptId,
                          UUID replacementAttemptId, BigDecimal rawScore, AssessmentScope assessmentScope) {
        Result view(List<SkillResult> skills) {
            return new Result(attemptId, occupationId, occupationName, purpose, roleId, roleName, state,
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
