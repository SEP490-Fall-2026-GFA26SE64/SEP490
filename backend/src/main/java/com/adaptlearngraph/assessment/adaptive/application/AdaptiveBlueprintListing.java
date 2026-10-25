package com.adaptlearngraph.assessment.adaptive.application;

import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.VersionId;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** PostgreSQL history projection; availability is independent of live Catalog readiness. */
public final class AdaptiveBlueprintListing {
    private AdaptiveBlueprintListing() {}
    public enum Status { DRAFT, ACTIVE, RETIRING, INACTIVE }
    public enum Type { DRAFT, VERSION }
    public enum Direction { NEWEST, OLDEST }
    public record Query(String search, Status status, Direction direction, int page, int size, String occupationId) {
        public Query {
            search = search == null ? "" : search.strip();
            if (direction == null || page < 0 || size < 1 || size > 100 || search.length() > 1000
                    || occupationId != null && (occupationId.isBlank() || !occupationId.equals(occupationId.strip()))) {
                throw new IllegalArgumentException("Invalid Blueprint list query");
            }
        }
    }
    /** Draft ID or version pair are stable row identities; blueprintId groups an Occupation's rows. */
    public record Row(UUID blueprintId, UUID workingRevisionId, Integer version, String name,
                      String occupationId, String occupationName, Type type, Status status,
                      String dateLabel, Instant date, long inProgressCount, boolean configurationUpdateRequired,
                      long revision, VersionId current) {}
    public record Page(List<Row> rows, long total, int page, int size) {
        public Page { rows = List.copyOf(rows); }
    }
}
