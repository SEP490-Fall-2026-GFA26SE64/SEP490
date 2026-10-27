package com.adaptlearngraph.learning.application;

import java.time.Instant;
import java.util.*;

/** Current catalog contract. Transactional selection and read-only next-step policy behind ports. */
public final class RoleBaselineFlow {
    public record Actor(UUID organizationId, UUID learnerId) {}
    public record Skill(String id, String code, String name, double requiredScore, boolean mandatory) {}
    public record Level(String id, String code, String name, int rank, String context,
                        String attainmentRule, List<Skill> skills) {}
    public record Role(String id, String code, String name, String scope, String occupationId,
                       String occupationName, String catalogVersion, String fingerprint, List<Level> levels) {}
    public record Selection(UUID selectionId, Role role, long revision, Instant selectedAt, boolean available,String levelId) {
        public Selection(UUID id,Role role,long revision,Instant selectedAt,boolean available){this(id,role,revision,selectedAt,available,null);}
    }
    public record Progress(String state, int requiredCount, int coveredCount, UUID attemptId,
                           Integer baselineVersion) {}
    public record View(Selection selection, Progress progress) {}
    public record MasterySkill(String id, String name, double mastery, String confidence) {}
    public record MasteryProfile(String occupationId, String occupationName, UUID attemptId,
                                 int baselineVersion, Instant initializedAt, List<MasterySkill> skills) {}
    public List<MasteryProfile> mastery() { return baseline.mastery(identity.requireEmployee()); }
    public interface Identity { Actor requireEmployee(); }
    public interface Catalog { List<Role> roles(UUID organization); }
    public interface Store {
        <T> T transaction(Actor actor, java.util.function.Supplier<T> work);
        Optional<Selection> current(Actor actor);
        Optional<Selection> replay(Actor actor, String key, String hash);
        boolean assessmentActive(Actor actor);
        Selection select(Actor actor, Role role, String key, String hash);
        default Selection select(Actor actor,Role role,String levelId,String key,String hash) {
            if(levelId!=null)throw new Failure(503,"LEVEL_SELECTION_UNAVAILABLE");
            return select(actor,role,key,hash);
        }
    }
    public interface Baseline {
        List<MasteryProfile> mastery(Actor actor);
        Optional<Progress> active(Actor actor);
        Progress progress(Actor actor, Role role, Set<String> requiredSkills);
    }
    public static final class Failure extends RuntimeException {
        public final int status; public final String code;
        public Failure(int status, String code) { super(code); this.status=status; this.code=code; }
    }
    private final Identity identity; private final Catalog catalog; private final Store store; private final Baseline baseline;
    public RoleBaselineFlow(Identity identity, Catalog catalog, Store store, Baseline baseline) {
        this.identity=identity; this.catalog=catalog; this.store=store; this.baseline=baseline;
    }
    public List<Role> roles(String search) {
        var actor=identity.requireEmployee();
        String term=search == null ? "" : search.strip().toLowerCase(Locale.ROOT);
        if (term.length()>100) throw new Failure(400,"INVALID_REQUEST");
        return catalog.roles(actor.organizationId()).stream()
                .filter(r -> (r.name()+" "+r.occupationName()+" "+r.scope()).toLowerCase(Locale.ROOT).contains(term)).toList();
    }
    public View view() {
        var actor=identity.requireEmployee(); var selected=store.current(actor);
        if (selected.isEmpty()) return new View(null,baseline.active(actor).orElseGet(()->new Progress("SELECT_ROLE",0,0,null,null)));
        var old=selected.get();
        var roles=catalog.roles(actor.organizationId());
        var current=roles.stream().filter(r -> r.id().equals(old.role().id())).findFirst();
        if (current.isEmpty() || old.levelId()!=null && current.get().levels().stream().noneMatch(l->l.id().equals(old.levelId()))) return new View(new Selection(old.selectionId(),old.role(),old.revision(),old.selectedAt(),false,old.levelId()),
                new Progress("ROLE_UNAVAILABLE",0,0,null,null));
        var role=current.get();
        var required=roles.stream().filter(r->r.occupationId().equals(role.occupationId())).flatMap(r->r.levels().stream())
                .flatMap(l->l.skills().stream()).map(Skill::id).collect(java.util.stream.Collectors.toSet());
        if(required.isEmpty()) throw new Failure(503,"DEPENDENCY_UNAVAILABLE");
        return new View(new Selection(old.selectionId(),role,old.revision(),old.selectedAt(),true,old.levelId()),baseline.progress(actor,role,required));
    }
    public Selection choose(String roleId, UUID expected, String key) {
        return choose(roleId,null,expected,key);
    }
    public Selection choose(String roleId,String levelId,UUID expected,String key) {
        var actor=identity.requireEmployee();
        if (roleId==null || roleId.isBlank() || roleId.length()>200 || key==null || key.isBlank()
                || key.length()>200 || !key.equals(key.strip())) throw new Failure(400,"INVALID_REQUEST");
        if(levelId!=null && (levelId.isBlank() || levelId.length()>200))throw new Failure(400,"INVALID_LEVEL");
        String hash=levelId==null?hash(roleId+"\n"+Objects.toString(expected,"NONE")):
                hash("ROLE-LEVEL-V1:"+roleId.length()+":"+roleId+":"+levelId.length()+":"+levelId+":"+Objects.toString(expected,"NONE"));
        return store.transaction(actor, () -> {
            var refreshed=identity.requireEmployee();
            if (!actor.equals(refreshed)) throw new Failure(403,"FORBIDDEN");
            var replay=store.replay(actor,key,hash); if (replay.isPresent()) return replay.get();
            var current=store.current(actor);
            if (!Objects.equals(current.map(Selection::selectionId).orElse(null),expected)) throw new Failure(409,"STALE_SELECTION");
            var role=catalog.roles(actor.organizationId()).stream().filter(r -> r.id().equals(roleId)).findFirst()
                    .orElseThrow(() -> new Failure(404,"ROLE_NOT_AVAILABLE"));
            String selectedLevel=levelId==null?current.filter(s->s.role().id().equals(roleId)).map(Selection::levelId).orElse(null):levelId;
            if(selectedLevel!=null && role.levels().stream().noneMatch(l->l.id().equals(selectedLevel)))throw new Failure(404,"LEVEL_NOT_AVAILABLE");
            if (current.filter(s -> s.role().id().equals(roleId) && Objects.equals(s.levelId(),selectedLevel)).isEmpty() && store.assessmentActive(actor))
                throw new Failure(409,"ASSESSMENT_IN_PROGRESS");
            if(!catalog.roles(actor.organizationId()).contains(role)) throw new Failure(503,"DEPENDENCY_UNAVAILABLE");
            return selectedLevel==null?store.select(actor,role,key,hash):store.select(actor,role,selectedLevel,key,hash);
        });
    }
    public static String hash(String value) {
        try { return HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
}
