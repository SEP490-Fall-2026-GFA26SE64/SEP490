package com.adaptlearngraph.repository;

import com.adaptlearngraph.helper.AdaptiveBlueprintJson;
import com.adaptlearngraph.services.AdaptiveBlueprintUseCase.Code;
import com.adaptlearngraph.services.AdaptiveBlueprintUseCase.Failure;
import com.adaptlearngraph.entities.domain.AdaptiveBlueprint.*;
import com.adaptlearngraph.entities.BaselineAdaptiveBlueprintRoleEntity;
import com.adaptlearngraph.entities.BaselineAdaptiveBlueprintSkillEntity;
import com.adaptlearngraph.entities.BaselineAdaptiveBlueprintVersionEntity;
import com.adaptlearngraph.entities.BaselineAdaptiveBlueprintWorkingRevisionEntity;
import com.adaptlearngraph.entities.BaselineBlueprintActivationEntity;
import com.adaptlearngraph.entities.BaselineBlueprintActivationEventEntity;
import com.adaptlearngraph.entities.BaselineBlueprintCommandEntity;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.PersistenceException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionException;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/** V18 adapter. Writes are allowed only inside this store's serialized, tenant-scoped JPA transaction. */
public final class JpaAdaptiveBlueprintStore implements AdaptiveBlueprintStore {
    private final AdaptiveBlueprintRepositories data;
    private final AdaptiveBlueprintJson json;
    private final TransactionTemplate transactions;
    private final JpaAdaptiveBlueprintListing listing;
    private final ThreadLocal<Scope> transactionScope = new ThreadLocal<>();

    public JpaAdaptiveBlueprintStore(AdaptiveBlueprintRepositories data, ObjectMapper mapper,
                                     PlatformTransactionManager transactionManager) {
        this(data,mapper,transactionManager,false);
    }
    public JpaAdaptiveBlueprintStore(AdaptiveBlueprintRepositories data, ObjectMapper mapper,
                                     PlatformTransactionManager transactionManager, boolean workspaceNames) {
        this.data = Objects.requireNonNull(data, "data");
        this.json = new AdaptiveBlueprintJson(mapper);
        this.transactions = new TransactionTemplate(transactionManager);
        this.listing = new JpaAdaptiveBlueprintListing(data.listing(), transactionManager, workspaceNames);
        transactions.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    }

    @Override public com.adaptlearngraph.services.AdaptiveBlueprintListing.Status versionStatus(Scope scope, VersionId id) {
        return com.adaptlearngraph.services.AdaptiveBlueprintListing.Status.valueOf(data.versions().status(
                scope.organizationId(), scope.occupationId(), id.blueprintId(), id.version()));
    }

    @Override public com.adaptlearngraph.services.AdaptiveBlueprintListing.Page list(
            UUID organizationId, java.util.Set<String> occupations,
            com.adaptlearngraph.services.AdaptiveBlueprintListing.Query query) {
        return read(() -> listing.list(organizationId, occupations, query));
    }

