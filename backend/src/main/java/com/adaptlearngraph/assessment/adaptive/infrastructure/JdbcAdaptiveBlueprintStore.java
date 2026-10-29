package com.adaptlearngraph.assessment.adaptive.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase.Code;
import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase.Failure;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintStore;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionException;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/** V18 adapter. Writes are allowed only inside this store's serialized, tenant-scoped transaction. */
public final class JdbcAdaptiveBlueprintStore implements AdaptiveBlueprintStore {
    private final NamedParameterJdbcTemplate jdbc;
    private final AdaptiveBlueprintJson json;
    private final TransactionTemplate transactions;
    private final JdbcAdaptiveBlueprintListing listing;
    private final ThreadLocal<Scope> transactionScope = new ThreadLocal<>();

    public JdbcAdaptiveBlueprintStore(NamedParameterJdbcTemplate jdbc, ObjectMapper mapper,
                                     PlatformTransactionManager transactionManager) {
        this(jdbc,mapper,transactionManager,false);
    }
    public JdbcAdaptiveBlueprintStore(NamedParameterJdbcTemplate jdbc, ObjectMapper mapper,
                                     PlatformTransactionManager transactionManager, boolean workspaceNames) {
        this.jdbc = Objects.requireNonNull(jdbc, "jdbc");
        this.json = new AdaptiveBlueprintJson(mapper);
        this.transactions = new TransactionTemplate(transactionManager);
        this.listing = new JdbcAdaptiveBlueprintListing(jdbc, transactionManager, workspaceNames);
        transactions.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    }

    @Override public com.adaptlearngraph.assessment.adaptive.application.AdaptiveBlueprintListing.Status versionStatus(Scope scope, VersionId id) {
        String status = jdbc.queryForObject("""
                SELECT CASE WHEN EXISTS (
                    SELECT 1 FROM platform.baseline_blueprint_activation
                    WHERE organization_id=:org AND occupation_id=:occupation
                      AND blueprint_id=:blueprint AND blueprint_version=:version
                ) THEN 'ACTIVE' WHEN EXISTS (
                    SELECT 1 FROM platform.baseline_adaptive_attempt
                    WHERE organization_id=:org AND occupation_id=:occupation
                      AND blueprint_id=:blueprint AND blueprint_version=:version AND state='IN_PROGRESS'
                ) THEN 'RETIRING' ELSE 'INACTIVE' END
                """, key(scope).addValue("blueprint", id.blueprintId()).addValue("version", id.version()), String.class);
        return com.adaptlearngraph.assessment.adaptive.application.AdaptiveBlueprintListing.Status.valueOf(status);
    }

