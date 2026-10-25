package com.adaptlearngraph.assessment.application;

import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentDraftUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentManagementUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.BlueprintDraft;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore.CloneCandidate;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentManagementStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentManagementStore.CloseWorkingRevision;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentManagementStore.CommandReceipt;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentManagementStore.NewWorkingRevision;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentManagementStore.SaveWorkingRevision;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentManagementStore.Transition;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentManagementStore.Update;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentManagementStore.WorkingRevisionRecord;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentManagementStore.WorkingRevisionState;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.ActorPort;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort;
import com.adaptlearngraph.assessment.application.port.out.BaselineOccupationCatalogPort;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentLifecycle;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentLifecycle.PolicyViolation;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.ActiveRelease;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.AssessmentVersionRef;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.BlueprintVersionRef;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.CandidateState;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.OpenCandidate;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.Scope;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.SeriesSnapshot;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.RoleConfig;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.SkillConfig;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

public class BaselineAssessmentManagementService implements BaselineAssessmentManagementUseCase {
    private static final BigDecimal ZERO_EASY = new BigDecimal("0.3334");
    private static final BigDecimal ZERO_MEDIUM = new BigDecimal("0.3333");
    private static final BigDecimal ZERO_HARD = new BigDecimal("0.3333");

    private final ActorPort actors;
    private final BaselineOccupationCatalogPort catalog;
    private final BaselineBlueprintStore blueprints;
    private final BaselineBlueprintDraftValidator validator;
    private final BaselineAssessmentDraftUseCase draftUseCase;
    private final BaselineAssessmentDraftStore drafts;
    private final BaselineAssessmentManagementStore management;
    private final ObjectMapper json;
    private final Clock clock;

    public BaselineAssessmentManagementService(
            ActorPort actors,
            BaselineOccupationCatalogPort catalog,
            BaselineBlueprintStore blueprints,
            BaselineBlueprintValidationPort validation,
            BaselineAssessmentDraftUseCase draftUseCase,
            BaselineAssessmentDraftStore drafts,
            BaselineAssessmentManagementStore management,
            ObjectMapper json) {
        this(actors, catalog, blueprints, validation, draftUseCase, drafts, management,
                json, Clock.systemUTC());
    }

    BaselineAssessmentManagementService(
            ActorPort actors, BaselineOccupationCatalogPort catalog,
            BaselineBlueprintStore blueprints, BaselineBlueprintValidationPort validation,
            BaselineAssessmentDraftUseCase draftUseCase, BaselineAssessmentDraftStore drafts,
            BaselineAssessmentManagementStore management, ObjectMapper json, Clock clock) {
        this.actors = Objects.requireNonNull(actors);
        this.catalog = Objects.requireNonNull(catalog);
        this.blueprints = Objects.requireNonNull(blueprints);
        this.validator = new BaselineBlueprintDraftValidator(Objects.requireNonNull(validation));
        this.draftUseCase = Objects.requireNonNull(draftUseCase);
        this.drafts = Objects.requireNonNull(drafts);
        this.management = Objects.requireNonNull(management);
        this.json = Objects.requireNonNull(json);
        this.clock = Objects.requireNonNull(clock);
    }

    @Override
    public OccupationPage listOccupations(OccupationQuery query) {
        Actor actor = requireActor();
        try {
            UUID organizationId = organizationId(actor);
            var filtered = catalog.findAvailableOccupations(actor.organizationId()).stream()
                    .map(item -> toSummary(organizationId, item))
                    .filter(item -> query.search().isEmpty()
                            || item.occupationId().toLowerCase().contains(query.search().toLowerCase())
                            || item.occupationName().toLowerCase().contains(query.search().toLowerCase()))
                    .filter(item -> query.status().isEmpty()
                            || query.status().equalsIgnoreCase(status(item)))
                    .sorted(summaryComparator(query.sort()))
                    .toList();
            int from = (int) Math.min((long) query.page() * query.size(), filtered.size());
            int to = Math.min(from + query.size(), filtered.size());
            return new OccupationPage(filtered.subList(from, to), query.page(), query.size(), filtered.size());
        } catch (BaselineOccupationCatalogPort.DependencyUnavailable failure) {
            throw failure(Code.DEPENDENCY_UNAVAILABLE, failure.getMessage());
        }
    }

