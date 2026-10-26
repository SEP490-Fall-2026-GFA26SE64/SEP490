package com.adaptlearngraph.assessment.adaptive.calibration.infrastructure;

import com.adaptlearngraph.assessment.adaptive.calibration.application.CalibrationPorts.*;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.*;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import javax.sql.DataSource;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/** V18 run lifecycle adapter. No schema creation, account/model provisioning or automatic execution. */
public final class JdbcCalibrationStore implements Store {
    private final DataSource dataSource;
    private final NamedParameterJdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final CalibrationJson json;
    private final JdbcCalibrationCandidates candidates;
    private final ThreadLocal<Scope> active=new ThreadLocal<>();
    public JdbcCalibrationStore(DataSource dataSource,CalibrationJson json) {
        this.dataSource=dataSource; this.json=json; jdbc=new NamedParameterJdbcTemplate(dataSource);
        transactions=new TransactionTemplate(new JdbcTransactionManager(dataSource));
        transactions.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED); transactions.setTimeout(10);
        candidates=new JdbcCalibrationCandidates(jdbc,json);
    }
    @Override public <T> T transaction(Scope scope,Supplier<T> work) {
        if (active.get()!=null || TransactionSynchronizationManager.isActualTransactionActive()) throw new IllegalStateException("Enter calibration scope once");
        active.set(scope);
        try {
            return transactions.execute(status->{
                jdbc.getJdbcTemplate().execute("SET LOCAL lock_timeout='3s'"); jdbc.getJdbcTemplate().execute("SET LOCAL statement_timeout='5s'");
                jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(:scope,0))",
                        Map.of("scope",lockKey(scope)),(rs,row)->true);
                return work.get();
            });
        } catch (org.springframework.dao.DuplicateKeyException collision) { throw new Failure(Code.CONFLICT); }
        catch (org.springframework.dao.DataAccessException | org.springframework.transaction.TransactionException unavailable) { throw new Failure(Code.DEPENDENCY_UNAVAILABLE); }
        finally { active.remove(); }
    }
    static String lockKey(Scope scope) { return "IRT-EFFECTIVE-V1:"+scope.organizationId()+":"+scope.bankId()+":"+scope.modelId(); }
    void require(Scope scope) { if (!scope.equals(active.get()) || !TransactionSynchronizationManager.isActualTransactionActive()) throw new IllegalStateException("Calibration scope transaction required"); }
    @Override public Optional<Run> find(Scope scope,UUID runId) {
        require(scope);
        return jdbc.query("""
                SELECT * FROM platform.irt_calibration_run WHERE calibration_run_id=:run AND model_version_id=:model
                  AND configuration->'request'->'scope'->>'organizationId'=:org
                  AND configuration->'request'->'scope'->>'bankId'=:bank
                """,key(scope,runId),(rs,row)->{
            Envelope envelope=json.read(rs.getString("configuration"),Envelope.class);
            Calibration.require(envelope.request().scope().equals(scope) && envelope.request().runId().equals(runId)
                    && envelope.request().datasetRef().equals(rs.getString("input_dataset_ref")));
            return new Run(runId,envelope,Status.valueOf(rs.getString("status")),rs.getObject("output_parameter_set_id",UUID.class),
                    diagnostics(rs.getString("diagnostics")),rs.getTimestamp("created_at").toInstant(),
                    rs.getTimestamp("started_at")==null?null:rs.getTimestamp("started_at").toInstant(),
                    rs.getTimestamp("completed_at")==null?null:rs.getTimestamp("completed_at").toInstant());
        }).stream().findFirst();
    }
    @SuppressWarnings("unchecked") private Map<String,Object> diagnostics(String value) { return json.read(value,Map.class); }
    @Override public Run reserve(Envelope envelope) {
        var r=envelope.request(); require(r.scope());
        jdbc.update("""
                INSERT INTO platform.irt_calibration_run(calibration_run_id,model_version_id,input_dataset_ref,configuration,status)
                VALUES (:run,:model,:ref,CAST(:config AS jsonb),'PENDING')
                """,key(r.scope(),r.runId()).addValue("ref",r.datasetRef()).addValue("config",json.write(envelope)));
        return required(r.scope(),r.runId());
    }
    @Override public Run claim(Scope scope,UUID runId,UUID token) {
        require(scope); Run run=required(scope,runId);
        if (run.status()!=Status.PENDING) throw new Failure(Code.CONFLICT);
        Instant time=time();
        jdbc.update("""
                UPDATE platform.irt_calibration_run SET status='RUNNING',started_at=:time,diagnostics=CAST(:diagnostics AS jsonb)
                WHERE calibration_run_id=:run AND status='PENDING'
                """,key(scope,runId).addValue("time",java.sql.Timestamp.from(time)).addValue("diagnostics",json.write(Map.of(
                        "origin",run.envelope().origin(),"workerToken",token.toString(),"expiresAt",time.plusSeconds(300).toString()))));
        return required(scope,runId);
    }
    @Override public Run complete(Scope scope,UUID runId,UUID token,Result result) {
        require(scope); Run run=owned(scope,runId,token);
        if (Boolean.TRUE.equals(run.diagnostics().get("cancelRequested"))) throw new Failure(Code.CANCELLED);
        if (!time().isBefore(run.startedAt().plusSeconds(300))) throw new Failure(Code.TIMEOUT);
        UUID output=candidates.insert(run.envelope(),result);
        jdbc.update("""
                UPDATE platform.irt_calibration_run SET status='SUCCEEDED',output_parameter_set_id=:output,
                    diagnostics=CAST(:diagnostics AS jsonb),completed_at=clock_timestamp() WHERE calibration_run_id=:run AND status='RUNNING'
                """,key(scope,runId).addValue("output",output).addValue("diagnostics",json.write(Map.of("origin",result.origin(),
                        "result",result,"operationalPromotionEligible",false,"parameterHash",json.hash(Map.of("envelope",run.envelope(),"result",result))))));
        return required(scope,runId);
    }
    @Override public Run fail(Scope scope,UUID runId,UUID token,Code reason,Map<String,Object> diagnostics) {
        require(scope); Run run=required(scope,runId);
        if (run.status()==Status.SUCCEEDED || run.status()==Status.FAILED) return run;
        owned(scope,runId,token); return failure(scope,runId,run,reason,diagnostics);
    }
    @Override public Run recoverExpired(Scope scope,UUID runId) {
        require(scope); Run run=required(scope,runId);
        if (run.status()==Status.SUCCEEDED || run.status()==Status.FAILED) return run;
        if (run.status()!=Status.RUNNING || time().isBefore(run.startedAt().plusSeconds(300))) throw new Failure(Code.CONFLICT);
        return failure(scope,runId,run,Code.TIMEOUT,Map.of("recoveredAfterExpiry",true));
    }
    private Run failure(Scope scope,UUID runId,Run run,Code reason,Map<String,Object> details) {
        var diagnostics=new java.util.TreeMap<String,Object>(details); diagnostics.put("origin",run.envelope().origin()); diagnostics.put("reason",reason);
        jdbc.update("""
                UPDATE platform.irt_calibration_run SET status='FAILED',diagnostics=CAST(:diagnostics AS jsonb),completed_at=clock_timestamp()
                WHERE calibration_run_id=:run AND status='RUNNING'
                """,key(scope,runId).addValue("diagnostics",json.write(diagnostics)));
        return required(scope,runId);
    }
    @Override public Run cancel(Scope scope,UUID runId) {
        require(scope); Run run=required(scope,runId);
        if (run.status()==Status.SUCCEEDED || run.status()==Status.FAILED) return run;
        if (run.status()==Status.PENDING) {
            run=claim(scope,runId,UUID.randomUUID());
            return failure(scope,runId,run,Code.CANCELLED,Map.of());
        }
        jdbc.update("""
                UPDATE platform.irt_calibration_run SET diagnostics=jsonb_set(diagnostics,'{cancelRequested}','true'::jsonb)
                WHERE calibration_run_id=:run AND status='RUNNING'
                """,key(scope,runId));
        return required(scope,runId);
    }
    private Run owned(Scope scope,UUID runId,UUID token) {
        Run run=required(scope,runId);
        if (run.status()!=Status.RUNNING || !token.toString().equals(run.diagnostics().get("workerToken"))) throw new Failure(Code.CONFLICT);
        return run;
    }
    private Run required(Scope scope,UUID id) { return find(scope,id).orElseThrow(()->new Failure(Code.NOT_FOUND)); }
    private Instant time() { return jdbc.queryForObject("SELECT clock_timestamp()",Map.of(),(rs,row)->rs.getTimestamp(1).toInstant()); }
    @Override public Candidate candidate(Scope scope,UUID id) { require(scope); return candidates.load(scope,id); }
    @Override public WorkerLease acquireWorker() { return JdbcCalibrationWorker.acquire(dataSource); }
    static MapSqlParameterSource key(Scope scope,UUID runId) {
        return new MapSqlParameterSource("run",runId).addValue("model",scope.modelId()).addValue("org",scope.organizationId().toString()).addValue("bank",scope.bankId().toString());
    }
}
