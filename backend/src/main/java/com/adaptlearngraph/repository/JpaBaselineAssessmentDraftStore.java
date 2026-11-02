package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.AssessmentItemEntity;
import com.adaptlearngraph.entities.AssessmentVersionEntity;
import com.adaptlearngraph.entities.BaselineAssessmentDraft;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.InvalidDataAccessApiUsageException;
import org.springframework.transaction.annotation.Transactional;

public class JpaBaselineAssessmentDraftStore implements BaselineAssessmentDraftStore {
    private static final String SCORING_VERSION = "BASELINE_BLUEPRINT_WEIGHT_V1";
    private final ItemVersionJpaRepository itemVersions;
    private final AssessmentVersionJpaRepository assessments;
    private final AssessmentItemJpaRepository manifests;
    private final BaselineAssessmentSeriesJpaRepository series;
    private final BaselineBlueprintJpaRepository identities;
    private final BaselineBlueprintVersionJpaRepository blueprintVersions;

    public JpaBaselineAssessmentDraftStore(ItemVersionJpaRepository itemVersions, AssessmentVersionJpaRepository assessments,
            AssessmentItemJpaRepository manifests, BaselineAssessmentSeriesJpaRepository series,
            BaselineBlueprintJpaRepository identities, BaselineBlueprintVersionJpaRepository blueprintVersions) {
        this.itemVersions = Objects.requireNonNull(itemVersions);
        this.assessments = Objects.requireNonNull(assessments);
        this.manifests = Objects.requireNonNull(manifests);
        this.series = Objects.requireNonNull(series);
        this.identities = Objects.requireNonNull(identities);
        this.blueprintVersions = Objects.requireNonNull(blueprintVersions);
    }

    @Override
    public List<CandidateItem> findPublishedCandidates(Set<String> microSkillIds) {
        if (microSkillIds.isEmpty()) {
            return List.of();
        }
        try {
            return itemVersions.publishedCandidates(microSkillIds).stream().map(row -> new CandidateItem(
                    (UUID) row[0], (String) row[1], (String) row[2], Difficulty.valueOf((String) row[3]),
                    (String) row[4], (String) row[5], (String) row[6])).toList();
        } catch (DataAccessException failure) {
            throw unavailable("Published question candidates are unavailable", failure);
        }
    }

    @Override
    public Optional<BaselineAssessmentDraft> findByGenerationRequest(UUID actorId, String idempotencyKey) {
        try {
            List<UUID> ids = assessments.byGenerationRequest(actorId, idempotencyKey);
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
            List<AssessmentVersionJpaRepository.Header> headers = organizationId == null
                    ? assessments.baselineHeader(assessmentVersionId)
                    : assessments.baselineHeader(organization(organizationId), assessmentVersionId);
            if (headers.isEmpty()) {
                return Optional.empty();
            }
            var header = headers.getFirst();
            List<BaselineAssessmentDraft.Item> items = manifests.manifest(assessmentVersionId).stream()
                    .map(item -> new BaselineAssessmentDraft.Item(
                            item.position(), item.itemVersionId(), item.roleId(), item.roleNameSnapshot(),
                            item.microSkillId(), item.microSkillNameSnapshot(), item.difficulty(),
                            item.scoringWeight(), item.prompt(), item.responseSchema()))
                    .toList();
            return Optional.of(new BaselineAssessmentDraft(
                    header.assessmentVersionId(), header.assessmentId(), intValue(header.version()), header.title(),
                    header.blueprintId(), intValue(header.blueprintVersion()), longValue(header.generationSeed()),
                    header.createdBy(), header.createdAt(), header.generationRequestHash(),
                    header.contentHash(), longValue(header.draftRevision()),
                    BaselineAssessmentDraft.PublicationState.valueOf(header.publicationState()),
                    header.reviewedBy(), header.reviewedAt(), header.reviewedContentHash(), items));
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment draft is unavailable", failure);
        }
    }

