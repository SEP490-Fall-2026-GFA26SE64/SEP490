package com.adaptlearngraph.assessment.adaptive.attempt.infrastructure;

import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.util.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** TMP-REQ002-08: durable initialization handoff only; REQ-041 consumption remains unintegrated. */
public final class JdbcAdaptiveAttemptOutcome implements AdaptiveAttemptOutcomePort {
    public static final String EVENT_TYPE = "BASELINE_MASTERY_INITIALIZED_V1";
    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final AdaptiveAttemptStore store;
    public JdbcAdaptiveAttemptOutcome(NamedParameterJdbcTemplate jdbc, ObjectMapper mapper, AdaptiveAttemptStore store) {
        this.jdbc = jdbc; this.mapper = mapper; this.store = store;
    }
    @Override public void persist(Completion completion) {
        var next = completion.terminal();
        // The shared store enforces its thread-bound scope/transaction and locks this exact parent.
        var current = store.find(next.scope(), next.id()).orElseThrow();
        var progress = store.progress(next.scope(), next.id());
        if (current.status() != AdaptiveAttempt.Status.IN_PROGRESS || next.revision() != current.revision() + 1
                || next.status() == AdaptiveAttempt.Status.IN_PROGRESS || completion.answered() != progress.responses().size()
                || completion.correct() != progress.responses().stream().filter(AdaptiveAttemptStore.Response::correct).count()
                || (next.masteryProducing() ? !completion.skills().keySet().equals(current.snapshot().microSkillIds())
                    : !completion.skills().isEmpty())) throw new IllegalStateException("Invalid owned completion");
        AdaptiveAttemptJdbc.read(() -> {
            var params = AdaptiveAttemptJdbc.key(next.scope(), next.id()).addValue("revision", next.revision())
                    .addValue("state", next.status().name()).addValue("reason", next.completionReason().orElseThrow().name())
                    .addValue("time", Timestamp.from(next.finishedAt().orElseThrow()))
                    .addValue("answered", completion.answered()).addValue("correct", completion.correct());
            if (next.masteryProducing()) {
                var event = UUID.randomUUID();
                var pins = next.snapshot().blueprint().pins();
                var payload = new TreeMap<String, Object>();
                payload.put("attemptId", next.id()); payload.put("organizationId", next.scope().organizationId());
                payload.put("learnerId", next.scope().learnerId()); payload.put("occupationId", next.scope().occupationId());
                payload.put("sourceRevision", next.revision()); payload.put("completedAt", next.finishedAt().orElseThrow());
                payload.put("pins", pins); payload.put("initializationOnly", true);
                payload.put("skills", new TreeMap<>(completion.skills()));
                params.addValue("event", event).addValue("type", EVENT_TYPE).addValue("payload", json(payload))
                        .addValue("model", pins.modelVersionId()).addValue("mapping", pins.masteryMappingVersionId())
                        .addValue("parameters", pins.parameterSetId());
                jdbc.update("""
                        INSERT INTO platform.outbox_event(event_id,event_type,aggregate_id,source_revision,payload,correlation_id,created_at)
                        VALUES (:event,:type,:id,:revision,CAST(:payload AS jsonb),:id,:time)
                        """, params);
                jdbc.update("""
                        INSERT INTO platform.baseline_attempt_result(attempt_id,organization_id,answered_count,correct_count,result_status,scored_at,mastery_event_id)
                        VALUES (:id,:org,:answered,:correct,:state,:time,:event)
                        """, params);
                completion.skills().forEach((skill, value) -> {
                    params.addValue("skill", skill).addValue("theta", value.theta()).addValue("se", value.standardError())
                            .addValue("point", value.estimatedMastery()).addValue("mastery", value.mastery()).addValue("confidence", value.confidence());
                    jdbc.update("""
                            INSERT INTO platform.baseline_attempt_skill_result(attempt_id,organization_id,micro_skill_id,theta,standard_error,
                                estimated_mastery,mastery,confidence_label,mastery_mapping_version_id,finalized_at)
                            VALUES (:id,:org,:skill,:theta,:se,:point,:mastery,:confidence,:mapping,:time)
                            """, params);
                    jdbc.update("""
                            INSERT INTO platform.baseline_mastery_evidence(attempt_id,organization_id,learner_id,occupation_id,micro_skill_id,
                                model_version_id,mastery_mapping_version_id,parameter_set_id,theta,standard_error,estimated_mastery,
                                mastery,confidence_label,mastery_event_id,emitted_at)
                            VALUES (:id,:org,:learner,:occupation,:skill,:model,:mapping,:parameters,:theta,:se,:point,:mastery,:confidence,:event,:time)
                            """, params);
                });
            }
            jdbc.update("""
                    INSERT INTO platform.audit_event(audit_event_id,service_name,action,resource_id,resource_revision,occurred_at,outcome,correlation_id)
                    VALUES (:audit,'adaptive-baseline',:action,:id,:version,:time,:reason,:id)
                    """, params.addValue("audit", UUID.randomUUID()).addValue("version", Long.toString(next.revision()))
                    .addValue("action", next.masteryProducing() ? "ADAPTIVE_BASELINE_FINALIZED" : "ADAPTIVE_BASELINE_INVALIDATED"));
            return null;
        });
    }
    private String json(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (JsonProcessingException failure) { throw new IllegalStateException("Cannot serialize baseline handoff"); }
    }
}