    @Override
    public Workspace getWorkspace(String occupationId) {
        Actor actor = requireActor();
        Scope scope = scope(actor, occupationId);
        var occupation = catalog.findAvailableOccupation(actor.organizationId(), scope.occupationId())
                .orElseThrow(() -> failure(Code.NOT_FOUND, "Occupation is unavailable"));
        Optional<SeriesSnapshot> snapshot = management.findByScope(scope);
        if (snapshot.isEmpty()) {
            return new Workspace(scope.occupationId(), occupation.name(), null, null, List.of(), List.of());
        }
        SeriesSnapshot series = snapshot.orElseThrow();
        WorkingRevision working = series.workingRevisionId() == null ? null
                : management.findWorkingRevision(scope, series.workingRevisionId())
                        .map(this::toWorking).orElse(null);
        return new Workspace(scope.occupationId(), occupation.name(), series, working,
                management.findBlueprintVersions(scope).stream()
                        .map(value -> new BlueprintVersionSummary(
                                value.blueprintId(), value.version(), value.name(),
                                BaselineAssessmentLifecycle.blueprintProjection(series,
                                        new BlueprintVersionRef(value.blueprintId(), value.version())).name(),
                                value.createdAt()))
                        .toList(),
                management.findAssessmentVersions(scope).stream()
                        .map(value -> new AssessmentVersionSummary(
                                value.assessmentVersionId(), value.version(), value.blueprintVersion(),
                                effectiveState(series, value.assessmentVersionId(),
                                        value.publicationState(), value.candidateState(), value.disabled()),
                                value.contentHash(), value.createdAt()))
                        .toList());
    }

    @Override
    public WorkingRevision startBlueprintRevision(String occupationId, String idempotencyKey) {
        Actor actor = requireActor();
        Scope scope = scope(actor, occupationId);
        String key = requireText(idempotencyKey, "idempotencyKey");
        String requestHash = hash("START_REVISION", scope.occupationId());
        Optional<WorkingRevision> replay = replay(scope, actor, key, "START_REVISION",
                requestHash, WorkingRevision.class);
        if (replay.isPresent()) return replay.orElseThrow();

        var occupation = catalog.findAvailableOccupation(actor.organizationId(), scope.occupationId())
                .orElseThrow(() -> failure(Code.NOT_FOUND, "Occupation is unavailable"));
        Optional<BaselineBlueprint> latest = blueprints.findLatestByOccupation(
                actor.organizationId(), scope.occupationId());
        UUID blueprintId = latest.map(BaselineBlueprint::blueprintId).orElseGet(() ->
                UUID.nameUUIDFromBytes((scope.organizationId() + ":" + scope.occupationId())
                        .getBytes(StandardCharsets.UTF_8)));
        SeriesSnapshot series = latest.isPresent()
                ? management.lockOrCreate(scope, blueprintId)
                : management.createAndLock(scope, blueprintId, actor.accountId(), now());
        replay = replay(scope, actor, key, "START_REVISION",
                requestHash, WorkingRevision.class);
        if (replay.isPresent()) return replay.orElseThrow();
        applyPolicy(() -> BaselineAssessmentLifecycle.startBlueprintRevision(series));
        UUID workingId = UUID.nameUUIDFromBytes(
                (actor.accountId() + ":" + key).getBytes(StandardCharsets.UTF_8));
        BlueprintDraft initial = latest.map(this::toDraft)
                .orElseGet(() -> emptyDraft(occupation));
        WorkingRevisionRecord stored = management.insertWorkingRevision(new NewWorkingRevision(
                workingId, scope, blueprintId, latest.map(BaselineBlueprint::version).orElse(null),
                initial.name(), initial.occupationNameSnapshot(), initial.roles(),
                actor.accountId(), now()));
        management.update(new Update(scope, series.seriesRevision(), workingId, null, null,
                series.activeRelease(), Transition.WORKING_REVISION_STARTED,
                actor.accountId(), now(), null));
        WorkingRevision result = toWorking(stored);
        record(scope, actor, key, "START_REVISION", requestHash, result);
        return result;
    }

