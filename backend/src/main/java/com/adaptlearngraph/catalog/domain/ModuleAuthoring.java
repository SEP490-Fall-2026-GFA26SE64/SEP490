package com.adaptlearngraph.catalog.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;

/** Authoring snapshots are separate from the current Neo4j catalog projection. */
public final class ModuleAuthoring {
    private ModuleAuthoring() {}
    public record Actor(String id, String organizationId, Set<String> roles) {
        public Actor { roles = Set.copyOf(roles); }
        public boolean manager() { return roles.contains("LD_MANAGER"); }
        public boolean expert() { return roles.contains("EXPERT"); }
    }
    public record Choice(String id, String name) {}
    public record Metadata(String id, String version, String status, String reviewStatus,
                           String reviewedBy, String reviewedAt) {
        public Metadata approved(String actor, String time, String lifecycle) {
            return new Metadata(id, version, lifecycle, "APPROVED", actor, time);
        }
        public Metadata rejected(String actor, String time) {
            return new Metadata(id, version, "DRAFT", "REJECTED", actor, time);
        }
    }
    public record Teaching(Metadata metadata, String skillId, String skillName,
                           String teachingFocus, String difficultyLevel) {
        public Teaching {
            text(skillId, "skillId", 200);
            oneOf(teachingFocus, Set.of("PRIMARY", "SUPPORTING", "INCIDENTAL"), "teachingFocus");
            oneOf(difficultyLevel, Set.of("LOW", "MEDIUM", "HIGH"), "difficultyLevel");
        }
    }
    public record Content(String id, String title, String markdown, String contentType,
                          String contentVersion, List<String> occupationIds, String createdBy, String createdAt) {
        public Content {
            text(title, "title", 240); text(markdown, "markdown", 200_000);
            occupationIds = List.copyOf(occupationIds);
            // Allow linked HTTPS videos, never executable markdown links or raw HTML embeds.
            if (markdown.matches("(?is).*(javascript\\s*:|data\\s*:|<\\s*(script|iframe|object)\\b).*")) {
                throw new IllegalArgumentException("Content contains an unsafe embed");
            }
        }
    }
    public record Package(Metadata metadata, String title, String moduleType, String contentUri,
                          String contentType, String contentVersion, int duration, BigDecimal price,
                          List<Teaching> teachings, Content content) {
        public Package {
            text(title, "title", 240);
            oneOf(moduleType, Set.of("LESSON_AND_PRACTICE", "RESOURCE_GUIDED_PRACTICE"), "moduleType");
            text(contentUri, "contentUri", 500); text(contentVersion, "contentVersion", 100);
            if (!"text/markdown".equals(contentType)) throw new IllegalArgumentException("Only Markdown packages are supported");
            if (duration <= 0 || price == null || price.signum() <= 0 || price.scale() > 2 || !Double.isFinite(price.doubleValue())) {
                throw new IllegalArgumentException("Duration and VND price must be positive; price accepts at most two decimals");
            }
            teachings = List.copyOf(teachings);
            if (teachings.isEmpty() || teachings.size() > 200
                    || teachings.stream().filter(t -> "PRIMARY".equals(t.teachingFocus())).count() != 1
                    || teachings.stream().map(Teaching::skillId).distinct().count() != teachings.size()) {
                throw new IllegalArgumentException("Select unique skills with exactly one primary skill");
            }
        }
        public Package approved(String actor, String time, String lifecycle) {
            return new Package(metadata.approved(actor, time, lifecycle), title, moduleType, contentUri,
                    contentType, contentVersion, duration, price, teachings.stream().map(t -> new Teaching(
                    t.metadata().approved(actor, time, lifecycle), t.skillId(), t.skillName(), t.teachingFocus(), t.difficultyLevel())).toList(), content);
        }
        public Package rejected(String actor, String time) {
            return new Package(metadata.rejected(actor, time), title, moduleType, contentUri,
                    contentType, contentVersion, duration, price, teachings.stream().map(t -> new Teaching(
                    t.metadata().rejected(actor, time), t.skillId(), t.skillName(), t.teachingFocus(), t.difficultyLevel())).toList(), content);
        }
    }
    public record Revision(int number, String state, Package payload, String editedBy, String editedAt,
                           String decidedBy, String decidedAt, String feedback) {}
    public record Event(int sequence, int revision, String action, String actorId, String occurredAt, String detail) {}
    public record Document(String id, String organizationId, List<String> occupationIds,
                           String createdBy, String createdAt, long lockVersion, boolean everReleased,
                           boolean archived, Integer releasedRevision, List<Revision> revisions, List<Event> history, Intake intake) {
        public Document(String id, String organizationId, List<String> occupationIds, String createdBy, String createdAt,
                        long lockVersion, boolean everReleased, boolean archived, Integer releasedRevision,
                        List<Revision> revisions, List<Event> history) {
            this(id, organizationId, occupationIds, createdBy, createdAt, lockVersion, everReleased, archived, releasedRevision, revisions, history, null);
        }
        public Document {
            occupationIds = List.copyOf(occupationIds); revisions = List.copyOf(revisions); history = List.copyOf(history);
        }
        public Revision current() { return revisions.get(revisions.size() - 1); }
        public Revision released() {
            return releasedRevision == null ? null : revisions.stream().filter(r -> r.number() == releasedRevision).findFirst().orElseThrow();
        }
    }
    public record TeachingInput(String skillId, String teachingFocus, String difficultyLevel) {}
    public record Save(String title, String moduleType, String contentId, int duration, BigDecimal price,
                       List<String> occupationIds, List<TeachingInput> teachings) {}
    public record Page(List<Document> items, int total, int page, int pageSize) {}
    /** Read catalog values as stored, including absent historical metadata; never invent audit history. */
    public record CatalogTeaching(Metadata metadata, String skillId, String skillName,
                                  String teachingFocus, String difficultyLevel) {}
    public record CatalogModule(Metadata metadata, String title, String moduleType, String contentUri,
                                String contentType, String contentVersion, Integer duration, BigDecimal price,
                                List<CatalogTeaching> teachings) {
        public CatalogModule { teachings = List.copyOf(teachings); }
    }
    public record Intake(String moduleId, String organizationId, List<String> occupationIds, String assignedBy,
                         String assignedAt, CatalogModule source, String acceptedBy, String acceptedAt, List<Event> history) {
        public Intake { occupationIds = List.copyOf(occupationIds); history = List.copyOf(history); }
    }
    public record CatalogItem(CatalogModule module, Document authoring, Intake intake) {
        public CatalogItem(CatalogModule module, Document authoring) { this(module, authoring, authoring == null ? null : authoring.intake()); }
    }
    public record CatalogPage(List<CatalogItem> items, int total, int page, int pageSize) {}
    public record Grant(String expertId, String occupationId) {}
    public static String now() { return Instant.now().toString(); }
    public static void text(String value, String name, int max) {
        if (value == null || value.isBlank() || value.length() > max) throw new IllegalArgumentException("Invalid " + name);
    }
    public static void oneOf(String value, Set<String> allowed, String name) {
        if (!allowed.contains(value == null ? "" : value)) throw new IllegalArgumentException("Invalid " + name);
    }
}