    @Override
    @Transactional(TransactionManagers.JPA)
    public BaselineAssessmentDraft insertNextVersion(NewDraft draft) {
        try {
            if (series.lockForGeneration(draft.blueprintId(), draft.createdBy()).isEmpty()
                    && identities.lockForActor(draft.blueprintId(), draft.createdBy()).isEmpty()) {
                throw new IllegalStateException("Baseline blueprint is outside the trusted organization");
            }
            if (!blueprintVersions.lockVersions(draft.blueprintId()).contains(draft.blueprintVersion())) {
                throw new IllegalStateException("Baseline blueprint version disappeared during generation");
            }
            int version = nextVersion(draft.assessmentId());
            assessments.insert(new AssessmentVersionEntity(draft.assessmentVersionId(), draft.assessmentId(), version,
                    draft.title(), "BASELINE", null, SCORING_VERSION, "DRAFT", draft.contentHash(), draft.blueprintId(),
                    draft.blueprintVersion(), draft.generationSeed(), draft.createdBy(), draft.createdAt(),
                    draft.idempotencyKey(), draft.requestHash(), null, null, null, null, "OPEN"));
            List<AssessmentItemEntity> entries = new ArrayList<>();
            int position = 1;
            for (NewItem item : draft.items()) {
                entries.add(new AssessmentItemEntity(draft.assessmentVersionId(), position++,
                        item.candidate().itemVersionId(), true, item.scoringWeight(), item.roleId(),
                        item.roleNameSnapshot()));
            }
            manifests.insertAll(entries);
            return findByVersionId(draft.assessmentVersionId())
                    .orElseThrow(() -> new IllegalStateException("Generated assessment draft could not be reloaded"));
        } catch (DataAccessException failure) {
            if (PostgresErrors.isUniqueViolation(failure)) {
                throw new WriteConflict(failure);
            }
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
            int changed = organizationId == null
                    ? assessments.review(assessmentVersionId, reviewerId, reviewedAt, expectedContentHash)
                    : assessments.review(organization(organizationId), assessmentVersionId, reviewerId, reviewedAt,
                            expectedContentHash);
            return changed == 1;
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
            int changed = organizationId == null
                    ? assessments.publish(assessmentVersionId, expectedContentHash)
                    : assessments.publish(organization(organizationId), assessmentVersionId, expectedContentHash);
            return changed == 1;
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment could not be published", failure);
        }
    }