    @Override
    public WorkingRevision saveBlueprintRevision(
            UUID workingRevisionId, long expectedRevision,
            String idempotencyKey, BlueprintDraft draft) {
        Actor actor = requireActor();
        Scope scope = workingScope(actor, workingRevisionId);
        String key = requireText(idempotencyKey, "idempotencyKey");
        String requestHash = hash("SAVE_REVISION", workingRevisionId, expectedRevision, draft);
        Optional<WorkingRevision> replay = replay(scope, actor, key, "SAVE_REVISION",
                requestHash, WorkingRevision.class);
        if (replay.isPresent()) return replay.orElseThrow();
        SeriesSnapshot series = lock(scope);
        replay = replay(scope, actor, key, "SAVE_REVISION",
                requestHash, WorkingRevision.class);
        if (replay.isPresent()) return replay.orElseThrow();
        applyPolicy(() -> BaselineAssessmentLifecycle.saveBlueprintRevision(
                series, workingRevisionId, expectedRevision));
        if (!scope.occupationId().equals(draft.occupationId())) {
            throw failure(Code.INVALID_REQUEST, "Working Blueprint cannot change Occupation");
        }
        WorkingRevisionRecord saved = management.saveWorkingRevision(new SaveWorkingRevision(
                scope, workingRevisionId, expectedRevision, draft.name(),
                draft.occupationNameSnapshot(), draft.roles(), actor.accountId(), now()));
        management.update(new Update(scope, series.seriesRevision(), workingRevisionId,
                null, null, series.activeRelease(), Transition.WORKING_REVISION_SAVED,
                actor.accountId(), now(), null));
        WorkingRevision result = toWorking(saved);
        record(scope, actor, key, "SAVE_REVISION", requestHash, result);
        return result;
    }

    @Override
    public BaselineBlueprint finalizeBlueprintRevision(
            UUID workingRevisionId, long expectedRevision, String idempotencyKey) {
        Actor actor = requireActor();
        Scope scope = workingScope(actor, workingRevisionId);
        String key = requireText(idempotencyKey, "idempotencyKey");
        String requestHash = hash("FINALIZE_REVISION", workingRevisionId, expectedRevision);
        Optional<BaselineBlueprint> replay = replay(scope, actor, key, "FINALIZE_REVISION",
                requestHash, BaselineBlueprint.class);
        if (replay.isPresent()) return replay.orElseThrow();
        SeriesSnapshot series = lock(scope);
        replay = replay(scope, actor, key, "FINALIZE_REVISION",
                requestHash, BaselineBlueprint.class);
        if (replay.isPresent()) return replay.orElseThrow();
        applyPolicy(() -> BaselineAssessmentLifecycle.finalizeBlueprintRevision(
                series, workingRevisionId, expectedRevision));
        WorkingRevisionRecord working = management.findWorkingRevision(scope, workingRevisionId)
                .orElseThrow(() -> failure(Code.NOT_FOUND, "Working Blueprint revision was not found"));
        if (working.revision() != expectedRevision) {
            throw failure(Code.STALE_WORKING_REVISION, "Working Blueprint revision is stale");
        }
        BlueprintDraft validated = validate(actor, new BlueprintDraft(
                working.name(), scope.occupationId(), working.occupationNameSnapshot(), working.roles()));
        int version = working.baseVersion() == null ? 1 : Math.addExact(working.baseVersion(), 1);
        BaselineBlueprint blueprint = new BaselineBlueprint(
                working.blueprintId(), version, validated.name(), validated.occupationId(),
                validated.occupationNameSnapshot(), actor.accountId(), key, requestHash,
                now(), validated.roles());
        blueprints.insert(actor.organizationId(), blueprint);
        management.update(new Update(scope, series.seriesRevision(), null,
                new BlueprintVersionRef(blueprint.blueprintId(), blueprint.version()),
                null, series.activeRelease(), Transition.BLUEPRINT_FINALIZED,
                actor.accountId(), now(), null));
        management.closeWorkingRevision(new CloseWorkingRevision(
                scope, workingRevisionId, expectedRevision, WorkingRevisionState.FINALIZED,
                actor.accountId(), now()));
        record(scope, actor, key, "FINALIZE_REVISION", requestHash, blueprint);
        return blueprint;
    }