    @Override
    public <T> T inTransaction(Scope scope, Supplier<T> work) {
        Objects.requireNonNull(scope, "scope");
        Objects.requireNonNull(work, "work");
        if (transactionScope.get() != null) { requireTransaction(scope); return work.get(); }
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Enter through the adaptive scoped transaction boundary");
        }
        transactionScope.set(scope);
        try {
            return transactions.execute(status -> {
                data.locks().lock(scope.organizationId() + "\n" + scope.occupationId());
                data.identities().lockIdentity(scope.organizationId(), scope.occupationId());
                data.activations().lock(scope.organizationId(), scope.occupationId());
                return work.get();
            });
        } catch (DataAccessException | TransactionException | PersistenceException failure) {
            throw translated(failure);
        } finally { transactionScope.remove(); }
    }

    @Override
    public UUID ensureIdentity(Scope scope, UUID actorId) {
        requireTransaction(scope);
        if (!data.identities().activeActor(scope.organizationId(), actorId)) {
            throw failure(Code.FORBIDDEN, "Actor is outside the active organization");
        }
        data.identities().ensureAdaptive(UUID.randomUUID(), scope.organizationId(), scope.occupationId(), actorId);
        return identity(scope);
    }

    @Override
    public VersionId nextVersion(Scope scope) {
        requireTransaction(scope);
        UUID id = identity(scope);
        Integer version = data.identities().nextVersion(scope.organizationId(), scope.occupationId());
        return new VersionId(id, Objects.requireNonNull(version));
    }

    @Override
    public Optional<WorkingRevision> findWorking(Scope scope) {
        return read(() -> data.workings().open(scope.organizationId(), scope.occupationId()).stream()
                .map(row -> new WorkingRevision(scope, row.blueprintId(), row.workingRevisionId(), row.revision(),
                        json.read(row.configuration(), Configuration.class), row.updatedBy(), row.updatedAt()))
                .toList().stream().findFirst());
    }

    @Override
    public Optional<Activation> findActivation(Scope scope) {
        return read(() -> data.activations().current(scope.organizationId(), scope.occupationId()).stream()
                .map(row -> new Activation(scope, row.activationRevision(),
                        row.blueprintVersion() == null ? Optional.empty()
                                : Optional.of(new VersionId(row.blueprintId(), row.blueprintVersion())),
                        row.activatedBy(), row.activatedAt()))
                .toList().stream().findFirst());
    }

    @Override
    public Optional<Version> findVersion(Scope scope, VersionId versionId) {
        return read(() -> data.versions().header(scope.organizationId(), scope.occupationId(), versionId.blueprintId(),
                        versionId.version()).stream()
                .map(header -> version(header, scope, data.versions().members(scope.organizationId(), scope.occupationId(),
                        versionId.blueprintId(), versionId.version())))
                .toList().stream().findFirst());
    }

    @Override
    public Optional<Receipt> findReceipt(UUID organizationId, UUID actorId, String idempotencyKey) {
        return read(() -> data.commands().receipt(organizationId, actorId, idempotencyKey).stream()
                .map(row -> {
                    Operation operation = Operation.valueOf(row.operation());
                    return new Receipt(new Scope(organizationId, row.occupationId()), actorId, idempotencyKey,
                            operation, row.requestHash(), json.readOutcome(operation, row.responsePayload()), row.createdAt());
                }).toList().stream().findFirst());
    }

    @Override
    public void saveWorking(Scope scope, long expectedRevision, WorkingRevision next) {
        requireTransaction(scope); sameScope(scope, next.scope());
        if (!identity(scope).equals(next.blueprintId()) || next.revision() != expectedRevision + 1) {
            throw failure(Code.VERSION_CONFLICT, "Working identity or revision mismatch");
        }
        String configuration = json.write(next.configuration());
        if (expectedRevision == 0) {
            data.workings().insert(new BaselineAdaptiveBlueprintWorkingRevisionEntity(next.workingRevisionId(),
                    scope.organizationId(), scope.occupationId(), next.blueprintId(), next.revision(), configuration, "OPEN",
                    next.updatedBy(), null, next.updatedBy(), next.updatedAt(), null));
            return;
        }
        changedOne(data.workings().save(scope.organizationId(), scope.occupationId(), next.workingRevisionId(),
                next.blueprintId(), expectedRevision, next.revision(), configuration, next.updatedBy(), next.updatedAt()));
    }

    @Override
    public void closeWorking(Scope scope, UUID workingRevisionId, long expectedRevision, UUID actorId, Instant closedAt) {
        requireTransaction(scope);
        changedOne(data.workings().close(scope.organizationId(), scope.occupationId(), workingRevisionId, expectedRevision,
                "FINALIZED", actorId, closedAt));
    }

    @Override
    public void archiveLegacyWorking(Scope scope, UUID workingRevisionId, long expectedRevision, UUID actorId, Instant closedAt) {
        requireTransaction(scope);
        changedOne(data.workings().archiveLegacy(scope.organizationId(), scope.occupationId(), workingRevisionId,
                expectedRevision, actorId, closedAt));
    }

    @Override public void discardWorking(Scope scope, UUID id, long revision, UUID actor, Instant time) {
        requireTransaction(scope);
        changedOne(data.workings().close(scope.organizationId(), scope.occupationId(), id, revision, "ABANDONED", actor, time));
    }

    @Override
    public void insertVersion(Scope scope, Version version) {
        requireTransaction(scope); sameScope(scope, version.scope());
        boolean full = version.configuration().scopePolicy() == ScopePolicy.FULL_OCCUPATION_V2;
        Bounds occupation = version.configuration().occupationBounds();
        Bounds exploration = version.configuration().exploration();
        UUID id = version.id().blueprintId();
        int number = version.id().version();
        data.versions().insert(new BaselineAdaptiveBlueprintVersionEntity(id, number, scope.organizationId(), scope.occupationId(),
                version.configuration().name(), version.occupationNameSnapshot(), version.catalogFingerprint(),
                full ? null : exploration.maxQuestions(), full ? null : exploration.timeLimitSeconds(),
                version.pins().modelVersionId(), version.pins().masteryMappingVersionId(), version.pins().parameterSetId(),
                version.createdBy(), version.createdAt(), full ? ScopePolicy.FULL_OCCUPATION_V2.name() : null,
                full ? occupation.maxQuestions() : null, full ? occupation.timeLimitSeconds() : null));
        version.roles().forEach((roleId, role) -> {
            Bounds bounds = version.configuration().roles().get(roleId);
            data.roles().insert(new BaselineAdaptiveBlueprintRoleEntity(id, number, roleId, role.name(), role.catalogVersion(),
                    full ? null : bounds.maxQuestions(), full ? null : bounds.timeLimitSeconds()));
            role.skills().forEach((skillId, skill) -> data.skills().insert(new BaselineAdaptiveBlueprintSkillEntity(id, number,
                    roleId, skillId, skill.name(), skill.catalogVersion())));
        });
    }

    @Override
    public void saveActivation(Scope scope, long expectedRevision, Activation next) {
        requireTransaction(scope); sameScope(scope, next.scope());
        UUID blueprint = identity(scope);
        if (next.revision() != expectedRevision + 1
                || next.current().filter(id -> !id.blueprintId().equals(blueprint)).isPresent()) {
            throw failure(Code.VERSION_CONFLICT, "Activation identity or revision mismatch");
        }
        Integer version = next.current().map(VersionId::version).orElse(null);
        if (expectedRevision == 0) {
            data.activations().insert(new BaselineBlueprintActivationEntity(scope.organizationId(), scope.occupationId(), blueprint,
                    version, next.revision(), next.changedBy(), next.changedAt()));
            return;
        }
        changedOne(data.activations().activate(scope.organizationId(), scope.occupationId(), blueprint, expectedRevision, version,
                next.revision(), next.changedBy(), next.changedAt()));
    }

    @Override
    public void appendActivationEvent(Scope scope, Activation next, Operation operation, String reason) {
        requireTransaction(scope); sameScope(scope, next.scope());
        data.events().insert(new BaselineBlueprintActivationEventEntity(UUID.randomUUID(), scope.organizationId(),
                scope.occupationId(), next.revision(), identity(scope), next.current().map(VersionId::version).orElse(null),
                operation.name(), next.changedBy(), reason, next.changedAt()));
    }

    @Override
    public void insertReceipt(Scope scope, Receipt receipt) {
        requireTransaction(scope); sameScope(scope, receipt.scope());
        UUID blueprintId = identity(scope);
        UUID outcomeBlueprint = switch (receipt.outcome()) {
            case Discarded discarded -> discarded.working().blueprintId();
            case Saved saved -> saved.working().blueprintId();
            case Converted converted -> converted.working().blueprintId();
            case Finalized finalized -> finalized.version().id().blueprintId();
            case Disabled disabled -> disabled.activation().current().map(VersionId::blueprintId).orElse(blueprintId);
        };
        if (!blueprintId.equals(outcomeBlueprint)) throw failure(Code.VERSION_CONFLICT, "Receipt identity mismatch");
        try {
            data.commands().insert(new BaselineBlueprintCommandEntity(scope.organizationId(), receipt.actorId(),
                    receipt.idempotencyKey(), scope.occupationId(), blueprintId, receipt.operation().name(), receipt.requestHash(),
                    json.writeOutcome(receipt.outcome()), receipt.createdAt()));
        } catch (DataIntegrityViolationException cause) {
            if (!PostgresErrors.isUniqueViolation(cause)) throw cause;
            Failure failure = failure(Code.IDEMPOTENCY_CONFLICT, "Adaptive command key already exists");
            failure.initCause(cause);
            throw failure;
        }
    }

    private UUID identity(Scope scope) {
        return data.identities().identity(scope.organizationId(), scope.occupationId()).stream().findFirst()
                .orElseThrow(() -> failure(Code.NOT_FOUND, "Blueprint identity not found"));
    }

    private void requireTransaction(Scope scope) {
        if (!scope.equals(transactionScope.get()) || !TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Mutation requires this scope's adaptive transaction");
        }
    }

    /** Header + ordered role/skill membership rows to the immutable version (same null handling as the former row mapping). */
    private static Version version(BaselineAdaptiveBlueprintVersionJpaRepository.Header header, Scope scope,
                                   List<BaselineAdaptiveBlueprintVersionJpaRepository.Member> rows) {
        String policy = header.scopePolicy();
        boolean full = ScopePolicy.FULL_OCCUPATION_V2.name().equals(policy);
        if (policy != null && !full) throw new IllegalStateException("Unknown Blueprint scope policy");
        Map<String, Bounds> bounds = new LinkedHashMap<>();
        Map<String, RoleSnapshot> roles = new LinkedHashMap<>();
        Map<String, Map<String, SkillSnapshot>> skills = new LinkedHashMap<>();
        for (var row : rows) {
            skills.computeIfAbsent(row.roleId(), ignored -> new LinkedHashMap<>()).put(row.microSkillId(),
                    new SkillSnapshot(row.microSkillNameSnapshot(), row.skillVersion()));
            if (!full) bounds.put(row.roleId(), new Bounds(row.maxQuestions(), row.timeLimitSeconds()));
        }
        for (var row : rows) {
            roles.putIfAbsent(row.roleId(), new RoleSnapshot(row.roleNameSnapshot(), row.roleVersion(), skills.get(row.roleId())));
        }
        return new Version(scope, new VersionId(header.blueprintId(), header.version()),
                full ? Configuration.occupation(header.name(), new Bounds(orZero(header.occupationMaxQuestions()),
                        orZero(header.occupationTimeLimitSeconds())))
                     : new Configuration(header.name(), new Bounds(orZero(header.explorationMaxQuestions()),
                        orZero(header.explorationTimeLimitSeconds())), bounds), header.occupationNameSnapshot(),
                header.catalogFingerprint(), new VersionPins(header.modelVersionId(), header.masteryMappingVersionId(),
                        header.parameterSetId()), roles, header.createdBy(), header.createdAt());
    }

    /** Former getInt semantics: SQL NULL reads as 0. */
    private static int orZero(Integer value) { return value == null ? 0 : value; }

    private static void sameScope(Scope expected, Scope actual) {
        if (!expected.equals(actual)) throw failure(Code.FORBIDDEN, "Scope mismatch");
    }

    private static void changedOne(int changed) {
        if (changed != 1) throw failure(Code.VERSION_CONFLICT, "Stale or closed adaptive revision");
    }

    private static Failure failure(Code code, String message) { return new Failure(code, message, List.of()); }
    private static Failure translated(RuntimeException cause) {
        Failure failure = failure(cause instanceof DataIntegrityViolationException ? Code.VERSION_CONFLICT : Code.DEPENDENCY_UNAVAILABLE,
                "Adaptive persistence operation failed");
        failure.initCause(cause);
        return failure;
    }

    private static <T> T read(Supplier<T> operation) {
        try { return operation.get(); }
        catch (DataAccessException | TransactionException | PersistenceException cause) { throw translated(cause); }
    }
}
