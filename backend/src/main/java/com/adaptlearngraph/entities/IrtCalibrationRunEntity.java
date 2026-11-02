package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** IRT calibration run lifecycle; state transitions only through guarded conditional statements (trigger-enforced). */
@Entity
@Table(schema = "platform", name = "irt_calibration_run")
@DynamicInsert
@DynamicUpdate
public class IrtCalibrationRunEntity {
    @Id
    @Column(name = "calibration_run_id")
    private UUID calibrationRunId;
    @Column(name = "model_version_id", nullable = false)
    private UUID modelVersionId;
    @Column(name = "input_dataset_ref", nullable = false)
    private String inputDatasetRef;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "configuration", nullable = false, columnDefinition = "jsonb")
    private String configuration;
    @Column(name = "status", nullable = false)
    private String status;
    @Column(name = "output_parameter_set_id")
    private UUID outputParameterSetId;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "diagnostics", nullable = false, columnDefinition = "jsonb")
    private String diagnostics;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "started_at")
    private Instant startedAt;
    @Column(name = "completed_at")
    private Instant completedAt;

    protected IrtCalibrationRunEntity() {
    }

    @SuppressWarnings("java:S107")
    public IrtCalibrationRunEntity(UUID calibrationRunId, UUID modelVersionId, String inputDatasetRef, String configuration, String status, UUID outputParameterSetId, String diagnostics, Instant createdAt, Instant startedAt, Instant completedAt) {
        this.calibrationRunId = calibrationRunId;
        this.modelVersionId = modelVersionId;
        this.inputDatasetRef = inputDatasetRef;
        this.configuration = configuration;
        this.status = status;
        this.outputParameterSetId = outputParameterSetId;
        this.diagnostics = diagnostics;
        this.createdAt = createdAt;
        this.startedAt = startedAt;
        this.completedAt = completedAt;
    }

    public UUID getCalibrationRunId() { return calibrationRunId; }
    public UUID getModelVersionId() { return modelVersionId; }
    public String getInputDatasetRef() { return inputDatasetRef; }
    public String getConfiguration() { return configuration; }
    public String getStatus() { return status; }
    public UUID getOutputParameterSetId() { return outputParameterSetId; }
    public String getDiagnostics() { return diagnostics; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getCompletedAt() { return completedAt; }
}
