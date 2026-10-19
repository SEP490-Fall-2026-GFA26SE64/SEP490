package com.adaptlearngraph.assessment.infrastructure;

import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Instant;
import java.time.ZoneOffset;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

public class JdbcBaselineAssessmentDraftStore implements BaselineAssessmentDraftStore {
    private static final String SCORING_VERSION = "BASELINE_BLUEPRINT_WEIGHT_V1";
    private final NamedParameterJdbcTemplate jdbc;

    public JdbcBaselineAssessmentDraftStore(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<CandidateItem> findPublishedCandidates(Set<String> microSkillIds) {
        if (microSkillIds.isEmpty()) {
            return List.of();
        }
        try {
            return jdbc.query("""
                    WITH latest_published AS (
                        SELECT DISTINCT ON (item_id)
                               item_version_id, item_id, version, micro_skill_id,
                               micro_skill_name_snapshot, difficulty, content_hash,
                               prompt, response_schema
                        FROM platform.item_version
                        WHERE publication_state = 'PUBLISHED'
                          AND micro_skill_id IN (:skillIds)
                        ORDER BY item_id, version DESC, item_version_id DESC
                    )
                    SELECT item_version_id, micro_skill_id, micro_skill_name_snapshot,
                           difficulty, content_hash, prompt, response_schema::text AS response_schema_json
                    FROM latest_published
                    ORDER BY micro_skill_id, difficulty, item_version_id
                    """, new MapSqlParameterSource("skillIds", microSkillIds), (result, row) -> new CandidateItem(
                    result.getObject("item_version_id", UUID.class),
                    result.getString("micro_skill_id"),
                    result.getString("micro_skill_name_snapshot"),
                    Difficulty.valueOf(result.getString("difficulty")),
                    result.getString("content_hash"),
                    result.getString("prompt"),
                    result.getString("response_schema_json")));
        } catch (DataAccessException failure) {
            throw unavailable("Published question candidates are unavailable", failure);
        }
    }

    @Override
    public Optional<BaselineAssessmentDraft> findByGenerationRequest(UUID actorId, String idempotencyKey) {
        try {
            List<UUID> ids = jdbc.query("""
                    SELECT assessment_version_id
                    FROM platform.assessment_version
                    WHERE created_by = :actorId
                      AND generation_idempotency_key = :idempotencyKey
                      AND blueprint_id IS NOT NULL
                    """, Map.of("actorId", actorId, "idempotencyKey", idempotencyKey),
                    (result, row) -> result.getObject("assessment_version_id", UUID.class));
            return ids.isEmpty() ? Optional.empty() : findByVersionId(ids.getFirst());
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment generation history is unavailable", failure);
        }
    }

    @Override
    public Optional<BaselineAssessmentDraft> findByVersionId(UUID assessmentVersionId) {
        return findByVersionId(null, assessmentVersionId);
    }

    @Override
    public Optional<BaselineAssessmentDraft> findByVersionId(
            String organizationId, UUID assessmentVersionId) {
        try {
            String organizationPredicate = organizationId == null
                    ? ""
                    : " AND identity.organization_id = CAST(:organizationId AS uuid)";
            MapSqlParameterSource parameters = new MapSqlParameterSource()
                    .addValue("assessmentVersionId", assessmentVersionId);
            if (organizationId != null) {
                parameters.addValue("organizationId", requireText(organizationId, "organizationId"));
            }
            List<Header> headers = jdbc.query("""
                    SELECT assessment.assessment_version_id, assessment.assessment_id,
                           assessment.version, assessment.title, assessment.blueprint_id,
                           assessment.blueprint_version, assessment.generation_seed,
                           assessment.created_by, assessment.created_at,
                           assessment.generation_request_hash, assessment.content_hash,
                           assessment.draft_revision,
                           assessment.publication_state, assessment.reviewed_by,
                           assessment.reviewed_at, assessment.reviewed_content_hash
                    FROM platform.assessment_version assessment
                    JOIN platform.baseline_blueprint identity
                      ON identity.blueprint_id = assessment.blueprint_id
                    WHERE assessment.assessment_version_id = :assessmentVersionId
                      AND assessment.purpose = 'BASELINE'
                      AND assessment.blueprint_id IS NOT NULL
                    """ + organizationPredicate, parameters, this::mapHeader);
            if (headers.isEmpty()) {
                return Optional.empty();
            }
            Header header = headers.getFirst();
            List<BaselineAssessmentDraft.Item> items = jdbc.query("""
                    SELECT entry.item_position, entry.item_version_id,
                           entry.role_id, entry.role_name_snapshot, entry.scoring_weight,
                           item.micro_skill_id, item.micro_skill_name_snapshot,
                           item.difficulty, item.prompt,
                           item.response_schema::text AS response_schema_json
                    FROM platform.assessment_item entry
                    JOIN platform.item_version item USING (item_version_id)
                    WHERE entry.assessment_version_id = :assessmentVersionId
                    ORDER BY entry.item_position
                    """, Map.of("assessmentVersionId", assessmentVersionId), (result, row) ->
                    new BaselineAssessmentDraft.Item(
                            result.getInt("item_position"),
                            result.getObject("item_version_id", UUID.class),
                            result.getString("role_id"), result.getString("role_name_snapshot"),
                            result.getString("micro_skill_id"),
                            result.getString("micro_skill_name_snapshot"),
                            result.getString("difficulty"), result.getBigDecimal("scoring_weight"),
                            result.getString("prompt"), result.getString("response_schema_json")));
            return Optional.of(new BaselineAssessmentDraft(
                    header.assessmentVersionId(), header.assessmentId(), header.version(), header.title(),
                    header.blueprintId(), header.blueprintVersion(), header.generationSeed(),
                    header.createdBy(), header.createdAt(), header.generationRequestHash(),
                    header.contentHash(), header.draftRevision(), header.publicationState(),
                    header.reviewedBy(),
                    header.reviewedAt(), header.reviewedContentHash(), items));
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment draft is unavailable", failure);
        }
    }

    @Override
    @Transactional
    public BaselineAssessmentDraft insertNextVersion(NewDraft draft) {
        try {
            List<Long> seriesLocks = jdbc.query("""
                    SELECT series.series_revision
                    FROM platform.baseline_assessment_series series
                    JOIN platform.baseline_blueprint identity
                      ON identity.blueprint_id = series.blueprint_id
                    JOIN platform.account actor
                      ON actor.account_id = :createdBy
                     AND actor.organization_id = series.organization_id
                    WHERE series.blueprint_id = :blueprintId
                      AND identity.organization_id = series.organization_id
                    FOR UPDATE OF series
                    """, new MapSqlParameterSource()
                    .addValue("blueprintId", draft.blueprintId())
                    .addValue("createdBy", draft.createdBy()),
                    (result, row) -> result.getLong("series_revision"));
            if (seriesLocks.isEmpty()) {
                List<UUID> identityLocks = jdbc.query("""
                        SELECT identity.blueprint_id
                        FROM platform.baseline_blueprint identity
                        JOIN platform.account actor
                          ON actor.account_id = :createdBy
                         AND actor.organization_id = identity.organization_id
                        WHERE identity.blueprint_id = :blueprintId
                        FOR UPDATE OF identity
                        """, new MapSqlParameterSource()
                        .addValue("blueprintId", draft.blueprintId())
                        .addValue("createdBy", draft.createdBy()),
                        (result, row) -> result.getObject("blueprint_id", UUID.class));
                if (identityLocks.isEmpty()) {
                    throw new IllegalStateException(
                            "Baseline blueprint is outside the trusted organization");
                }
            }
            List<Integer> locked = jdbc.query("""
                    SELECT version
                    FROM platform.baseline_blueprint_version
                    WHERE blueprint_id = :blueprintId
                    ORDER BY version
                    FOR UPDATE
                    """, blueprintKey(draft), (result, row) -> result.getInt("version"));
            if (!locked.contains(draft.blueprintVersion())) {
                throw new IllegalStateException("Baseline blueprint version disappeared during generation");
            }
            int version = nextVersion(draft.assessmentId());
            jdbc.update("""
                    INSERT INTO platform.assessment_version (
                        assessment_version_id, assessment_id, version, title, purpose,
                        scoring_version, publication_state, content_hash,
                        blueprint_id, blueprint_version, generation_seed,
                        created_by, created_at, generation_idempotency_key, generation_request_hash,
                        baseline_candidate_state)
                    VALUES (
                        :assessmentVersionId, :assessmentId, :version, :title, 'BASELINE',
                        :scoringVersion, 'DRAFT', :contentHash,
                        :blueprintId, :blueprintVersion, :generationSeed,
                        :createdBy, :createdAt, :idempotencyKey, :requestHash, 'OPEN')
                    """, headerParameters(draft, version));
            int position = 1;
            for (NewItem item : draft.items()) {
                jdbc.update("""
                        INSERT INTO platform.assessment_item (
                            assessment_version_id, item_position, item_version_id,
                            required, scoring_weight, role_id, role_name_snapshot)
                        VALUES (
                            :assessmentVersionId, :position, :itemVersionId,
                            true, :scoringWeight, :roleId, :roleName)
                        """, new MapSqlParameterSource()
                        .addValue("assessmentVersionId", draft.assessmentVersionId())
                        .addValue("position", position++)
                        .addValue("itemVersionId", item.candidate().itemVersionId())
                        .addValue("scoringWeight", item.scoringWeight())
                        .addValue("roleId", item.roleId())
                        .addValue("roleName", item.roleNameSnapshot()));
            }
            return findByVersionId(draft.assessmentVersionId())
                    .orElseThrow(() -> new IllegalStateException("Generated assessment draft could not be reloaded"));
        } catch (DuplicateKeyException conflict) {
            throw new WriteConflict(conflict);
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment draft could not be stored", failure);
        }
    }

    @Override
    public boolean review(
            UUID assessmentVersionId, UUID reviewerId, Instant reviewedAt,
            String expectedContentHash) {
        return review(null, assessmentVersionId, reviewerId, reviewedAt, expectedContentHash);
    }

    @Override
    public boolean review(
            String organizationId, UUID assessmentVersionId, UUID reviewerId,
            Instant reviewedAt, String expectedContentHash) {
        try {
            String organizationPredicate = organizationId == null ? "" : """
                      AND EXISTS (
                          SELECT 1 FROM platform.baseline_blueprint identity
                          WHERE identity.blueprint_id = assessment.blueprint_id
                            AND identity.organization_id = CAST(:organizationId AS uuid))
                    """;
            MapSqlParameterSource parameters = new MapSqlParameterSource()
                    .addValue("assessmentVersionId", assessmentVersionId)
                    .addValue("reviewerId", reviewerId)
                    .addValue("reviewedAt", reviewedAt.atOffset(ZoneOffset.UTC),
                            Types.TIMESTAMP_WITH_TIMEZONE)
                    .addValue("expectedContentHash", expectedContentHash);
            if (organizationId != null) {
                parameters.addValue("organizationId", requireText(organizationId, "organizationId"));
            }
            return jdbc.update("""
                    UPDATE platform.assessment_version AS assessment
                    SET reviewed_by = :reviewerId,
                        reviewed_at = :reviewedAt,
                        reviewed_content_hash = :expectedContentHash
                    WHERE assessment_version_id = :assessmentVersionId
                      AND purpose = 'BASELINE'
                      AND blueprint_id IS NOT NULL
                      AND publication_state = 'DRAFT'
                      AND content_hash = :expectedContentHash
                      AND reviewed_content_hash IS NULL
                    """ + organizationPredicate, parameters) == 1;
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment review could not be stored", failure);
        }
    }

    @Override
    public boolean publish(UUID assessmentVersionId, String expectedContentHash) {
        return publish(null, assessmentVersionId, expectedContentHash);
    }

    @Override
    public boolean publish(
            String organizationId, UUID assessmentVersionId, String expectedContentHash) {
        try {
            String organizationPredicate = organizationId == null ? "" : """
                      AND EXISTS (
                          SELECT 1 FROM platform.baseline_blueprint identity
                          WHERE identity.blueprint_id = assessment.blueprint_id
                            AND identity.organization_id = CAST(:organizationId AS uuid))
                    """;
            MapSqlParameterSource parameters = new MapSqlParameterSource()
                    .addValue("assessmentVersionId", assessmentVersionId)
                    .addValue("expectedContentHash", expectedContentHash);
            if (organizationId != null) {
                parameters.addValue("organizationId", requireText(organizationId, "organizationId"));
            }
            return jdbc.update("""
                    UPDATE platform.assessment_version AS assessment
                    SET publication_state = 'PUBLISHED',
                        baseline_candidate_state = 'CLOSED'
                    WHERE assessment_version_id = :assessmentVersionId
                      AND purpose = 'BASELINE'
                      AND blueprint_id IS NOT NULL
                      AND publication_state = 'DRAFT'
                      AND content_hash = :expectedContentHash
                      AND reviewed_content_hash = :expectedContentHash
                    """ + organizationPredicate, parameters) == 1;
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment could not be published", failure);
        }
    }

    @Override
    @Transactional
    public BaselineAssessmentDraft updateManifest(
            String organizationId, UUID assessmentVersionId, long expectedDraftRevision,
            String title, List<UUID> orderedItemVersionIds) {
        try {
            BaselineAssessmentDraft current = findByVersionId(organizationId, assessmentVersionId)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Baseline assessment draft was not found"));
            if (current.draftRevision() != expectedDraftRevision
                    || current.publicationState() != BaselineAssessmentDraft.PublicationState.DRAFT
                    || current.reviewedContentHash() != null) {
                throw new WriteConflict(new IllegalStateException(
                        "Baseline assessment draft is stale or immutable"));
            }
            if (orderedItemVersionIds.size() != current.items().size()
                    || new HashSet<>(orderedItemVersionIds).size() != orderedItemVersionIds.size()) {
                throw new IllegalArgumentException(
                        "Edited manifest must retain its item count and unique items");
            }
            List<EditableItem> candidates = readEditableItems(orderedItemVersionIds);
            if (candidates.size() != orderedItemVersionIds.size()) {
                throw new IllegalArgumentException(
                        "Every assessment replacement item must be published");
            }
            Map<UUID, BaselineAssessmentDraft.Item> existing = current.items().stream()
                    .collect(java.util.stream.Collectors.toMap(
                            BaselineAssessmentDraft.Item::itemVersionId, item -> item));
            Set<Integer> reservedSlots = orderedItemVersionIds.stream()
                    .map(existing::get).filter(java.util.Objects::nonNull)
                    .map(BaselineAssessmentDraft.Item::position)
                    .collect(java.util.stream.Collectors.toSet());
            Set<Integer> usedSlots = new HashSet<>();
            List<ManifestRow> rows = new ArrayList<>();
            int position = 1;
            for (UUID itemId : orderedItemVersionIds) {
                EditableItem item = candidates.stream()
                        .filter(value -> value.itemVersionId().equals(itemId))
                        .findFirst().orElseThrow();
                BaselineAssessmentDraft.Item slot = existing.get(itemId);
                if (slot == null) {
                    slot = current.items().stream()
                            .filter(value -> !usedSlots.contains(value.position()))
                            .filter(value -> !reservedSlots.contains(value.position()))
                            .filter(value -> value.microSkillId().equals(item.microSkillId())
                                    && value.difficulty().equals(item.difficulty()))
                            .findFirst()
                            .orElseThrow(() -> new IllegalArgumentException(
                                    "Replacement item does not match a skill and difficulty slot"));
                }
                if (!usedSlots.add(slot.position())) {
                    throw new IllegalArgumentException(
                            "Edited manifest cannot reuse an assessment slot");
                }
                rows.add(new ManifestRow(position++, item, slot.roleId(),
                        slot.roleNameSnapshot(), slot.scoringWeight()));
            }
            String normalizedTitle = requireText(title, "title");
            String contentHash = manifestHash(current.blueprintId(),
                    current.blueprintVersion(), normalizedTitle, rows);
            int changed = jdbc.update("""
                    UPDATE platform.assessment_version AS assessment
                    SET title = :title, content_hash = :contentHash,
                        draft_revision = draft_revision + 1
                    WHERE assessment_version_id = :assessmentVersionId
                      AND draft_revision = :expectedRevision
                      AND publication_state = 'DRAFT'
                      AND reviewed_content_hash IS NULL
                      AND baseline_candidate_state = 'OPEN'
                      AND EXISTS (
                          SELECT 1 FROM platform.baseline_blueprint identity
                          WHERE identity.blueprint_id = assessment.blueprint_id
                            AND identity.organization_id = CAST(:organizationId AS uuid))
                    """, new MapSqlParameterSource()
                    .addValue("title", normalizedTitle)
                    .addValue("contentHash", contentHash)
                    .addValue("assessmentVersionId", assessmentVersionId)
                    .addValue("expectedRevision", expectedDraftRevision)
                    .addValue("organizationId", requireText(organizationId, "organizationId")));
            if (changed != 1) {
                throw new WriteConflict(new IllegalStateException(
                        "Baseline assessment draft revision is stale"));
            }
            jdbc.update("DELETE FROM platform.assessment_item WHERE assessment_version_id = :id",
                    Map.of("id", assessmentVersionId));
            for (ManifestRow row : rows) {
                jdbc.update("""
                        INSERT INTO platform.assessment_item (
                            assessment_version_id, item_position, item_version_id,
                            required, scoring_weight, role_id, role_name_snapshot)
                        VALUES (:assessmentVersionId, :position, :itemVersionId,
                            true, :weight, :roleId, :roleName)
                        """, new MapSqlParameterSource()
                        .addValue("assessmentVersionId", assessmentVersionId)
                        .addValue("position", row.position())
                        .addValue("itemVersionId", row.item().itemVersionId())
                        .addValue("weight", row.weight())
                        .addValue("roleId", row.roleId())
                        .addValue("roleName", row.roleName()));
            }
            return findByVersionId(organizationId, assessmentVersionId).orElseThrow();
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment manifest could not be updated", failure);
        }
    }

    @Override
    public void closeCandidate(String organizationId, UUID assessmentVersionId) {
        try {
            int changed = jdbc.update("""
                    UPDATE platform.assessment_version AS assessment
                    SET baseline_candidate_state = 'CLOSED'
                    WHERE assessment_version_id = :assessmentVersionId
                      AND baseline_candidate_state = 'OPEN'
                      AND EXISTS (
                          SELECT 1 FROM platform.baseline_blueprint identity
                          WHERE identity.blueprint_id = assessment.blueprint_id
                            AND identity.organization_id = CAST(:organizationId AS uuid))
                    """, Map.of("assessmentVersionId", assessmentVersionId,
                            "organizationId", requireText(organizationId, "organizationId")));
            if (changed != 1) {
                throw new WriteConflict(new IllegalStateException(
                        "Open baseline assessment candidate was not found"));
            }
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment candidate could not be closed", failure);
        }
    }

    @Override
    @Transactional
    public BaselineAssessmentDraft cloneAsOpenCandidate(CloneCandidate candidate) {
        try {
            int inserted = jdbc.update("""
                    INSERT INTO platform.assessment_version (
                        assessment_version_id, assessment_id, version, title, purpose,
                        scoring_version, publication_state, content_hash,
                        blueprint_id, blueprint_version, generation_seed,
                        created_by, created_at, generation_idempotency_key,
                        generation_request_hash, draft_revision, baseline_candidate_state)
                    SELECT :newId, source.assessment_id,
                           (SELECT coalesce(max(version), 0) + 1
                            FROM platform.assessment_version sibling
                            WHERE sibling.assessment_id = source.assessment_id),
                           source.title, source.purpose, source.scoring_version, 'DRAFT',
                           source.content_hash, source.blueprint_id, source.blueprint_version,
                           source.generation_seed, :actorId, :occurredAt, :idempotencyKey,
                           :requestHash, 1, 'OPEN'
                    FROM platform.assessment_version source
                    JOIN platform.baseline_blueprint identity
                      ON identity.blueprint_id = source.blueprint_id
                    WHERE source.assessment_version_id = :sourceId
                      AND source.purpose = 'BASELINE'
                      AND identity.organization_id = CAST(:organizationId AS uuid)
                    """, cloneParameters(candidate));
            if (inserted != 1) {
                throw new IllegalArgumentException("Historical baseline assessment was not found");
            }
            jdbc.update("""
                    INSERT INTO platform.assessment_item (
                        assessment_version_id, item_position, item_version_id,
                        required, scoring_weight, role_id, role_name_snapshot)
                    SELECT :newId, item_position, item_version_id,
                           required, scoring_weight, role_id, role_name_snapshot
                    FROM platform.assessment_item
                    WHERE assessment_version_id = :sourceId
                    """, cloneParameters(candidate));
            return findByVersionId(candidate.organizationId(), candidate.newAssessmentVersionId())
                    .orElseThrow();
        } catch (DuplicateKeyException conflict) {
            throw new WriteConflict(conflict);
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment candidate could not be cloned", failure);
        }
    }

    private List<EditableItem> readEditableItems(List<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return jdbc.query("""
                SELECT item_version_id, micro_skill_id, difficulty, content_hash
                FROM platform.item_version
                WHERE item_version_id IN (:ids) AND publication_state = 'PUBLISHED'
                """, new MapSqlParameterSource("ids", ids), (result, row) -> new EditableItem(
                result.getObject("item_version_id", UUID.class),
                result.getString("micro_skill_id"), result.getString("difficulty"),
                result.getString("content_hash")));
    }

    private static String manifestHash(
            UUID blueprintId, int blueprintVersion, String title, List<ManifestRow> rows) {
        StringBuilder canonical = new StringBuilder();
        appendHash(canonical, blueprintId);
        appendHash(canonical, blueprintVersion);
        appendHash(canonical, title);
        appendHash(canonical, SCORING_VERSION);
        for (ManifestRow row : rows) {
            appendHash(canonical, row.position());
            appendHash(canonical, row.item().itemVersionId());
            appendHash(canonical, row.item().contentHash());
            appendHash(canonical, row.roleId());
            appendHash(canonical, row.roleName());
            appendHash(canonical, row.weight().stripTrailingZeros().toPlainString());
        }
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(canonical.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    private static void appendHash(StringBuilder target, Object value) {
        String text = java.util.Objects.toString(value, "").strip();
        target.append(text.length()).append(':').append(text).append('|');
    }

    private static MapSqlParameterSource cloneParameters(CloneCandidate candidate) {
        return new MapSqlParameterSource()
                .addValue("organizationId", requireText(candidate.organizationId(), "organizationId"))
                .addValue("sourceId", candidate.sourceAssessmentVersionId())
                .addValue("newId", candidate.newAssessmentVersionId())
                .addValue("actorId", candidate.actorId())
                .addValue("occurredAt", candidate.occurredAt().atOffset(ZoneOffset.UTC),
                        Types.TIMESTAMP_WITH_TIMEZONE)
                .addValue("idempotencyKey", requireText(candidate.idempotencyKey(), "idempotencyKey"))
                .addValue("requestHash", requireText(candidate.requestHash(), "requestHash"));
    }

    private int nextVersion(UUID assessmentId) {
        Integer latest = jdbc.queryForObject("""
                SELECT coalesce(max(version), 0)
                FROM platform.assessment_version
                WHERE assessment_id = :assessmentId
                """, Map.of("assessmentId", assessmentId), Integer.class);
        return Math.addExact(latest == null ? 0 : latest, 1);
    }

    private static MapSqlParameterSource blueprintKey(NewDraft draft) {
        return new MapSqlParameterSource()
                .addValue("blueprintId", draft.blueprintId())
                .addValue("blueprintVersion", draft.blueprintVersion());
    }

    private static MapSqlParameterSource headerParameters(NewDraft draft, int version) {
        return new MapSqlParameterSource()
                .addValue("assessmentVersionId", draft.assessmentVersionId())
                .addValue("assessmentId", draft.assessmentId())
                .addValue("version", version)
                .addValue("title", draft.title())
                .addValue("scoringVersion", SCORING_VERSION)
                .addValue("contentHash", draft.contentHash())
                .addValue("blueprintId", draft.blueprintId())
                .addValue("blueprintVersion", draft.blueprintVersion())
                .addValue("generationSeed", draft.generationSeed())
                .addValue("createdBy", draft.createdBy())
                .addValue("createdAt", draft.createdAt().atOffset(ZoneOffset.UTC),
                        Types.TIMESTAMP_WITH_TIMEZONE)
                .addValue("idempotencyKey", draft.idempotencyKey())
                .addValue("requestHash", draft.requestHash());
    }

    private Header mapHeader(ResultSet result, int row) throws SQLException {
        return new Header(
                result.getObject("assessment_version_id", UUID.class),
                result.getObject("assessment_id", UUID.class), result.getInt("version"),
                result.getString("title"), result.getObject("blueprint_id", UUID.class),
                result.getInt("blueprint_version"), result.getLong("generation_seed"),
                result.getObject("created_by", UUID.class),
                result.getObject("created_at", java.time.OffsetDateTime.class).toInstant(),
                result.getString("generation_request_hash"),
                result.getString("content_hash"),
                result.getLong("draft_revision"),
                BaselineAssessmentDraft.PublicationState.valueOf(
                        result.getString("publication_state")),
                result.getObject("reviewed_by", UUID.class),
                result.getObject("reviewed_at", java.time.OffsetDateTime.class) == null
                        ? null
                        : result.getObject("reviewed_at", java.time.OffsetDateTime.class).toInstant(),
                result.getString("reviewed_content_hash"));
    }

    private static DependencyUnavailable unavailable(String message, Throwable cause) {
        return new DependencyUnavailable(message, cause);
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }

    private record Header(
            UUID assessmentVersionId,
            UUID assessmentId,
            int version,
            String title,
            UUID blueprintId,
            int blueprintVersion,
            long generationSeed,
            UUID createdBy,
            Instant createdAt,
            String generationRequestHash,
            String contentHash,
            long draftRevision,
            BaselineAssessmentDraft.PublicationState publicationState,
            UUID reviewedBy,
            Instant reviewedAt,
            String reviewedContentHash) {}

    private record EditableItem(
            UUID itemVersionId, String microSkillId, String difficulty, String contentHash) {}

    private record ManifestRow(
            int position, EditableItem item, String roleId, String roleName,
            java.math.BigDecimal weight) {}
}
