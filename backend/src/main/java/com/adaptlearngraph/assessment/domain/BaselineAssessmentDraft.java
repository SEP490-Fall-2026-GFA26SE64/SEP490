package com.adaptlearngraph.assessment.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Immutable generated manifest. Exact item versions are selected once and persisted. */
public record BaselineAssessmentDraft(
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
        PublicationState publicationState,
        UUID reviewedBy,
        Instant reviewedAt,
        String reviewedContentHash,
        List<Item> items) {

    public BaselineAssessmentDraft {
        Objects.requireNonNull(assessmentVersionId, "assessmentVersionId must not be null");
        Objects.requireNonNull(assessmentId, "assessmentId must not be null");
        if (version < 1 || blueprintVersion < 1) {
            throw new IllegalArgumentException("assessment and blueprint versions must be positive");
        }
        title = requireText(title, "title");
        Objects.requireNonNull(blueprintId, "blueprintId must not be null");
        Objects.requireNonNull(createdBy, "createdBy must not be null");
        Objects.requireNonNull(createdAt, "createdAt must not be null");
        generationRequestHash = requireText(generationRequestHash, "generationRequestHash");
        contentHash = requireText(contentHash, "contentHash");
        Objects.requireNonNull(publicationState, "publicationState must not be null");
        boolean hasReview = reviewedBy != null || reviewedAt != null || reviewedContentHash != null;
        if (hasReview && (reviewedBy == null || reviewedAt == null || reviewedContentHash == null)) {
            throw new IllegalArgumentException("review metadata must be complete");
        }
        if (reviewedContentHash != null && !reviewedContentHash.equals(contentHash)) {
            throw new IllegalArgumentException("reviewedContentHash must match contentHash");
        }
        if (publicationState == PublicationState.PUBLISHED && reviewedContentHash == null) {
            throw new IllegalArgumentException("published baseline assessment must be reviewed");
        }
        items = List.copyOf(Objects.requireNonNull(items, "items must not be null"));
        if (items.isEmpty()) {
            throw new IllegalArgumentException("generated assessment must contain items");
        }
        Set<Integer> positions = new HashSet<>();
        Set<UUID> itemVersions = new HashSet<>();
        for (Item item : items) {
            if (!positions.add(item.position())) {
                throw new IllegalArgumentException("item positions must be unique");
            }
            if (!itemVersions.add(item.itemVersionId())) {
                throw new IllegalArgumentException("item versions must not repeat");
            }
        }
    }

    public enum PublicationState {
        DRAFT,
        PUBLISHED
    }

    public record Item(
            int position,
            UUID itemVersionId,
            String roleId,
            String roleNameSnapshot,
            String microSkillId,
            String microSkillNameSnapshot,
            String difficulty,
            BigDecimal scoringWeight,
            String prompt,
            String responseSchemaJson) {
        public Item {
            if (position < 1) {
                throw new IllegalArgumentException("position must be positive");
            }
            Objects.requireNonNull(itemVersionId, "itemVersionId must not be null");
            roleId = requireText(roleId, "roleId");
            roleNameSnapshot = requireText(roleNameSnapshot, "roleNameSnapshot");
            microSkillId = requireText(microSkillId, "microSkillId");
            microSkillNameSnapshot = requireText(microSkillNameSnapshot, "microSkillNameSnapshot");
            difficulty = requireText(difficulty, "difficulty");
            if (!Set.of("EASY", "MEDIUM", "HARD").contains(difficulty)) {
                throw new IllegalArgumentException("difficulty is invalid");
            }
            Objects.requireNonNull(scoringWeight, "scoringWeight must not be null");
            if (scoringWeight.signum() < 0) {
                throw new IllegalArgumentException("scoringWeight must not be negative");
            }
            prompt = requireText(prompt, "prompt");
            responseSchemaJson = requireText(responseSchemaJson, "responseSchemaJson");
        }
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }
}
