package com.adaptlearngraph.assessment.adaptive.attempt.infrastructure;

import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.AdaptiveAttemptStore;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt.Scope;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;

/** SQL split of the single concrete store, not another bean/adapter. All child access checks ownership. */
abstract class JdbcAdaptiveAttemptState implements AdaptiveAttemptStore {
    protected final AdaptiveAttemptJdbc db;
    protected final AdaptiveAttemptRows rows;
    JdbcAdaptiveAttemptState(AdaptiveAttemptJdbc db, AdaptiveAttemptRows rows) { this.db = db; this.rows = rows; }

    protected void initialize(AdaptiveAttempt attempt, List<SkillState> skills, PresentedItem first) {
        if (skills.size() != attempt.snapshot().microSkillIds().size()
                || !skills.stream().map(SkillState::microSkillId).collect(Collectors.toSet()).equals(attempt.snapshot().microSkillIds())
                || skills.stream().anyMatch(skill -> skill.answeredCount() != 0 || skill.revision() != 1)) {
            throw new IllegalArgumentException("Initial skill state must cover the pinned scope without responses");
        }
        var params = db.owned(attempt.scope(), attempt.id());
        for (SkillState skill : skills) db.jdbc.update("""
                INSERT INTO platform.baseline_attempt_skill_state
                SELECT (jsonb_populate_record(NULL::platform.baseline_attempt_skill_state, CAST(:skill AS jsonb)
                    || jsonb_build_object('attempt_id',CAST(:id AS uuid),'organization_id',CAST(:org AS uuid)))).*
                """, params.addValue("skill", rows.write(skill)));
        db.jdbc.batchUpdate("""
                INSERT INTO platform.baseline_attempt_pool_item(attempt_id,organization_id,parameter_set_id,item_version_id,micro_skill_id)
                VALUES (:id,:org,:parameters,:item,:skill)
                """, attempt.snapshot().itemSkills().entrySet().stream().map(item -> AdaptiveAttemptJdbc.key(attempt.scope(), attempt.id())
                .addValue("parameters", attempt.snapshot().blueprint().pins().parameterSetId())
                .addValue("item", item.getKey()).addValue("skill", item.getValue())).toArray(MapSqlParameterSource[]::new));
        present(attempt.scope(), attempt.id(), first);
    }

    private void present(Scope scope, UUID id, PresentedItem item) {
        db.jdbc.update("""
                INSERT INTO platform.baseline_attempt_item
                SELECT (jsonb_populate_record(NULL::platform.baseline_attempt_item, CAST(:item AS jsonb)
                    || jsonb_build_object('attempt_id',CAST(:id AS uuid),'organization_id',CAST(:org AS uuid)))).*
                """, db.owned(scope, id).addValue("item", rows.write(item)));
    }

    @Override public Progress progress(Scope scope, UUID id) {
        return rows.read(db.jdbc.queryForObject("""
                SELECT jsonb_build_object(
                  'items',(SELECT coalesce(jsonb_agg(to_jsonb(i)-ARRAY['attempt_id','organization_id'] ORDER BY position),'[]')
                    FROM platform.baseline_attempt_item i WHERE organization_id=:org AND attempt_id=:id),
                  'responses',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY position),'[]') FROM (
                    SELECT position,response_payload->>'selectedOptionId' AS selected_option_id,is_correct AS correct,accepted_at,request_id
                    FROM platform.baseline_attempt_response WHERE organization_id=:org AND attempt_id=:id) r),
                  'skills',(SELECT coalesce(jsonb_agg(to_jsonb(s)-ARRAY['attempt_id','organization_id'] ORDER BY micro_skill_id),'[]')
                    FROM platform.baseline_attempt_skill_state s WHERE organization_id=:org AND attempt_id=:id))::text
                """, db.owned(scope, id), String.class), Progress.class);
    }

    @Override public void accept(Scope scope, UUID id, Response response, long expectedSkillRevision,
                                 SkillState next, Optional<PresentedItem> nextItem) {
        if (!response.acceptedAt().equals(next.updatedAt())) throw new IllegalArgumentException("Response and estimate need one server observation");
        var params = db.owned(scope, id).addValue("position", response.position()).addValue("option", response.selectedOptionId())
                .addValue("correct", response.correct()).addValue("accepted", AdaptiveAttemptRows.time(response.acceptedAt()))
                .addValue("request", response.requestId()).addValue("skill", next.microSkillId()).addValue("expected", expectedSkillRevision)
                .addValue("theta", next.theta()).addValue("se", next.standardError()).addValue("information", next.testInformation())
                .addValue("count", next.answeredCount()).addValue("revision", next.revision());
        AdaptiveAttemptJdbc.changed(db.jdbc.update("""
                INSERT INTO platform.baseline_attempt_response(attempt_id,organization_id,position,response_payload,is_correct,accepted_at,request_id)
                SELECT :id,:org,:position,jsonb_build_object('selectedOptionId',CAST(:option AS text)),:correct,:accepted,:request
                FROM platform.baseline_attempt_item WHERE attempt_id=:id AND organization_id=:org AND position=:position AND micro_skill_id=:skill
                """, params));
        AdaptiveAttemptJdbc.changed(db.jdbc.update("""
                UPDATE platform.baseline_attempt_skill_state SET theta=:theta,standard_error=:se,test_information=:information,
                    answered_count=:count,revision=:revision,updated_at=:accepted
                WHERE attempt_id=:id AND organization_id=:org AND micro_skill_id=:skill AND revision=:expected
                """, params));
        nextItem.ifPresent(item -> present(scope, id, item));
    }
}