    @Override
    public BaselineAssessmentDraft generateAssessmentDraft(
            String occupationId, String idempotencyKey) {
        Actor actor = requireActor();
        Scope scope = scope(actor, occupationId);
        String key = requireText(idempotencyKey, "idempotencyKey");
        SeriesSnapshot series = lock(scope);
        if (series.pendingBlueprint() == null) {
            throw failure(Code.INVALID_REQUEST, "No finalized Blueprint candidate is available");
        }
        String requestHash = hash("GENERATE_BASELINE", series.blueprintId(),
                series.pendingBlueprint().version());
        Optional<BaselineAssessmentDraft> replay = drafts.findByGenerationRequest(
                actor.accountId(), key);
        if (replay.isPresent()) {
            BaselineAssessmentDraft existing = replay.orElseThrow();
            if (!requestHash.equals(existing.generationRequestHash())) {
                throw failure(Code.IDEMPOTENCY_CONFLICT,
                        "Idempotency key was used for another generation request");
            }
            return existing;
        }
        applyPolicy(() -> BaselineAssessmentLifecycle.generateDraft(series, series.pendingBlueprint()));
        BaselineAssessmentDraft draft = draftUseCase.generate(
                series.blueprintId(), series.pendingBlueprint().version(), key);
        management.update(new Update(scope, series.seriesRevision(), null,
                series.pendingBlueprint(), open(draft), series.activeRelease(),
                Transition.ASSESSMENT_DRAFT_OPENED, actor.accountId(), now(), null));
        return draft;
    }

    @Override
    public BaselineAssessmentDraft getAssessmentVersion(UUID assessmentVersionId) {
        Actor actor = requireActor();
        assessmentScope(actor, assessmentVersionId);
        return draftUseCase.get(assessmentVersionId);
    }

    @Override
    public BaselineAssessmentDraft editAssessmentDraft(
            UUID assessmentVersionId, long expectedRevision,
            String idempotencyKey, ManifestEdit edit) {
        Actor actor = requireActor();
        Scope scope = assessmentScope(actor, assessmentVersionId);
        String key = requireText(idempotencyKey, "idempotencyKey");
        String requestHash = hash("EDIT_DRAFT", assessmentVersionId, expectedRevision, edit);
        Optional<BaselineAssessmentDraft> replay = replay(scope, actor, key, "EDIT_DRAFT",
                requestHash, BaselineAssessmentDraft.class);
        if (replay.isPresent()) return replay.orElseThrow();
        SeriesSnapshot series = lock(scope);
        replay = replay(scope, actor, key, "EDIT_DRAFT",
                requestHash, BaselineAssessmentDraft.class);
        if (replay.isPresent()) return replay.orElseThrow();
        applyPolicy(() -> BaselineAssessmentLifecycle.editDraft(
                series, assessmentVersionId, expectedRevision));
        BaselineAssessmentDraft updated = drafts.updateManifest(actor.organizationId(),
                assessmentVersionId, expectedRevision, edit.title(), edit.orderedItemVersionIds());
        management.update(new Update(scope, series.seriesRevision(), null,
                series.pendingBlueprint(), open(updated), series.activeRelease(),
                Transition.ASSESSMENT_DRAFT_EDITED, actor.accountId(), now(), null));
        record(scope, actor, key, "EDIT_DRAFT", requestHash, updated);
        return updated;
    }

