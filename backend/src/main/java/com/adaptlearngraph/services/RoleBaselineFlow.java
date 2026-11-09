package com.adaptlearngraph.services;

import java.time.Instant;
import java.util.*;

/** Current catalog contract. Transactional selection and read-only next-step policy behind ports. */
public final class RoleBaselineFlow {
    public record Actor(UUID organizationId, UUID learnerId) {}
    public record Skill(String id, String code, String name, List<String> requiredKnowledgeLevels, boolean mandatory) {
        public Skill {
            requiredKnowledgeLevels=requiredKnowledgeLevels==null?List.of():List.copyOf(requiredKnowledgeLevels);
            if(new HashSet<>(requiredKnowledgeLevels).size()!=requiredKnowledgeLevels.size()
                || requiredKnowledgeLevels.stream().anyMatch(l->!Set.of("FOUNDATION","INTERMEDIATE","ADVANCED").contains(l)))
                throw new IllegalArgumentException("Invalid explicit knowledge levels");
        }
        /** Old development fixture constructors are unclassified, never converted from a numeric target. */
        @Deprecated public Skill(String id,String code,String name,double ignoredNumericTarget,boolean mandatory) {
            this(id,code,name,List.of(),mandatory);
        }
        /** Compatibility for not-yet-retired numeric consumers: fail closed instead of inventing a target. */
        @Deprecated public double requiredScore(){throw new Failure(409,"NUMERIC_TARGET_RETIRED");}
    }
    public record Level(String id, String code, String name, int rank, String context,
                        String attainmentRule, List<Skill> skills, String duration) {
        public Level(String id, String code, String name, int rank, String context,
                     String attainmentRule, List<Skill> skills) {
            this(id, code, name, rank, context, attainmentRule, skills, null);
        }
    }
    public record Role(String id, String code, String name, String scope, String jobPositionId,
                       String jobPositionName, String catalogVersion, String fingerprint, List<Level> levels) {}
    public record Selection(UUID selectionId, Role role, long revision, Instant selectedAt, boolean available,String levelId) {
        public Selection(UUID id,Role role,long revision,Instant selectedAt,boolean available){this(id,role,revision,selectedAt,available,null);}
    }
    public record Progress(String state, int requiredCount, int coveredCount, UUID attemptId,
                           Integer baselineVersion) {}
    /** Actual company placement; deliberately separate from a learning target. */
    public record Placement(String roleId, String roleCode, String roleName, String levelName) {}
    public interface Placements { Optional<Placement> find(Actor actor); }
    public record View(Selection selection, Progress progress, Placement placement, boolean targetLocked) {
        public View(Selection selection, Progress progress) { this(selection,progress,null,false); }
    }
    public record MasterySkill(String id, String name, double mastery, String confidence) {}
    public record MasteryProfile(String jobPositionId, String jobPositionName, UUID attemptId,
                                 int baselineVersion, Instant initializedAt, List<MasterySkill> skills) {}
    public List<MasteryProfile> mastery() { return baseline.mastery(identity.requireEmployee()); }
    public interface Identity { Actor requireEmployee(); }
    public interface Catalog { List<Role> roles(UUID organization); }
    public interface Store {
        <T> T transaction(Actor actor, java.util.function.Supplier<T> work);
        Optional<Selection> current(Actor actor);
        default Optional<Placement> placement(Actor actor) { return Optional.empty(); }
        default boolean targetLocked(Actor actor) { return false; }
        default boolean hasLegacySelection(Actor actor) { return false; }
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
                .filter(r -> (r.name()+" "+r.jobPositionName()+" "+r.scope()).toLowerCase(Locale.ROOT).contains(term)).toList();
    }
    public View view() {
        var actor=identity.requireEmployee();
        var target=targetView(actor);
        return new View(target.selection(),target.progress(),store.placement(actor).orElse(null),store.targetLocked(actor));
    }
    private View targetView(Actor actor) {
        var selected=store.current(actor);
        if (selected.isEmpty()) return new View(null,baseline.active(actor).orElseGet(()->new Progress(
                store.hasLegacySelection(actor) ? "LEGACY_SELECTION_REQUIRES_RESELECTION" : "SELECT_ROLE",0,0,null,null)));
        var old=selected.get();
        var roles=catalog.roles(actor.organizationId());
        var current=roles.stream().filter(r -> r.id().equals(old.role().id())).findFirst();
        if (current.isEmpty() || old.levelId()!=null && current.get().levels().stream().noneMatch(l->l.id().equals(old.levelId()))) return new View(new Selection(old.selectionId(),old.role(),old.revision(),old.selectedAt(),false,old.levelId()),
                new Progress("ROLE_UNAVAILABLE",0,0,null,null));
        var role=current.get();
        if(old.levelId()==null)return new View(new Selection(old.selectionId(),role,old.revision(),old.selectedAt(),true,null),
                new Progress("SELECT_LEVEL",0,0,null,null));
        var required=role.levels().stream().filter(l->l.id().equals(old.levelId()))
                .flatMap(l->l.skills().stream()).map(Skill::id).collect(java.util.stream.Collectors.toSet());
        if(required.isEmpty()) throw new Failure(503,"DEPENDENCY_UNAVAILABLE");
        return new View(new Selection(old.selectionId(),role,old.revision(),old.selectedAt(),true,old.levelId()),baseline.progress(actor,role,required));
    }
    public Selection choose(String roleId, UUID expected, String key) {
        return choose(roleId,null,expected,key);
    }
    /** Called only for a new/changed target, never while reading or continuing an existing pathway. */
    public static void requireHigherTarget(Role role,String levelId,Placement placement) {
        if(placement==null || placement.levelName()==null || placement.levelName().isBlank())return;
        boolean sameRole=Objects.equals(role.id(),placement.roleId())
                || placement.roleCode()!=null && role.code()!=null
                    && role.code().split("#",2)[0].equalsIgnoreCase(placement.roleCode().split("#",2)[0]);
        if(!sameRole)return;
        if(levelId==null)throw new Failure(400,"LEVEL_REQUIRED");
        String assigned=placement.levelName().replaceFirst("(?i)^(?:rank|level)\\s*\\d+\\s*:\\s*", "").strip();
        var matches=role.levels().stream().filter(l->l.id().equalsIgnoreCase(assigned)
                || l.code()!=null && l.code().equalsIgnoreCase(assigned) || l.name().equalsIgnoreCase(assigned)).toList();
        if(matches.size()!=1)throw new Failure(409,"ASSIGNED_LEVEL_UNAVAILABLE");
        var current=matches.getFirst();
        var target=role.levels().stream().filter(l->l.id().equals(levelId)).findFirst()
                .orElseThrow(()->new Failure(404,"LEVEL_NOT_AVAILABLE"));
        if(current.rank()<1 || target.rank()<1
                || role.levels().stream().anyMatch(l->l.rank()<1)
                || role.levels().stream().map(Level::rank).distinct().count()!=role.levels().size())
            throw new Failure(409,"ASSIGNED_LEVEL_UNAVAILABLE");
        if(target.rank()>=current.rank())throw new Failure(409,"TARGET_LEVEL_NOT_HIGHER");
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
            var replay=store.replay(actor,key,hash);
            if (replay.isPresent()) {
                var retained=replay.get();
                var permitted=catalog.roles(actor.organizationId()).stream().filter(r->r.id().equals(retained.role().id())).findFirst()
                        .orElseThrow(()->new Failure(404,"ROLE_NOT_AVAILABLE"));
                if(retained.levelId()!=null && permitted.levels().stream().noneMatch(l->l.id().equals(retained.levelId())))
                    throw new Failure(404,"LEVEL_NOT_AVAILABLE");
                return retained;
            }
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
