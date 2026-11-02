package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.IrtCalibrationRunEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Calibration run lifecycle (V18). Runs carry their organization/bank provenance only inside the jsonb configuration,
 * so every scoped read filters on those jsonb paths natively. State changes are guarded conditional statements whose
 * row counts the adapter checks; the history trigger stays authoritative for legal transitions.
 */
public interface IrtCalibrationRunJpaRepository extends Repository<IrtCalibrationRunEntity, UUID>,
        InsertOnlyRepository<IrtCalibrationRunEntity> {

    // set_config(...,true) is SET LOCAL; session settings have no JPQL form.
    @Query(value = "SELECT set_config('lock_timeout','3s',true)||set_config('statement_timeout','5s',true)", nativeQuery = true)
    String boundLocalTimeouts();

    // clock_timestamp() (wall clock inside the transaction) has no JPQL equivalent.
    @Query(value = "SELECT clock_timestamp()", nativeQuery = true)
    Object clockTimestamp();

    /**
     * Columns: [configuration, status, output_parameter_set_id, diagnostics, input_dataset_ref, created_at, started_at,
     * completed_at]; jsonb cast to text.
     */
    // jsonb path filters on the run configuration (organization/bank scope).
    @Query(value = """
            SELECT configuration::text,status,output_parameter_set_id,diagnostics::text,input_dataset_ref,created_at,started_at,completed_at
            FROM platform.irt_calibration_run WHERE calibration_run_id=:run AND model_version_id=:model
              AND configuration->'request'->'scope'->>'organizationId'=:org
              AND configuration->'request'->'scope'->>'bankId'=:bank
            """, nativeQuery = true)
    List<Object[]> find(@Param("run") UUID runId, @Param("model") UUID modelVersionId, @Param("org") String organizationId,
            @Param("bank") String bankId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update IrtCalibrationRunEntity r set r.status='RUNNING',r.startedAt=:time,r.diagnostics=:diagnostics
            where r.calibrationRunId=:run and r.status='PENDING'
            """)
    int claim(@Param("run") UUID runId, @Param("time") Instant startedAt, @Param("diagnostics") String diagnostics);

    // clock_timestamp() completion time and a jsonb path fence on the current worker token.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.irt_calibration_run SET status='SUCCEEDED',output_parameter_set_id=:output,
                diagnostics=CAST(:diagnostics AS jsonb),completed_at=clock_timestamp()
            WHERE calibration_run_id=:run AND status='RUNNING' AND diagnostics->>'workerToken'=:token
            """, nativeQuery = true)
    int complete(@Param("run") UUID runId, @Param("token") String workerToken, @Param("output") UUID outputParameterSetId,
            @Param("diagnostics") String diagnostics);

    // clock_timestamp() completion time and a jsonb path fence on the current worker token.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.irt_calibration_run SET status='FAILED',diagnostics=CAST(:diagnostics AS jsonb),completed_at=clock_timestamp()
            WHERE calibration_run_id=:run AND status='RUNNING' AND diagnostics->>'workerToken'=:token
            """, nativeQuery = true)
    int failOwned(@Param("run") UUID runId, @Param("token") String workerToken, @Param("diagnostics") String diagnostics);

    /** Owner-less terminal failure (cancellation, expired-lease recovery); callers verified state under the scope lock. */
    // clock_timestamp() completion time.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.irt_calibration_run SET status='FAILED',diagnostics=CAST(:diagnostics AS jsonb),completed_at=clock_timestamp()
            WHERE calibration_run_id=:run AND status='RUNNING'
            """, nativeQuery = true)
    int failRunning(@Param("run") UUID runId, @Param("diagnostics") String diagnostics);

    // jsonb_set has no JPQL equivalent.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.irt_calibration_run SET diagnostics=jsonb_set(diagnostics,'{cancelRequested}','true'::jsonb)
            WHERE calibration_run_id=:run AND status='RUNNING'
            """, nativeQuery = true)
    int requestCancel(@Param("run") UUID runId);
}
