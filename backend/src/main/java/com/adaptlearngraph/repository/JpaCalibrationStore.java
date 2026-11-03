package com.adaptlearngraph.repository;

import com.adaptlearngraph.helper.CalibrationJson;
import com.adaptlearngraph.repository.CalibrationPorts.*;
import com.adaptlearngraph.entities.domain.Calibration;
import com.adaptlearngraph.entities.domain.Calibration.*;
import com.adaptlearngraph.entities.IrtCalibrationRunEntity;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import javax.sql.DataSource;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/** V18 run lifecycle adapter. No schema creation, account/model provisioning or automatic execution. */
public final class JpaCalibrationStore implements Store {
    private final DataSource dataSource;
    private final IrtCalibrationRunJpaRepository runs;
    private final IrtCalibrationPinJpaRepository pins;
    private final PostgresAdvisoryLocks locks;
    private final TransactionTemplate transactions;
    private final CalibrationJson json;
    private final JpaCalibrationCandidates candidates;
    private final ThreadLocal<Scope> active=new ThreadLocal<>();
    /** The data source is used only for the global worker session lock, which must live outside any transaction. */
    @SuppressWarnings("java:S107")
    public JpaCalibrationStore(DataSource dataSource,IrtCalibrationRunJpaRepository runs,IrtCalibrationPinJpaRepository pins,
            IrtTechnicalVersionJpaRepository parameterSets,IrtItemParameterJpaRepository itemParameters,PostgresAdvisoryLocks locks,
            CalibrationJson json,PlatformTransactionManager transactionManager) {
        this.dataSource=dataSource; this.runs=runs; this.pins=pins; this.locks=locks; this.json=json;
        transactions=new TransactionTemplate(transactionManager);
        transactions.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED); transactions.setTimeout(10);
        candidates=new JpaCalibrationCandidates(parameterSets,itemParameters,json);
    }
    @Override public <T> T transaction(Scope scope,Supplier<T> work) {
        if (active.get()!=null || TransactionSynchronizationManager.isActualTransactionActive()) throw new IllegalStateException("Enter calibration scope once");
        active.set(scope);
        try {
            return transactions.execute(status->{
                runs.boundLocalTimeouts();
                locks.lock(lockKey(scope));
                return work.get();
            });
        } catch (org.springframework.dao.DataAccessException | jakarta.persistence.PersistenceException statement) {
            if (PostgresErrors.isUniqueViolation(statement)) throw new Failure(Code.CONFLICT);
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
        } catch (org.springframework.transaction.TransactionException unavailable) { throw new Failure(Code.DEPENDENCY_UNAVAILABLE); }
        finally { active.remove(); }
    }
    static String lockKey(Scope scope) { return "IRT-EFFECTIVE-V1:"+scope.organizationId()+":"+scope.bankId()+":"+scope.modelId(); }
    void require(Scope scope) { if (!scope.equals(active.get()) || !TransactionSynchronizationManager.isActualTransactionActive()) throw new IllegalStateException("Calibration scope transaction required"); }
    @Override public Optional<Run> find(Scope scope,UUID runId) {
        require(scope);
        return runs.find(runId,scope.modelId(),scope.organizationId().toString(),scope.bankId().toString()).stream().map(row->{
            Envelope envelope=json.read((String) row[0],Envelope.class);
            Calibration.require(envelope.request().scope().equals(scope) && envelope.request().runId().equals(runId)
                    && envelope.request().datasetRef().equals(row[4]));
            return new Run(runId,envelope,Status.valueOf((String) row[1]),(UUID) row[2],diagnostics((String) row[3]),
                    AdaptiveAttemptRows.instant(row[5]),AdaptiveAttemptRows.instant(row[6]),AdaptiveAttemptRows.instant(row[7]));
        }).toList().stream().findFirst();
    }
    @SuppressWarnings("unchecked") private Map<String,Object> diagnostics(String value) { return json.read(value,Map.class); }
    @Override public Run reserve(Envelope envelope) {
        var r=envelope.request(); require(r.scope());
        runs.insert(new IrtCalibrationRunEntity(r.runId(),r.scope().modelId(),r.datasetRef(),json.write(envelope),"PENDING",null,null,null,null,null));
        return required(r.scope(),r.runId());
    }
    @Override public Run claim(Scope scope,UUID runId,UUID token) {
        require(scope); Run run=required(scope,runId);
        if (run.status()!=Status.PENDING) throw new Failure(Code.CONFLICT);
        Instant time=time();
        int claimed=runs.claim(runId,time,json.write(Map.of(
                "origin",run.envelope().origin(),"workerToken",token.toString(),"expiresAt",time.plusSeconds(300).toString())));
        if (claimed!=1) throw new Failure(Code.CONFLICT);
        return required(scope,runId);
    }
    @Override public Run complete(Scope scope,UUID runId,UUID token,Result result) {
        require(scope); Run run=owned(scope,runId,token);
        if (Boolean.TRUE.equals(run.diagnostics().get("cancelRequested"))) throw new Failure(Code.CANCELLED);
        if (!time().isBefore(run.startedAt().plusSeconds(300))) throw new Failure(Code.TIMEOUT);
        UUID output=candidates.insert(run.envelope(),result);
        var diagnostics=new java.util.TreeMap<String,Object>(Map.of("origin",result.origin(),"result",result,
                "operationalPromotionEligible",false,"parameterHash",json.hash(Map.of("envelope",run.envelope(),"result",result))));
        if(json.policyFor(result.algorithmHash()).generic()){
            String configuration=pins.modelConfiguration(scope.modelId()).stream().findFirst()
                    .orElseThrow(()->new EmptyResultDataAccessException(1));
            var model=json.read(configuration,com.adaptlearngraph.utility.AdaptiveIrtPolicy.Model.class);
            boolean compatible=result.items().stream().allMatch(item->item.a()>=model.minA() && item.a()<=model.maxA()
                    && StrictMath.abs(item.b())<=model.maxAbsB() && item.c()<=model.maxC());
            diagnostics.put("runtimeCompatibility",compatible?"COMPATIBLE":"INCOMPATIBLE");
            diagnostics.put("runtimeModelConfigurationHash",run.envelope().request().modelConfigurationHash());
        }
        if (runs.complete(runId,token.toString(),output,json.write(diagnostics))!=1) throw new Failure(Code.CONFLICT);
        return required(scope,runId);
    }
    @Override public Run fail(Scope scope,UUID runId,UUID token,Code reason,Map<String,Object> diagnostics) {
        require(scope); Run run=required(scope,runId);
        if (run.status()==Status.SUCCEEDED || run.status()==Status.FAILED) return run;
        owned(scope,runId,token); return failure(scope,runId,run,reason,diagnostics,token);
    }
    @Override public Run recoverExpired(Scope scope,UUID runId) {
        require(scope); Run run=required(scope,runId);
        if (run.status()==Status.SUCCEEDED || run.status()==Status.FAILED) return run;
        if (run.status()!=Status.RUNNING || time().isBefore(run.startedAt().plusSeconds(300))) throw new Failure(Code.CONFLICT);
        return failure(scope,runId,run,Code.TIMEOUT,Map.of("recoveredAfterExpiry",true),null);
    }
    /** A non-null owner token fences the update to the current lease holder; null is used only by lock-verified recovery/cancel. */
    private Run failure(Scope scope,UUID runId,Run run,Code reason,Map<String,Object> details,UUID owner) {
        var diagnostics=new java.util.TreeMap<String,Object>(details); diagnostics.put("origin",run.envelope().origin()); diagnostics.put("reason",reason);
        String value=json.write(diagnostics);
        int failed=owner==null ? runs.failRunning(runId,value) : runs.failOwned(runId,owner.toString(),value);
        if (failed!=1) throw new Failure(Code.CONFLICT);
        return required(scope,runId);
    }
    @Override public Run cancel(Scope scope,UUID runId) {
        require(scope); Run run=required(scope,runId);
        if (run.status()==Status.SUCCEEDED || run.status()==Status.FAILED) return run;
        if (run.status()==Status.PENDING) {
            UUID token=UUID.randomUUID();
            run=claim(scope,runId,token);
            return failure(scope,runId,run,Code.CANCELLED,Map.of(),token);
        }
        if (runs.requestCancel(runId)!=1) throw new Failure(Code.CONFLICT);
        return required(scope,runId);
    }
    private Run owned(Scope scope,UUID runId,UUID token) {
        Run run=required(scope,runId);
        if (run.status()!=Status.RUNNING || !token.toString().equals(run.diagnostics().get("workerToken"))) throw new Failure(Code.CONFLICT);
        return run;
    }
    private Run required(Scope scope,UUID id) { return find(scope,id).orElseThrow(()->new Failure(Code.NOT_FOUND)); }
    private Instant time() { return AdaptiveAttemptRows.instant(runs.clockTimestamp()); }
    @Override public Candidate candidate(Scope scope,UUID id) { require(scope); return candidates.load(scope,id); }
    @Override public WorkerLease acquireWorker() { return JdbcCalibrationWorker.acquire(dataSource); }
}
