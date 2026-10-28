package com.adaptlearngraph.catalog.application;

import com.adaptlearngraph.catalog.application.port.out.ModuleAuthoringPort;
import com.adaptlearngraph.catalog.domain.ModuleAuthoring;
import com.adaptlearngraph.catalog.domain.ModuleAuthoring.*;
import java.util.*;

public final class ModuleAuthoringService {
    public static final class Failure extends RuntimeException {
        private final int status;
        public Failure(int status, String message) { super(message); this.status = status; }
        public int status() { return status; }
    }
    private final ModuleAuthoringPort port;
    public ModuleAuthoringService(ModuleAuthoringPort port) { this.port = port; }
    private Actor staff() {
        Actor actor = port.actor();
        if (!actor.expert() && !actor.manager()) throw new Failure(403, "Expert or L&D access required");
        return actor;
    }
    private void manager(Actor actor) { if (!actor.manager()) throw new Failure(403, "L&D approval required"); }
    private void expert(Actor actor) { if (!actor.expert()) throw new Failure(403, "Expert authoring access required"); }
    private boolean visible(Actor actor, List<String> scopes) {
        return actor.manager() || scopes.stream().anyMatch(port.occupations(actor)::contains);
    }
    private Document require(Actor actor, String id) {
        Document doc = port.lock(actor.organizationId(), id).orElseThrow(() -> new Failure(404, "Module not found"));
        if (!visible(actor, doc.occupationIds())) throw new Failure(404, "Module not found");
        return doc;
    }
    public Actor session() { return port.actor(); }
    public List<Choice> choices(String kind) {
        Actor actor = staff();
        if (!Set.of("Occupation", "MicroSkill", "Expert").contains(kind)) throw new Failure(400, "Invalid catalog");
        if (kind.equals("Expert")) manager(actor);
        return port.catalog(kind).stream().filter(c -> !kind.equals("Occupation") || actor.manager()
                || port.occupations(actor).contains(c.id())).toList();
    }
    public List<Grant> grants() { Actor actor = staff(); manager(actor); return port.grants(actor.organizationId()); }
    public void grant(String expertId, String occupationId, boolean active) {
        Actor actor = staff(); manager(actor); ModuleAuthoring.text(expertId, "expertId", 200);
        if (port.catalog("Expert").stream().noneMatch(c -> c.id().equals(expertId))) throw new Failure(400, "Select an active Expert account");
        if (port.catalog("Occupation").stream().noneMatch(c -> c.id().equals(occupationId))) throw new Failure(400, "Unknown occupation");
        port.transaction(() -> { port.grant(actor.organizationId(), expertId, occupationId, active); return null; });
    }
    public List<Content> contents() {
        Actor actor = staff(); return port.contents(actor.organizationId()).stream().filter(c -> visible(actor, c.occupationIds())).toList();
    }
    public Content content(String title, String markdown, List<String> occupations) {
        Actor actor = staff(); expert(actor); scope(actor, occupations);
        ModuleAuthoring.text(title, "title", 240);
        Content content = new Content(UUID.randomUUID().toString(), title.strip(), markdown, "text/markdown", "1.0",
                occupations, actor.id(), ModuleAuthoring.now());
        return port.transaction(() -> { port.saveContent(actor.organizationId(), content); return content; });
    }
    private void scope(Actor actor, List<String> occupations) {
        if (occupations == null || occupations.isEmpty() || new HashSet<>(occupations).size() != occupations.size()
                || !visible(actor, occupations)) throw new Failure(403, "An assigned occupation is required");
        Set<String> known = new HashSet<>(port.catalog("Occupation").stream().map(Choice::id).toList());
        if (!known.containsAll(occupations)) throw new Failure(400, "Unknown occupation");
        // Sharing into a new occupation requires a grant there; any owner may edit an already shared module.
        if (!actor.manager() && !port.occupations(actor).containsAll(occupations)) throw new Failure(403, "Cannot create membership outside assigned occupations");
    }
    public Page list(String search, String status, String review, String type, String skill, int page) {
        Actor actor = staff(); String query = search == null ? "" : search.strip().toLowerCase(Locale.ROOT);
        List<Document> all = port.documents(actor.organizationId()).stream().filter(d -> visible(actor, d.occupationIds()))
                .filter(d -> d.id().toLowerCase(Locale.ROOT).contains(query) || d.current().payload().title().toLowerCase(Locale.ROOT).contains(query))
                .filter(d -> status == null || status.isBlank() || (d.current().state().equals("ARCHIVED") ? "ARCHIVED" : d.current().payload().metadata().status()).equals(status))
                .filter(d -> review == null || review.isBlank() || d.current().payload().metadata().reviewStatus().equals(review))
                .filter(d -> type == null || type.isBlank() || d.current().payload().moduleType().equals(type))
                .filter(d -> skill == null || skill.isBlank() || d.current().payload().teachings().stream().anyMatch(t -> t.skillId().equals(skill)))
                .sorted(Comparator.comparing(Document::createdAt).reversed().thenComparing(Document::id)).toList();
        int safe = Math.min(Math.max(1, page), Math.max(1, (all.size() + 9) / 10)), start = Math.min(all.size(), (safe - 1) * 10);
        return new Page(all.subList(start, Math.min(all.size(), start + 10)), all.size(), safe, 10);
    }
    public Document detail(String id) { Actor actor = staff(); return port.transaction(() -> require(actor, id)); }
    public CatalogPage catalogList(String search, String status, String review, String type, String skill, int page) {
        Actor actor = staff();
        Set<String> granted = new HashSet<>(port.occupations(actor));
        Map<String, Document> authorized = new HashMap<>();
        for (Document doc : port.documents(actor.organizationId())) {
            if (actor.manager() || doc.occupationIds().stream().anyMatch(granted::contains)) authorized.put(doc.id(), doc);
        }
        Set<String> managed = new HashSet<>(port.managedModuleIds());
        Map<String, Intake> intakes = new HashMap<>();
        for (Intake intake : port.intakes(actor.organizationId())) if (visible(actor, intake.occupationIds())) intakes.put(intake.moduleId(), intake);
        Map<String, CatalogItem> combined = new HashMap<>();
        for (CatalogModule module : port.graphModules(actor.organizationId())) {
            String id = module.metadata().id();
            // Shared ontology modules are browsable; authored packages retain their organization/scope boundary.
            if (!managed.contains(id) || authorized.containsKey(id)) combined.put(id, new CatalogItem(module, authorized.get(id), intakes.get(id)));
        }
        for (Document doc : authorized.values()) {
            if (!combined.containsKey(doc.id())) {
                var p = doc.current().payload();
                var teachings = p.teachings().stream().map(t -> new CatalogTeaching(t.metadata(), t.skillId(), t.skillName(), t.teachingFocus(), t.difficultyLevel())).toList();
                combined.put(doc.id(), new CatalogItem(new CatalogModule(p.metadata(), p.title(), p.moduleType(), p.contentUri(),
                        p.contentType(), p.contentVersion(), p.duration(), p.price(), teachings), doc));
            }
        }
        String query = search == null ? "" : search.strip().toLowerCase(Locale.ROOT);
        List<CatalogItem> all = combined.values().stream()
                .filter(item -> item.module().metadata().id().toLowerCase(Locale.ROOT).contains(query)
                        || (item.module().title() != null && item.module().title().toLowerCase(Locale.ROOT).contains(query)))
                .filter(item -> status == null || status.isBlank() || status.equals(item.module().metadata().status()))
                .filter(item -> review == null || review.isBlank() || review.equals(item.module().metadata().reviewStatus()))
                .filter(item -> type == null || type.isBlank() || type.equals(item.module().moduleType()))
                .filter(item -> skill == null || skill.isBlank() || item.module().teachings().stream().anyMatch(t -> skill.equals(t.skillId())))
                .sorted(Comparator.comparing((CatalogItem item) -> item.module().title() == null ? "" : item.module().title(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(item -> item.module().metadata().id())).toList();
        int safe = Math.min(Math.max(1, page), Math.max(1, (all.size() + 9) / 10));
        int start = Math.min(all.size(), (safe - 1) * 10);
        return new CatalogPage(all.subList(start, Math.min(all.size(), start + 10)), all.size(), safe, 10);
    }
    private CatalogModule source(Actor actor, String id) {
        return port.graphModules(actor.organizationId()).stream().filter(m -> m.metadata().id().equals(id))
                .findFirst().orElseThrow(() -> new Failure(404, "Catalog module not found"));
    }
    public Intake assignIntake(String id, List<String> occupations) { return assignIntake(id, occupations, null); }
    public Intake assignIntake(String id, List<String> occupations, String expectedAssignedAt) {
        Actor actor = staff(); manager(actor); scope(actor, occupations);
        return port.transaction(() -> {
            port.lockCatalogIdentity(id);
            if (port.managedModuleIds().contains(id)) throw new Failure(409, "Module already managed. Reload the catalog.");
            Intake previous = port.intakes(actor.organizationId()).stream().filter(i -> i.moduleId().equals(id)).findFirst().orElse(null);
            if (port.intakeExists(id) && (previous == null || previous.acceptedBy() != null || !Objects.equals(previous.assignedAt(), expectedAssignedAt))) throw new Failure(409, "Module assignment changed or belongs to another workflow. Reload the catalog.");
            CatalogModule source = source(actor, id);
            if (!"ACTIVE".equals(source.metadata().status())) throw new Failure(409, "Only active catalog modules can be received");
            String now = ModuleAuthoring.now();
            List<Event> history = previous == null ? new ArrayList<>() : new ArrayList<>(previous.history());
            history.add(new Event(history.size() + 1, 1, "ASSIGN_INTAKE", actor.id(), now, "Responsible occupations: " + String.join(", ", occupations)));
            Intake intake = new Intake(id, actor.organizationId(), occupations, actor.id(), now, source, null, null, history);
            port.saveIntake(intake); return intake;
        });
    }
    public Document acceptIntake(String id) {
        Actor actor = staff(); expert(actor);
        return port.transaction(() -> {
            port.lockCatalogIdentity(id);
            Intake assigned = port.intakes(actor.organizationId()).stream().filter(i -> i.moduleId().equals(id))
                    .findFirst().orElseThrow(() -> new Failure(404, "Module assignment not found"));
            if (!visible(actor, assigned.occupationIds())) throw new Failure(404, "Module assignment not found");
            if (assigned.acceptedBy() != null || port.managedModuleIds().contains(id)) throw new Failure(409, "Module already received. Reload the catalog.");
            CatalogModule source = source(actor, id);
            if (!source.equals(assigned.source())) throw new Failure(409, "Catalog changed since assignment. Ask L&D to refresh the assignment.");
            String now = ModuleAuthoring.now();
            Content content = new Content(UUID.randomUUID().toString(), source.title(), port.importedMarkdown(source.contentUri()),
                    source.contentType(), source.contentVersion(), assigned.occupationIds(), null, now);
            var teachings = source.teachings().stream().map(t -> new Teaching(draftMetadata(t.metadata()), t.skillId(), t.skillName(), t.teachingFocus(), t.difficultyLevel())).toList();
            var payload = new ModuleAuthoring.Package(draftMetadata(source.metadata()), source.title(), source.moduleType(), source.contentUri(),
                    source.contentType(), source.contentVersion(), source.duration() == null ? 0 : source.duration(), source.price(), teachings, content);
            Intake accepted = new Intake(id, actor.organizationId(), assigned.occupationIds(), assigned.assignedBy(), assigned.assignedAt(), source, actor.id(), now, assigned.history());
            Revision revision = new Revision(1, "DRAFT", payload, actor.id(), now, null, null, null);
            List<Event> history = new ArrayList<>(assigned.history());
            history.add(new Event(history.size() + 1, 1, "INTAKE", actor.id(), now, "Received imported catalog module; original creator unknown"));
            Document doc = new Document(id, actor.organizationId(), assigned.occupationIds(), null, now, 1, false, false, null,
                    List.of(revision), history, accepted);
            port.saveContent(actor.organizationId(), content); port.saveIntake(accepted); port.save(doc); return doc;
        });
    }
    private Metadata draftMetadata(Metadata source) {
        ModuleAuthoring.text(source.id(), "source id", 200); ModuleAuthoring.text(source.version(), "source version", 100);
        return new Metadata(source.id(), source.version(), "DRAFT", "NEEDS_EXPERT_REVIEW", null, null);
    }
    public Document create(Save input) {
        Actor actor = staff(); expert(actor); scope(actor, input.occupationIds());
        return port.transaction(() -> {
            String id = "MOD-" + UUID.randomUUID(); String now = ModuleAuthoring.now();
            Revision revision = new Revision(1, "DRAFT", payload(actor, id, input, null), actor.id(), now, null, null, null);
            Document doc = new Document(id, actor.organizationId(), input.occupationIds(), actor.id(), now, 1,
                    false, false, null, List.of(revision), List.of(new Event(1, 1, "CREATE", actor.id(), now, "Created complete draft")));
            port.save(doc); return doc;
        });
    }
    private ModuleAuthoring.Package payload(Actor actor, String id, Save input, ModuleAuthoring.Package previous) {
        Content content = port.contents(actor.organizationId()).stream().filter(c -> c.id().equals(input.contentId())
                && visible(actor, c.occupationIds()) && c.occupationIds().containsAll(input.occupationIds()))
                .findFirst().orElseThrow(() -> new Failure(400, "Select content covering the module occupations"));
        Map<String, String> skills = new HashMap<>(); port.catalog("MicroSkill").forEach(c -> skills.put(c.id(), c.name()));
        if (input.teachings() == null) throw new Failure(400, "Skills are required");
        List<Teaching> mappings = input.teachings().stream().map(t -> {
            if (!skills.containsKey(t.skillId())) throw new Failure(400, "Unknown skill");
            String relationId = previous == null ? UUID.randomUUID().toString() : previous.teachings().stream()
                    .filter(old -> old.skillId().equals(t.skillId())).map(old -> old.metadata().id()).findFirst().orElseGet(() -> UUID.randomUUID().toString());
            return new Teaching(new Metadata(relationId, "0.11.0", "DRAFT", "NEEDS_EXPERT_REVIEW", null, null),
                    t.skillId(), skills.get(t.skillId()), t.teachingFocus(), t.difficultyLevel());
        }).toList();
        return new ModuleAuthoring.Package(new Metadata(id, "0.11.0", "DRAFT", "NEEDS_EXPERT_REVIEW", null, null),
                input.title(), input.moduleType(), "module-content:" + content.id(), content.contentType(), content.contentVersion(),
                input.duration(), input.price(), mappings, content);
    }
    public Document update(String id, long expected, Save input) {
        Actor actor = staff(); expert(actor);
        return port.transaction(() -> {
            Document doc = require(actor, id); check(doc, expected);
            if (!Set.of("DRAFT", "RETURNED", "RELEASED").contains(doc.current().state())) throw new Failure(409, "Module is not editable");
            if (!doc.occupationIds().equals(input.occupationIds())) throw new Failure(409, "Occupation membership cannot be changed through editing");
            int number = doc.current().number() + 1;
            Revision revision = new Revision(number, "DRAFT", payload(actor, id, input, doc.current().payload()), actor.id(), ModuleAuthoring.now(), null, null, null);
            var before = doc.current().payload();
            List<String> changes = new ArrayList<>();
            if (!before.title().equals(input.title())) changes.add("title");
            if (!before.moduleType().equals(input.moduleType())) changes.add("moduleType");
            if (!before.content().id().equals(input.contentId())) changes.add("content");
            if (before.duration() != input.duration()) changes.add("duration");
            if (before.price().compareTo(input.price()) != 0) changes.add("price");
            if (!before.teachings().stream().map(t -> new TeachingInput(t.skillId(), t.teachingFocus(), t.difficultyLevel())).toList().equals(input.teachings())) changes.add("teachings");
            return changed(doc, revision, actor, "EDIT", changes.isEmpty() ? "Saved unchanged package" : "Changed: " + String.join(", ", changes), doc.archived(), doc.releasedRevision());
        });
    }
    private void check(Document doc, long expected) { if (doc.lockVersion() != expected) throw new Failure(409, "Module changed. Reload and review the latest revision"); }
    public Document action(String id, long expected, String action, String feedback) {
        Actor actor = staff();
        Document result = port.transaction(() -> {
            Document doc = require(actor, id); check(doc, expected); Revision old = doc.current();
            String next; String now = ModuleAuthoring.now(); boolean archived = doc.archived(); Integer released = doc.releasedRevision();
            switch (action) {
                case "submit" -> { expert(actor); state(old, "DRAFT", "RETURNED"); next = "SUBMITTED"; }
                case "return" -> { manager(actor); state(old, "SUBMITTED", "ARCHIVE_REQUESTED"); ModuleAuthoring.text(feedback, "feedback", 2000); next = old.state().equals("ARCHIVE_REQUESTED") ? "RELEASED" : "RETURNED"; }
                case "approve" -> { manager(actor); state(old, "SUBMITTED");
                    if (doc.intake() != null && !doc.everReleased() && !source(actor, id).equals(doc.intake().source())) throw new Failure(409, "Catalog changed since intake; publication requires reconciliation");
                    next = "PUBLISH_PENDING"; }
                case "retry" -> { manager(actor); state(old, "PUBLISH_PENDING", "ARCHIVE_PENDING"); next = old.state(); }
                case "request-archive" -> { expert(actor); state(old, "RELEASED"); next = "ARCHIVE_REQUESTED"; }
                case "approve-archive" -> { manager(actor); state(old, "ARCHIVE_REQUESTED"); if (!port.retainsCoverage(doc)) throw new Failure(409, "Archive would remove a required skill provider"); next = "ARCHIVE_PENDING"; }
                case "restore" -> {
                    expert(actor); if (!archived) throw new Failure(409, "Module is not archived");
                    ModuleAuthoring.Package p = old.payload();
                    Save input = new Save(p.title(), p.moduleType(), p.content().id(), p.duration(), p.price(), doc.occupationIds(), p.teachings().stream().map(t -> new TeachingInput(t.skillId(), t.teachingFocus(), t.difficultyLevel())).toList());
                    Revision fresh = new Revision(old.number() + 1, "DRAFT", payload(actor, id, input, p), actor.id(), now, null, null, null);
                    return changed(doc, fresh, actor, "RESTORE", "Restored to draft; approval required", true, released);
                }
                default -> throw new Failure(400, "Unknown action");
            }
            var payload = action.equals("return") && old.state().equals("SUBMITTED") ? old.payload().rejected(actor.id(), now) : old.payload();
            Revision revision = new Revision(old.number(), next, payload, old.editedBy(), old.editedAt(),
                    actor.manager() && !action.equals("retry") ? actor.id() : old.decidedBy(),
                    actor.manager() && !action.equals("retry") ? now : old.decidedAt(), feedback);
            return changed(doc, revision, actor, action.toUpperCase(Locale.ROOT), feedback, archived, released);
        });
        if (Set.of("PUBLISH_PENDING", "ARCHIVE_PENDING").contains(result.current().state())) return publish(result.id());
        return result;
    }
    private Document publish(String id) {
        Actor actor = staff(); manager(actor);
        return port.transaction(() -> {
            Document doc = require(actor, id); Revision old = doc.current();
            state(old, "PUBLISH_PENDING", "ARCHIVE_PENDING"); boolean archive = old.state().equals("ARCHIVE_PENDING");
            if (archive && !port.retainsCoverage(doc)) throw new Failure(409, "Archive would remove a required skill provider");
            ModuleAuthoring.Package approved = old.payload().approved(old.decidedBy(), old.decidedAt(), archive ? "ARCHIVED" : "ACTIVE");
            Revision projection = new Revision(old.number(), archive ? "ARCHIVED" : "RELEASED", approved,
                    old.editedBy(), old.editedAt(), old.decidedBy(), old.decidedAt(), old.feedback());
            // Pending state is committed before this retryable cross-store projection.
            port.project(doc, projection, archive);
            // Archive changes catalog availability, not the historical package pinned by learners.
            Revision released = archive ? new Revision(old.number(), "ARCHIVED", old.payload(), old.editedBy(), old.editedAt(), old.decidedBy(), old.decidedAt(), old.feedback()) : projection;
            return changed(doc, released, actor, archive ? "ARCHIVED" : "RELEASED", "Catalog projection confirmed", archive, archive ? doc.releasedRevision() : old.number());
        });
    }
    private void state(Revision revision, String... states) { if (!Arrays.asList(states).contains(revision.state())) throw new Failure(409, "Action is not available in the current state"); }
    private Document changed(Document doc, Revision revision, Actor actor, String action, String detail, boolean archived, Integer released) {
        List<Revision> revisions = new ArrayList<>(doc.revisions());
        if (revision.number() == doc.current().number()) revisions.set(revisions.size() - 1, revision); else revisions.add(revision);
        List<Event> history = new ArrayList<>(doc.history()); history.add(new Event(history.size() + 1, revision.number(), action, actor.id(), ModuleAuthoring.now(), detail));
        Document result = new Document(doc.id(), doc.organizationId(), doc.occupationIds(), doc.createdBy(), doc.createdAt(), doc.lockVersion() + 1,
                doc.everReleased() || released != null, archived, released, revisions, history, doc.intake());
        port.save(result); return result;
    }
    public void delete(String id, long expected) {
        Actor actor = staff(); expert(actor); port.transaction(() -> {
            Document doc = require(actor, id); check(doc, expected); state(doc.current(), "DRAFT");
            if (doc.intake() != null || doc.everReleased() || port.referenced(doc)) throw new Failure(409, "Referenced modules must be archived");
            port.delete(doc); return null;
        });
    }
    public Revision learning(String id, boolean start) {
        Actor actor = port.actor(); if (!actor.roles().contains("EMPLOYEE")) throw new Failure(403, "Employee access required");
        return port.transaction(() -> {
            Document doc = port.lock(actor.organizationId(), id).orElseThrow(() -> new Failure(404, "Module not found"));
            Optional<Integer> pin = port.pinned(actor.organizationId(), actor.id(), id);
            if (pin.isPresent()) return doc.revisions().stream().filter(r -> r.number() == pin.get()).findFirst().orElseThrow();
            if (!start || doc.archived() || doc.released() == null) throw new Failure(409, "No available learning package");
            port.pin(actor.organizationId(), actor.id(), id, doc.releasedRevision()); return doc.released();
        });
    }
}