    @Override
    @Transactional(TransactionManagers.JPA)
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
            List<ItemVersionJpaRepository.Editable> candidates = readEditableItems(orderedItemVersionIds);
            if (candidates.size() != orderedItemVersionIds.size()) {
                throw new IllegalArgumentException(
                        "Every assessment replacement item must be published");
            }
            Map<UUID, BaselineAssessmentDraft.Item> existing = current.items().stream()
                    .collect(Collectors.toMap(BaselineAssessmentDraft.Item::itemVersionId, item -> item));
            Set<Integer> reservedSlots = orderedItemVersionIds.stream()
                    .map(existing::get).filter(Objects::nonNull)
                    .map(BaselineAssessmentDraft.Item::position)
                    .collect(Collectors.toSet());
            Set<Integer> usedSlots = new HashSet<>();
            List<ManifestRow> rows = new ArrayList<>();
            int position = 1;
            for (UUID itemId : orderedItemVersionIds) {
                ItemVersionJpaRepository.Editable item = candidates.stream()
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
            int changed = assessments.editManifest(organization(organizationId), assessmentVersionId,
                    expectedDraftRevision, normalizedTitle, contentHash);
            if (changed != 1) {
                throw new WriteConflict(new IllegalStateException(
                        "Baseline assessment draft revision is stale"));
            }
            manifests.deleteManifest(assessmentVersionId);
            manifests.insertAll(rows.stream().map(row -> new AssessmentItemEntity(assessmentVersionId, row.position(),
                    row.item().itemVersionId(), true, row.weight(), row.roleId(), row.roleName())).toList());
            return findByVersionId(organizationId, assessmentVersionId).orElseThrow();
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment manifest could not be updated", failure);
        }
    }

    @Override
    public void closeCandidate(String organizationId, UUID assessmentVersionId) {
        try {
            int changed = assessments.closeCandidate(organization(organizationId), assessmentVersionId);
            if (changed != 1) {
                throw new WriteConflict(new IllegalStateException(
                        "Open baseline assessment candidate was not found"));
            }
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment candidate could not be closed", failure);
        }
    }

    /**
     * Former single {@code INSERT ... SELECT}: copies the organization-scoped source header (next version within its
     * assessment) and its manifest rows into a new open DRAFT candidate in one transaction.
     */
    @Override
    @Transactional(TransactionManagers.JPA)
    public BaselineAssessmentDraft cloneAsOpenCandidate(CloneCandidate candidate) {
        try {
            UUID organizationId = organization(candidate.organizationId());
            String idempotencyKey = requireText(candidate.idempotencyKey(), "idempotencyKey");
            String requestHash = requireText(candidate.requestHash(), "requestHash");
            List<AssessmentVersionJpaRepository.CloneSource> sources =
                    assessments.cloneSource(organizationId, candidate.sourceAssessmentVersionId());
            if (sources.size() != 1) {
                throw new IllegalArgumentException("Historical baseline assessment was not found");
            }
            var source = sources.getFirst();
            assessments.insert(new AssessmentVersionEntity(candidate.newAssessmentVersionId(), source.assessmentId(),
                    nextVersion(source.assessmentId()), source.title(), source.purpose(), null, source.scoringVersion(),
                    "DRAFT", source.contentHash(), source.blueprintId(), source.blueprintVersion(), source.generationSeed(),
                    candidate.actorId(), candidate.occurredAt(), idempotencyKey, requestHash, null, null, null, 1L,
                    "OPEN"));
            manifests.insertAll(manifests.entries(candidate.sourceAssessmentVersionId()).stream()
                    .map(entry -> new AssessmentItemEntity(candidate.newAssessmentVersionId(), entry.position(),
                            entry.itemVersionId(), entry.required(), entry.scoringWeight(), entry.roleId(),
                            entry.roleNameSnapshot()))
                    .toList());
            return findByVersionId(candidate.organizationId(), candidate.newAssessmentVersionId())
                    .orElseThrow();
        } catch (DataAccessException failure) {
            if (PostgresErrors.isUniqueViolation(failure)) {
                throw new WriteConflict(failure);
            }
            throw unavailable("Baseline assessment candidate could not be cloned", failure);
        }
    }

    private List<ItemVersionJpaRepository.Editable> readEditableItems(List<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return itemVersions.editable(ids);
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
        String text = Objects.toString(value, "").strip();
        target.append(text.length()).append(':').append(text).append('|');
    }

    private int nextVersion(UUID assessmentId) {
        Integer latest = assessments.latestVersion(assessmentId);
        return Math.addExact(latest == null ? 0 : latest, 1);
    }

    /**
     * Former {@code CAST(:organizationId AS uuid)} of the trimmed, required organization text; an unparsable id still
     * surfaces as a data access failure (and so as {@link DependencyUnavailable}).
     */
    private static UUID organization(String organizationId) {
        String text = requireText(organizationId, "organizationId");
        try {
            return UUID.fromString(text);
        } catch (IllegalArgumentException invalid) {
            throw new InvalidDataAccessApiUsageException("organizationId is not a uuid", invalid);
        }
    }

    private static int intValue(Integer value) {
        return value == null ? 0 : value;
    }

    private static long longValue(Long value) {
        return value == null ? 0L : value;
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

    private record ManifestRow(
            int position, ItemVersionJpaRepository.Editable item, String roleId, String roleName,
            BigDecimal weight) {}
}