    @Override
    public BaselineAssessmentDraft reviewAssessmentDraft(
            UUID assessmentVersionId, String expectedContentHash) {
        Actor actor = requireActor();
        Scope scope = assessmentScope(actor, assessmentVersionId);
        SeriesSnapshot series = lock(scope);
        if (series.openCandidate() != null
                && series.openCandidate().state() == CandidateState.REVIEWED
                && series.openCandidate().assessment().assessmentVersionId().equals(assessmentVersionId)) {
            BaselineAssessmentDraft existing = draftUseCase.get(assessmentVersionId);
            if (!existing.contentHash().equals(expectedContentHash)) {
                throw failure(Code.REVIEW_HASH_MISMATCH,
                        "Reviewed content hash does not match the request");
            }
            return existing;
        }
        applyPolicy(() -> BaselineAssessmentLifecycle.reviewDraft(series, assessmentVersionId));
        BaselineAssessmentDraft reviewed = draftUseCase.review(
                assessmentVersionId, expectedContentHash);
        management.update(new Update(scope, series.seriesRevision(), null,
                series.pendingBlueprint(), open(reviewed), series.activeRelease(),
                Transition.ASSESSMENT_REVIEWED, actor.accountId(), now(), null));
        return reviewed;
    }

    @Override
    public BaselineAssessmentDraft publishAssessment(
            UUID assessmentVersionId, String expectedContentHash) {
        Actor actor = requireActor();
        Scope scope = assessmentScope(actor, assessmentVersionId);
        SeriesSnapshot series = lock(scope);
        if (series.activeRelease() != null
                && series.activeRelease().assessment().assessmentVersionId().equals(assessmentVersionId)) {
            BaselineAssessmentDraft existing = draftUseCase.get(assessmentVersionId);
            if (!existing.contentHash().equals(expectedContentHash)) {
                throw failure(Code.REVIEW_HASH_MISMATCH,
                        "Published content hash does not match the request");
            }
            return existing;
        }
        applyPolicy(() -> BaselineAssessmentLifecycle.publishReviewed(series, assessmentVersionId));
        BaselineAssessmentDraft published = draftUseCase.publish(
                assessmentVersionId, expectedContentHash);
        management.update(new Update(scope, series.seriesRevision(), null, null, null,
                active(published), Transition.ACTIVE_ASSESSMENT_SWITCHED,
                actor.accountId(), now(), null));
        return published;
    }

    @Override
    public BaselineAssessmentDraft replaceReviewedCandidate(
            UUID assessmentVersionId, String idempotencyKey) {
        return cloneCandidate(assessmentVersionId, idempotencyKey, false);
    }

    @Override
    public BaselineAssessmentDraft restoreHistoricalAssessment(
            UUID assessmentVersionId, String idempotencyKey) {
        return cloneCandidate(assessmentVersionId, idempotencyKey, true);
    }

    @Override
    public Workspace disableActiveAssessment(UUID assessmentVersionId, String reason) {
        Actor actor = requireActor();
        Scope scope = assessmentScope(actor, assessmentVersionId);
        SeriesSnapshot series = lock(scope);
        applyPolicy(() -> BaselineAssessmentLifecycle.disableActive(series, assessmentVersionId));
        management.update(new Update(scope, series.seriesRevision(), series.workingRevisionId(),
                series.pendingBlueprint(), series.openCandidate(), null,
                Transition.ACTIVE_ASSESSMENT_DISABLED, actor.accountId(), now(), requireReason(reason)));
        return getWorkspace(scope.occupationId());
    }

