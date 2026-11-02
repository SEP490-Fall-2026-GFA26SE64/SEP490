package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AdaptiveAttempt;
import com.adaptlearngraph.entities.AuditEventEntity;
import com.adaptlearngraph.entities.BaselineAttemptResultEntity;
import com.adaptlearngraph.entities.BaselineAttemptSkillResultEntity;
import com.adaptlearngraph.entities.BaselineMasteryEvidenceEntity;
import com.adaptlearngraph.entities.OutboxEventEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

/** TMP-REQ002-08: durable initialization handoff only; REQ-041 consumption remains unintegrated. */
public final class JpaAdaptiveAttemptOutcome implements AdaptiveAttemptOutcomePort {
    public static final String EVENT_TYPE = "BASELINE_MASTERY_INITIALIZED_V1";
    public static final String POLICY_EVENT_TYPE = "BASELINE_MASTERY_INITIALIZED_V2";
    private static final TypeReference<Map<String, Object>> PAYLOAD = new TypeReference<>() {};
    private final AdaptiveAttemptRepositories data;
    private final ObjectMapper mapper;
    private final AdaptiveAttemptStore store;
    public JpaAdaptiveAttemptOutcome(AdaptiveAttemptRepositories data, ObjectMapper mapper, AdaptiveAttemptStore store) {
        this.data = data; this.mapper = mapper; this.store = store;
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
        AdaptiveAttemptJpa.read(() -> {
            var scope = next.scope();
            var id = next.id();
            var reason = next.completionReason().orElseThrow().name();
            var time = next.finishedAt().orElseThrow();
            if (next.masteryProducing()) {
                var event = UUID.randomUUID();
                var pins = next.snapshot().blueprint().pins();
                var payload = new TreeMap<String, Object>();
                payload.put("attemptId", next.id()); payload.put("organizationId", next.scope().organizationId());
                payload.put("learnerId", next.scope().learnerId()); payload.put("occupationId", next.scope().occupationId());
                payload.put("sourceRevision", next.revision()); payload.put("completedAt", next.finishedAt().orElseThrow());
                payload.put("pins", pins); payload.put("initializationOnly", true);
                var policy=next.snapshot().assessmentPolicy();
                policy.ifPresent(pin->{payload.put("schemaVersion",2);payload.put("assessmentPolicy",Map.of("versionId",pin.versionId(),"hash",pin.hash(),"values",pin.values()));});
                payload.put("skills", new TreeMap<>(completion.skills()));
                var document = document(json(payload));
                UUID policyVersion = policy.map(p -> p.versionId()).orElse(null);
                String policyHash = policy.map(p -> p.hash()).orElse(null);
                data.outbox().insert(new OutboxEventEntity(event, policy.isPresent() ? POLICY_EVENT_TYPE : EVENT_TYPE, id, next.revision(),
                        document, id, time));
                data.results().insert(new BaselineAttemptResultEntity(id, scope.organizationId(), completion.answered(), completion.correct(),
                        next.status().name(), time, event));
                completion.skills().forEach((skill, value) -> {
                    data.skillResults().insert(new BaselineAttemptSkillResultEntity(id, scope.organizationId(), skill, value.theta(),
                            value.standardError(), value.estimatedMastery(), value.mastery(), value.confidence(),
                            pins.masteryMappingVersionId(), time, policyVersion, policyHash));
                    data.evidence().insert(new BaselineMasteryEvidenceEntity(id, scope.organizationId(), scope.learnerId(),
                            scope.occupationId(), skill, pins.modelVersionId(), pins.masteryMappingVersionId(), pins.parameterSetId(),
                            value.theta(), value.standardError(), value.estimatedMastery(), value.mastery(), value.confidence(), event, time,
                            policyVersion, policyHash));
                });
            }
            data.audit().insert(new AuditEventEntity(UUID.randomUUID(), null, "adaptive-baseline",
                    next.masteryProducing() ? "ADAPTIVE_BASELINE_FINALIZED" : "ADAPTIVE_BASELINE_INVALIDATED", id,
                    Long.toString(next.revision()), time, reason, id));
            return null;
        });
    }
    private String json(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (JsonProcessingException failure) { throw new IllegalStateException("Cannot serialize baseline handoff"); }
    }
    /** Exact JSON tree of the serialized handoff; decimals stay BigDecimal so the stored jsonb numbers are unchanged. */
    private Map<String, Object> document(String value) {
        try { return mapper.readerFor(PAYLOAD).with(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readValue(value); }
        catch (JsonProcessingException failure) { throw new IllegalStateException("Cannot serialize baseline handoff"); }
    }
}