    @Override public com.adaptlearngraph.assessment.adaptive.application.AdaptiveBlueprintListing.Page list(
            UUID organizationId, java.util.Set<String> occupations,
            com.adaptlearngraph.assessment.adaptive.application.AdaptiveBlueprintListing.Query query) {
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
                jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))",
                        new MapSqlParameterSource("key", scope.organizationId() + "\n" + scope.occupationId()), (rs, row) -> true);
                jdbc.query("SELECT blueprint_id FROM platform.baseline_blueprint WHERE organization_id=:org AND occupation_id=:occupation FOR UPDATE",
                        key(scope), (rs, row) -> rs.getObject(1, UUID.class));
                jdbc.query("SELECT blueprint_id FROM platform.baseline_blueprint_activation WHERE organization_id=:org AND occupation_id=:occupation FOR UPDATE",
                        key(scope), (rs, row) -> rs.getObject(1, UUID.class));
                return work.get();
            });
        } catch (DataAccessException | TransactionException failure) {
            throw translated(failure);
        } finally { transactionScope.remove(); }
    }

    @Override
    public UUID ensureIdentity(Scope scope, UUID actorId) {
        requireTransaction(scope);
        Boolean actorMatches = jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM platform.account WHERE account_id=:actor AND organization_id=:org AND active)",
                key(scope).addValue("actor", actorId), Boolean.class);
        if (!Boolean.TRUE.equals(actorMatches)) throw failure(Code.FORBIDDEN, "Actor is outside the active organization");
        jdbc.update("""
                INSERT INTO platform.baseline_blueprint(blueprint_id,organization_id,occupation_id,created_by)
                VALUES (:id,:org,:occupation,:actor) ON CONFLICT DO NOTHING
                """, key(scope).addValue("id", UUID.randomUUID()).addValue("actor", actorId));
        return identity(scope);
    }

    @Override
    public VersionId nextVersion(Scope scope) {
        requireTransaction(scope);
        UUID id = identity(scope);
        Integer version = jdbc.queryForObject("""
                SELECT (coalesce(max(registry.version),0)+1)::integer
                FROM platform.baseline_blueprint_version_registry registry
                JOIN platform.baseline_blueprint identity USING (blueprint_id)
                WHERE identity.organization_id=:org AND identity.occupation_id=:occupation
                """, key(scope), Integer.class);
        return new VersionId(id, Objects.requireNonNull(version));
    }

    @Override
    public Optional<WorkingRevision> findWorking(Scope scope) {
        return read(() -> jdbc.query("""
                SELECT * FROM platform.baseline_adaptive_blueprint_working_revision
                WHERE organization_id=:org AND occupation_id=:occupation AND state='OPEN'
                """, key(scope), (rs, row) -> new WorkingRevision(scope, rs.getObject("blueprint_id", UUID.class),
                rs.getObject("working_revision_id", UUID.class), rs.getLong("revision"),
                json.read(rs.getString("configuration"), Configuration.class), rs.getObject("updated_by", UUID.class),
                rs.getTimestamp("updated_at").toInstant())).stream().findFirst());
    }

    @Override
    public Optional<Activation> findActivation(Scope scope) {
        return read(() -> jdbc.query("""
                SELECT * FROM platform.baseline_blueprint_activation WHERE organization_id=:org AND occupation_id=:occupation
                """, key(scope), (rs, row) -> new Activation(scope, rs.getLong("activation_revision"),
                rs.getObject("blueprint_version") == null ? Optional.empty()
                        : Optional.of(new VersionId(rs.getObject("blueprint_id", UUID.class), rs.getInt("blueprint_version"))),
                rs.getObject("activated_by", UUID.class), rs.getTimestamp("activated_at").toInstant())).stream().findFirst());
    }

    @Override
    public Optional<Version> findVersion(Scope scope, VersionId versionId) {
        var params = key(scope).addValue("id", versionId.blueprintId()).addValue("version", versionId.version());
        return read(() -> jdbc.query("""
                SELECT * FROM platform.baseline_adaptive_blueprint_version
                WHERE organization_id=:org AND occupation_id=:occupation AND blueprint_id=:id AND version=:version
                """, params, (rs, row) -> json.version(rs, scope, jdbc.queryForList("""
                SELECT role.role_id,role.role_name_snapshot,role.catalog_version AS role_version,
                       role.max_questions,role.time_limit_seconds,skill.micro_skill_id,
                       skill.micro_skill_name_snapshot,skill.catalog_version AS skill_version
                FROM platform.baseline_adaptive_blueprint_role role
                JOIN platform.baseline_adaptive_blueprint_skill skill USING (blueprint_id,blueprint_version,role_id)
                JOIN platform.baseline_adaptive_blueprint_version parent
                  ON parent.blueprint_id=role.blueprint_id AND parent.version=role.blueprint_version
                WHERE parent.organization_id=:org AND parent.occupation_id=:occupation
                  AND parent.blueprint_id=:id AND parent.version=:version
                ORDER BY role.role_id,skill.micro_skill_id
                """, params))).stream().findFirst());
    }

    @Override
    public Optional<Receipt> findReceipt(UUID organizationId, UUID actorId, String idempotencyKey) {
        return read(() -> jdbc.query("""
                SELECT * FROM platform.baseline_blueprint_command
                WHERE organization_id=:org AND actor_id=:actor AND idempotency_key=:retry
                """, new MapSqlParameterSource("org", organizationId).addValue("actor", actorId).addValue("retry", idempotencyKey),
                (rs, row) -> {
                    Operation operation = Operation.valueOf(rs.getString("operation"));
                    return new Receipt(new Scope(organizationId, rs.getString("occupation_id")), actorId, idempotencyKey,
                            operation, rs.getString("request_hash"), json.readOutcome(operation, rs.getString("response_payload")),
                            rs.getTimestamp("created_at").toInstant());
                }).stream().findFirst());
    }

    @Override
    public void saveWorking(Scope scope, long expectedRevision, WorkingRevision next) {
        requireTransaction(scope); sameScope(scope, next.scope());
        if (!identity(scope).equals(next.blueprintId()) || next.revision() != expectedRevision + 1) {
            throw failure(Code.VERSION_CONFLICT, "Working identity or revision mismatch");
        }
        var params = key(scope).addValue("id", next.blueprintId()).addValue("working", next.workingRevisionId())
                .addValue("expected", expectedRevision).addValue("revision", next.revision())
                .addValue("configuration", json.write(next.configuration())).addValue("actor", next.updatedBy())
                .addValue("time", next.updatedAt().atOffset(ZoneOffset.UTC));
        int changed = expectedRevision == 0 ? jdbc.update("""
                INSERT INTO platform.baseline_adaptive_blueprint_working_revision
                (working_revision_id,organization_id,occupation_id,blueprint_id,revision,configuration,state,created_by,updated_by,updated_at)
                VALUES (:working,:org,:occupation,:id,:revision,CAST(:configuration AS jsonb),'OPEN',:actor,:actor,:time)
                """, params) : jdbc.update("""
                UPDATE platform.baseline_adaptive_blueprint_working_revision SET revision=:revision,
                    configuration=CAST(:configuration AS jsonb),updated_by=:actor,updated_at=:time
                WHERE organization_id=:org AND occupation_id=:occupation AND working_revision_id=:working
                  AND blueprint_id=:id AND revision=:expected AND state='OPEN'
                """, params);
        changedOne(changed);
    }

    @Override
    public void closeWorking(Scope scope, UUID workingRevisionId, long expectedRevision, UUID actorId, Instant closedAt) {
        requireTransaction(scope);
        changedOne(jdbc.update("""
                UPDATE platform.baseline_adaptive_blueprint_working_revision
                SET state='FINALIZED',revision=revision+1,updated_by=:actor,updated_at=:time,closed_at=:time
                WHERE organization_id=:org AND occupation_id=:occupation AND working_revision_id=:working
                  AND revision=:expected AND state='OPEN'
                """, key(scope).addValue("working", workingRevisionId).addValue("expected", expectedRevision)
                .addValue("actor", actorId).addValue("time", closedAt.atOffset(ZoneOffset.UTC))));
    }

    @Override
    public void archiveLegacyWorking(Scope scope, UUID workingRevisionId, long expectedRevision, UUID actorId, Instant closedAt) {
        requireTransaction(scope);
        changedOne(jdbc.update("""
                UPDATE platform.baseline_adaptive_blueprint_working_revision
                SET state='ABANDONED',revision=revision+1,updated_by=:actor,updated_at=:time,closed_at=:time
                WHERE organization_id=:org AND occupation_id=:occupation AND working_revision_id=:working
                  AND revision=:expected AND state='OPEN' AND NOT jsonb_exists(configuration,'occupationBounds')
                """, key(scope).addValue("working", workingRevisionId).addValue("expected", expectedRevision)
                .addValue("actor", actorId).addValue("time", closedAt.atOffset(ZoneOffset.UTC))));
    }

    @Override public void discardWorking(Scope scope, UUID id, long revision, UUID actor, Instant time) {
        requireTransaction(scope);
        changedOne(jdbc.update("""
                UPDATE platform.baseline_adaptive_blueprint_working_revision
                SET state='ABANDONED',revision=revision+1,updated_by=:actor,updated_at=:time,closed_at=:time
                WHERE organization_id=:org AND occupation_id=:occupation AND working_revision_id=:working
                  AND revision=:expected AND state='OPEN'
                """, key(scope).addValue("working", id).addValue("expected", revision)
                .addValue("actor", actor).addValue("time", time.atOffset(ZoneOffset.UTC))));
    }

    @Override
    public void insertVersion(Scope scope, Version version) {
        requireTransaction(scope); sameScope(scope, version.scope());
        boolean full = version.configuration().scopePolicy() == ScopePolicy.FULL_OCCUPATION_V2;
        Bounds occupation = version.configuration().occupationBounds();
        Bounds exploration = version.configuration().exploration();
        var params = key(scope).addValue("id", version.id().blueprintId()).addValue("version", version.id().version())
                .addValue("name", version.configuration().name()).addValue("occupationName", version.occupationNameSnapshot())
                .addValue("fingerprint", version.catalogFingerprint()).addValue("max", full ? null : exploration.maxQuestions())
                .addValue("duration", full ? null : exploration.timeLimitSeconds())
                .addValue("policy", full ? ScopePolicy.FULL_OCCUPATION_V2.name() : null)
                .addValue("occupationMax", full ? occupation.maxQuestions() : null)
                .addValue("occupationDuration", full ? occupation.timeLimitSeconds() : null).addValue("model", version.pins().modelVersionId())
                .addValue("mapping", version.pins().masteryMappingVersionId()).addValue("parameters", version.pins().parameterSetId())
                .addValue("actor", version.createdBy()).addValue("time", version.createdAt().atOffset(ZoneOffset.UTC));
        jdbc.update("""
                INSERT INTO platform.baseline_adaptive_blueprint_version(blueprint_id,version,organization_id,occupation_id,
                    name,occupation_name_snapshot,catalog_fingerprint,exploration_max_questions,exploration_time_limit_seconds,
                    model_version_id,mastery_mapping_version_id,parameter_set_id,created_by,created_at,
                    scope_policy,occupation_max_questions,occupation_time_limit_seconds)
                VALUES (:id,:version,:org,:occupation,:name,:occupationName,:fingerprint,:max,:duration,:model,:mapping,:parameters,:actor,:time,
                    :policy,:occupationMax,:occupationDuration)
                """, params);
        version.roles().forEach((roleId, role) -> {
            Bounds bounds = version.configuration().roles().get(roleId);
            params.addValue("role", roleId).addValue("roleName", role.name()).addValue("roleVersion", role.catalogVersion())
                    .addValue("roleMax", full ? null : bounds.maxQuestions()).addValue("roleDuration", full ? null : bounds.timeLimitSeconds());
            jdbc.update("""
                    INSERT INTO platform.baseline_adaptive_blueprint_role VALUES (:id,:version,:role,:roleName,:roleVersion,:roleMax,:roleDuration)
                    """, params);
            role.skills().forEach((skillId, skill) -> jdbc.update("""
                    INSERT INTO platform.baseline_adaptive_blueprint_skill VALUES (:id,:version,:role,:skill,:skillName,:skillVersion)
                    """, params.addValue("skill", skillId).addValue("skillName", skill.name()).addValue("skillVersion", skill.catalogVersion())));
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
        var params = activationKey(scope, next).addValue("id", blueprint).addValue("expected", expectedRevision);
        int changed = expectedRevision == 0 ? jdbc.update("""
                INSERT INTO platform.baseline_blueprint_activation(organization_id,occupation_id,blueprint_id,blueprint_version,activation_revision,activated_by,activated_at)
                VALUES (:org,:occupation,:id,:version,:revision,:actor,:time)
                """, params) : jdbc.update("""
                UPDATE platform.baseline_blueprint_activation SET blueprint_version=:version,
                    activation_revision=:revision,activated_by=:actor,activated_at=:time
                WHERE organization_id=:org AND occupation_id=:occupation AND blueprint_id=:id AND activation_revision=:expected
                """, params);
        changedOne(changed);
    }

    @Override
    public void appendActivationEvent(Scope scope, Activation next, Operation operation, String reason) {
        requireTransaction(scope); sameScope(scope, next.scope());
        jdbc.update("""
                INSERT INTO platform.baseline_blueprint_activation_event(organization_id,occupation_id,activation_revision,
                    blueprint_id,blueprint_version,operation,actor_id,reason,occurred_at)
                VALUES (:org,:occupation,:revision,:id,:version,:operation,:actor,:reason,:time)
                """, activationKey(scope, next).addValue("id", identity(scope)).addValue("operation", operation.name()).addValue("reason", reason));
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
        try { jdbc.update("""
                INSERT INTO platform.baseline_blueprint_command(organization_id,actor_id,idempotency_key,occupation_id,
                    blueprint_id,operation,request_hash,response_payload,created_at)
                VALUES (:org,:actor,:retry,:occupation,:id,:operation,:hash,CAST(:response AS jsonb),:time)
                """, key(scope).addValue("actor", receipt.actorId()).addValue("retry", receipt.idempotencyKey())
                .addValue("id", blueprintId).addValue("operation", receipt.operation().name()).addValue("hash", receipt.requestHash())
                .addValue("response", json.writeOutcome(receipt.outcome())).addValue("time", receipt.createdAt().atOffset(ZoneOffset.UTC)));
        } catch (DuplicateKeyException cause) {
            Failure failure = failure(Code.IDEMPOTENCY_CONFLICT, "Adaptive command key already exists");
            failure.initCause(cause);
            throw failure;
        }
    }

    private UUID identity(Scope scope) {
        return jdbc.query("SELECT blueprint_id FROM platform.baseline_blueprint WHERE organization_id=:org AND occupation_id=:occupation",
                key(scope), (rs, row) -> rs.getObject(1, UUID.class)).stream().findFirst()
                .orElseThrow(() -> failure(Code.NOT_FOUND, "Blueprint identity not found"));
    }

    private void requireTransaction(Scope scope) {
        if (!scope.equals(transactionScope.get()) || !TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Mutation requires this scope's adaptive transaction");
        }
    }

    private static void sameScope(Scope expected, Scope actual) {
        if (!expected.equals(actual)) throw failure(Code.FORBIDDEN, "Scope mismatch");
    }

    private static void changedOne(int changed) {
        if (changed != 1) throw failure(Code.VERSION_CONFLICT, "Stale or closed adaptive revision");
    }

    private static MapSqlParameterSource key(Scope scope) {
        return new MapSqlParameterSource("org", scope.organizationId()).addValue("occupation", scope.occupationId());
    }

    private static MapSqlParameterSource activationKey(Scope scope, Activation activation) {
        return key(scope).addValue("revision", activation.revision())
                .addValue("version", activation.current().map(VersionId::version).orElse(null), java.sql.Types.INTEGER)
                .addValue("actor", activation.changedBy()).addValue("time", activation.changedAt().atOffset(ZoneOffset.UTC));
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
        catch (DataAccessException | TransactionException cause) { throw translated(cause); }
    }
}