    @Override
    public Workspace abandonPendingChange(String occupationId, String reason) {
        Actor actor = requireActor();
        Scope scope = scope(actor, occupationId);
        SeriesSnapshot series = lock(scope);
        applyPolicy(() -> BaselineAssessmentLifecycle.abandonPendingChange(series));
        management.update(new Update(scope, series.seriesRevision(), null, null, null,
                series.activeRelease(), Transition.PENDING_CHANGE_ABANDONED,
                actor.accountId(), now(), requireReason(reason)));
        if (series.workingRevisionId() != null) {
            WorkingRevisionRecord working = management.findWorkingRevision(
                    scope, series.workingRevisionId()).orElseThrow();
            management.closeWorkingRevision(new CloseWorkingRevision(
                    scope, working.workingRevisionId(), working.revision(),
                    WorkingRevisionState.ABANDONED, actor.accountId(), now()));
        }
        if (series.openCandidate() != null) {
            drafts.closeCandidate(actor.organizationId(),
                    series.openCandidate().assessment().assessmentVersionId());
        }
        return getWorkspace(scope.occupationId());
    }

    private BaselineAssessmentDraft cloneCandidate(
            UUID sourceId, String idempotencyKey, boolean historical) {
        Actor actor = requireActor();
        Scope scope = assessmentScope(actor, sourceId);
        String operation = historical ? "RESTORE_ASSESSMENT" : "REPLACE_REVIEWED";
        String key = requireText(idempotencyKey, "idempotencyKey");
        String requestHash = hash(operation, sourceId);
        Optional<BaselineAssessmentDraft> replay = replay(scope, actor, key, operation,
                requestHash, BaselineAssessmentDraft.class);
        if (replay.isPresent()) return replay.orElseThrow();
        SeriesSnapshot series = lock(scope);
        replay = replay(scope, actor, key, operation,
                requestHash, BaselineAssessmentDraft.class);
        if (replay.isPresent()) return replay.orElseThrow();
        if (historical) {
            applyPolicy(() -> BaselineAssessmentLifecycle.restoreHistorical(series, sourceId));
        } else {
            applyPolicy(() -> BaselineAssessmentLifecycle.replaceReviewed(series, sourceId));
            drafts.closeCandidate(actor.organizationId(), sourceId);
        }
        BaselineAssessmentDraft clone = drafts.cloneAsOpenCandidate(new CloneCandidate(
                actor.organizationId(), sourceId, UUID.randomUUID(), actor.accountId(), now(),
                key, requestHash));
        BlueprintVersionRef pending = new BlueprintVersionRef(
                clone.blueprintId(), clone.blueprintVersion());
        management.update(new Update(scope, series.seriesRevision(), null, pending,
                open(clone), series.activeRelease(), historical
                        ? Transition.HISTORICAL_ASSESSMENT_RESTORED
                        : Transition.REVIEWED_CANDIDATE_REPLACED,
                actor.accountId(), now(), null));
        record(scope, actor, key, operation, requestHash, clone);
        return clone;
    }

    private SeriesSnapshot lock(Scope scope) {
        SeriesSnapshot current = management.findByScope(scope)
                .orElseThrow(() -> failure(Code.NOT_FOUND,
                        "Baseline assessment workspace was not found"));
        return management.lockOrCreate(scope, current.blueprintId());
    }

    private Scope workingScope(Actor actor, UUID id) {
        return management.findScopeByWorkingRevision(organizationId(actor), id)
                .orElseThrow(() -> failure(Code.NOT_FOUND, "Working Blueprint revision was not found"));
    }

    private Scope assessmentScope(Actor actor, UUID id) {
        return management.findScopeByAssessment(organizationId(actor), id)
                .orElseThrow(() -> failure(Code.NOT_FOUND, "Baseline assessment version was not found"));
    }

