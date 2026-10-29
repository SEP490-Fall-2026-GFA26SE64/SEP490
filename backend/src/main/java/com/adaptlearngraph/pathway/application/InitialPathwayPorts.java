package com.adaptlearngraph.pathway.application;

import com.adaptlearngraph.recommendation.domain.RoleGap;
import java.time.Instant;
import java.util.*;
import java.util.function.Supplier;

/** Owner-facing contracts. No persistence records, driver values, or browser grants cross this boundary. */
public final class InitialPathwayPorts {
    public enum Role { EMPLOYEE, DOMAIN_EXPERT }
    public record Actor(UUID organizationId, UUID accountId, Role role) {
        public Actor { Objects.requireNonNull(organizationId); Objects.requireNonNull(accountId); Objects.requireNonNull(role); }
        public void require(Role expected) { if (role != expected) throw new Failure(403,"FORBIDDEN"); }
    }
    public record Scope(UUID organizationId, UUID learnerId) {
        public Scope { Objects.requireNonNull(organizationId); Objects.requireNonNull(learnerId); }
        public static Scope own(Actor actor) { actor.require(Role.EMPLOYEE); return new Scope(actor.organizationId(),actor.accountId()); }
    }
    public record Selection(UUID id, long revision, String roleId,String levelId) {
        public Selection(UUID id,long revision,String roleId){this(id,revision,roleId,null);}
        public Selection { Objects.requireNonNull(id); RoleGap.text(roleId); if(levelId!=null)RoleGap.text(levelId); if (revision < 1) throw new IllegalArgumentException("Invalid selection revision"); }
    }
    public record Binding(String businessRoleId, String roleId, String levelId, String occupationId,
                          String roleName, String levelName, String catalogFingerprint,
                          String releaseToken, Map<String,String> versions, List<RoleGap.Requirement> requirements) {
        public Binding {
            for (String value : List.of(businessRoleId,roleId,levelId,occupationId,roleName,levelName,catalogFingerprint,releaseToken)) RoleGap.text(value);
            versions = Map.copyOf(versions); requirements = List.copyOf(requirements);
            for (String key : List.of("catalog","binding","publication","requirements","compatibility")) RoleGap.text(versions.get(key));
        }
    }
    public record Profile(UUID attemptId, String profileHash, String catalogFingerprint,
                          Map<String,String> originPins, Map<String,RoleGap.Evidence> evidence) {
        public Profile {
            Objects.requireNonNull(attemptId); RoleGap.text(profileHash); RoleGap.text(catalogFingerprint);
            originPins=Map.copyOf(originPins); evidence=Map.copyOf(evidence);
            if (evidence.isEmpty() || originPins.isEmpty()) throw new IllegalArgumentException("Incomplete original profile");
        }
    }
    public record Compatibility(Map<String,RoleGap.Evidence> compatible, Map<String,String> unknownReasons, String version) {
        public Compatibility { compatible=Map.copyOf(compatible); unknownReasons=Map.copyOf(unknownReasons); RoleGap.text(version); }
    }
    public record Assignment(String id, String version, UUID expertId) {
        public Assignment { RoleGap.text(id); RoleGap.text(version); Objects.requireNonNull(expertId); }
    }
    public interface Actors { Actor require(); }
    public interface Bindings {
        Binding require(Actor actor,String roleId,String levelId);
        /** Must verify authoritative owner token, not infer freshness from a PostgreSQL learner lock. */
        void assertCurrent(Scope scope, Binding binding);
    }
    public interface Profiles { Profile require(Scope scope, String occupationId); }
    public interface Semantics { Compatibility resolve(Binding binding, Profile profile); }
    public interface ReviewAssignments {
        Assignment require(Actor expert, UUID pathwayId);
        Set<UUID> assignedPathways(Actor expert);
        void requireApprovalValid(Scope scope, UUID pathwayId, long revision, String hash);
    }
    public interface Coordination {
        <T> T transaction(Scope scope, Supplier<T> work);
        Optional<Selection> current(Scope scope);
        boolean assessmentActive(Scope scope);
        PreparedSelection prepare(Scope scope, Binding binding);
    }
    public interface PreparedSelection { Selection commit(String key, String commandHash); }
    public record Receipt(int status, String bodyHash, String responseJson) {}
    public interface Receipts {
        Optional<Receipt> find(Actor actor, String operation, String resource, String key);
        void save(Actor actor, String operation, String resource, String key, Receipt receipt);
    }
    public static final class Failure extends RuntimeException {
        private final int status; private final String code; private final boolean retryable; private final UUID correlationId = UUID.randomUUID();
        public Failure(int status, String code) { this(status,code,status==503); }
        public Failure(int status,String code,boolean retryable) { super(code);this.status=status;this.code=code;this.retryable=retryable; }
        public int status() { return status; }
        public String code() { return code; }
        public boolean retryable() { return retryable; }
        public UUID correlationId() { return correlationId; }
    }
    public static void commandKey(String key) {
        if (key == null || key.isBlank() || key.length() > 128 || !key.equals(key.strip())) throw new Failure(400,"INVALID_IDEMPOTENCY_KEY");
    }
    public static void text(String value) {
        if (value == null || value.isBlank() || value.length() > 200) throw new Failure(400,"INVALID_REQUEST");
    }
    private InitialPathwayPorts() {}
}
