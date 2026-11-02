package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.initial_pathway_run: finished generation runs (trigger initial_pathway_run_immutable). */
@Entity
@Immutable
@Table(schema = "platform", name = "initial_pathway_run")
@DynamicInsert
public class InitialPathwayRunEntity {
    @Id
    @Column(name = "run_id")
    private UUID runId;
    @Column(name = "request_id", nullable = false)
    private UUID requestId;
    @Column(name = "claim_token", nullable = false)
    private UUID claimToken;
    @Column(name = "worker_version", nullable = false)
    private String workerVersion;
    @Column(name = "generation_status", nullable = false)
    private String generationStatus;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "diagnostics", nullable = false, columnDefinition = "jsonb")
    private String diagnostics;
    @Column(name = "finished_at", nullable = false)
    private Instant finishedAt;

    protected InitialPathwayRunEntity() {
    }

    @SuppressWarnings("java:S107")
    public InitialPathwayRunEntity(UUID runId, UUID requestId, UUID claimToken, String workerVersion, String generationStatus, String diagnostics, Instant finishedAt) {
        this.runId = runId;
        this.requestId = requestId;
        this.claimToken = claimToken;
        this.workerVersion = workerVersion;
        this.generationStatus = generationStatus;
        this.diagnostics = diagnostics;
        this.finishedAt = finishedAt;
    }

    public UUID getRunId() { return runId; }
    public UUID getRequestId() { return requestId; }
    public UUID getClaimToken() { return claimToken; }
    public String getWorkerVersion() { return workerVersion; }
    public String getGenerationStatus() { return generationStatus; }
    public String getDiagnostics() { return diagnostics; }
    public Instant getFinishedAt() { return finishedAt; }
}