    private OccupationSummary toSummary(
            UUID organizationId, BaselineOccupationCatalogPort.CatalogOccupationSummary occupation) {
        Optional<SeriesSnapshot> series = management.findByScope(
                new Scope(organizationId, occupation.id()));
        return new OccupationSummary(occupation.id(), occupation.name(),
                series.flatMap(value -> management.findBlueprintVersions(value.scope()).stream().findFirst())
                        .map(BaselineAssessmentManagementStore.BlueprintVersionRecord::version).orElse(null),
                series.map(value -> value.pendingStage().name()).orElse("NONE"),
                series.map(SeriesSnapshot::openCandidate).filter(Objects::nonNull)
                        .map(value -> value.assessment().version()).orElse(null),
                series.map(SeriesSnapshot::openCandidate).filter(Objects::nonNull)
                        .map(value -> value.state().name()).orElse(null),
                series.map(SeriesSnapshot::activeRelease).filter(Objects::nonNull)
                        .map(value -> value.assessment().version()).orElse(null), null);
    }

    private static Comparator<OccupationSummary> summaryComparator(String sort) {
        Comparator<OccupationSummary> byName = Comparator.comparing(
                OccupationSummary::occupationName, String.CASE_INSENSITIVE_ORDER)
                .thenComparing(OccupationSummary::occupationId);
        return "name_desc".equalsIgnoreCase(sort) ? byName.reversed() : byName;
    }

    private static String status(OccupationSummary value) {
        if (value.openAssessmentVersion() != null) return value.openAssessmentState();
        if (value.pendingStage() != null && !"NONE".equals(value.pendingStage())) return value.pendingStage();
        if (value.activeAssessmentVersion() != null) return "ACTIVE";
        return "NOT_CONFIGURED";
    }

    private static String effectiveState(
            SeriesSnapshot series, UUID id, String publicationState, String candidateState,
            boolean disabled) {
        if (series.activeRelease() != null
                && series.activeRelease().assessment().assessmentVersionId().equals(id)) return "ACTIVE";
        if (series.openCandidate() != null
                && series.openCandidate().assessment().assessmentVersionId().equals(id)) {
            return series.openCandidate().state().name();
        }
        if (disabled) return "DISABLED";
        if ("PUBLISHED".equals(publicationState)) return "SUPERSEDED";
        return "CLOSED".equals(candidateState) ? "ABANDONED" : publicationState;
    }

    private BlueprintDraft emptyDraft(BaselineOccupationCatalogPort.CatalogOccupation occupation) {
        List<RoleConfig> roles = occupation.roles().stream().map(role -> new RoleConfig(
                role.id(), role.name(), false, ZERO_EASY, ZERO_MEDIUM, ZERO_HARD,
                role.skills().stream().map(skill -> new SkillConfig(
                        skill.id(), skill.name(), 0, 0, 0)).toList())).toList();
        return new BlueprintDraft("Baseline assessment - " + occupation.name(),
                occupation.id(), occupation.name(), roles);
    }

    private BlueprintDraft toDraft(BaselineBlueprint value) {
        return new BlueprintDraft(value.name(), value.occupationId(),
                value.occupationNameSnapshot(), value.roles());
    }

    private WorkingRevision toWorking(WorkingRevisionRecord value) {
        return new WorkingRevision(value.workingRevisionId(), value.blueprintId(),
                value.baseVersion(), value.revision(), new BlueprintDraft(
                        value.name(), value.scope().occupationId(),
                        value.occupationNameSnapshot(), value.roles()), value.updatedAt());
    }

    private BlueprintDraft validate(Actor actor, BlueprintDraft draft) {
        try {
            return validator.validateAndNormalize(actor, draft);
        } catch (com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Failure failure) {
            Code code = failure.code()
                    == com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Code.DEPENDENCY_UNAVAILABLE
                    ? Code.DEPENDENCY_UNAVAILABLE : Code.INVALID_REQUEST;
            throw failure(code, failure.getMessage());
        }
    }

    private static OpenCandidate open(BaselineAssessmentDraft draft) {
        return new OpenCandidate(ref(draft), draft.reviewedContentHash() == null
                ? CandidateState.DRAFT : CandidateState.REVIEWED,
                draft.draftRevision(), draft.contentHash());
    }

    private static ActiveRelease active(BaselineAssessmentDraft draft) {
        return new ActiveRelease(ref(draft));
    }

    private static AssessmentVersionRef ref(BaselineAssessmentDraft draft) {
        return new AssessmentVersionRef(draft.assessmentVersionId(), draft.version(),
                new BlueprintVersionRef(draft.blueprintId(), draft.blueprintVersion()));
    }

    private Actor requireActor() {
        Actor actor = actors.currentActor()
                .orElseThrow(() -> failure(Code.UNAUTHENTICATED, "Authentication is required"));
        if (!actor.isActiveLdManager()) {
            throw failure(Code.FORBIDDEN, "Active L&D Manager role is required");
        }
        return actor;
    }

    private Scope scope(Actor actor, String occupationId) {
        return new Scope(organizationId(actor), requireText(occupationId, "occupationId"));
    }

    private static UUID organizationId(Actor actor) {
        try {
            return UUID.fromString(actor.organizationId());
        } catch (IllegalArgumentException invalid) {
            throw failure(Code.DEPENDENCY_UNAVAILABLE,
                    "Trusted organization context is not a UUID");
        }
    }

    private Instant now() {
        return Instant.now(clock).truncatedTo(ChronoUnit.MICROS);
    }

    private static String requireReason(String value) {
        String reason = requireText(value, "reason");
        return reason;
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) throw failure(Code.INVALID_REQUEST,
                field + " must not be blank");
        return value.strip();
    }

    private void applyPolicy(Supplier<?> decision) {
        try {
            decision.get();
        } catch (PolicyViolation violation) {
            Code code = switch (violation.code()) {
                case INVALID_REQUEST, INVALID_TRANSITION -> Code.INVALID_REQUEST;
                case PENDING_CHANGE_EXISTS -> Code.PENDING_CHANGE_EXISTS;
                case OPEN_ASSESSMENT_CANDIDATE_EXISTS, OPEN_ASSESSMENT_CANDIDATE_NOT_FOUND ->
                        Code.OPEN_ASSESSMENT_CANDIDATE_EXISTS;
                case ACTIVE_ASSESSMENT_CONFLICT -> Code.ACTIVE_ASSESSMENT_CONFLICT;
                case STALE_WORKING_REVISION -> Code.STALE_WORKING_REVISION;
                case STALE_ASSESSMENT_REVISION -> Code.STALE_ASSESSMENT_REVISION;
                case REVIEW_REQUIRED, REVIEWED_CANDIDATE_IMMUTABLE -> Code.REVIEW_REQUIRED;
            };
            throw failure(code, violation.getMessage());
        }
    }

    private <T> Optional<T> replay(
            Scope scope, Actor actor, String key, String operation,
            String requestHash, Class<T> type) {
        return management.findCommand(actor.accountId(), key).map(receipt -> {
            if (!receipt.scope().equals(scope) || !receipt.operation().equals(operation)
                    || !receipt.requestHash().equals(requestHash)) {
                throw failure(Code.IDEMPOTENCY_CONFLICT,
                        "Idempotency key was used for another command");
            }
            try {
                return json.readValue(receipt.responseJson(), type);
            } catch (JsonProcessingException invalid) {
                throw failure(Code.DEPENDENCY_UNAVAILABLE,
                        "Stored command receipt is invalid");
            }
        });
    }

    private void record(
            Scope scope, Actor actor, String key, String operation,
            String requestHash, Object response) {
        try {
            management.insertCommand(new CommandReceipt(scope, actor.accountId(), key,
                    operation, requestHash, json.writeValueAsString(response), now()));
        } catch (JsonProcessingException invalid) {
            throw failure(Code.DEPENDENCY_UNAVAILABLE,
                    "Command response could not be recorded");
        }
    }

    private static String hash(Object... values) {
        StringBuilder canonical = new StringBuilder();
        for (Object value : values) {
            String text = Objects.toString(value, "").strip();
            canonical.append(text.length()).append(':').append(text).append('|');
        }
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(canonical.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    private static Failure failure(Code code, String message) {
        return new Failure(code, message);
    }
}
