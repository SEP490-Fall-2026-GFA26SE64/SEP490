package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.employee_role_selection_request: recorded role-selection command replies (trigger employee_role_request_immutable). */
@Entity
@Immutable
@Table(schema = "platform", name = "employee_role_selection_request")
@IdClass(EmployeeRoleSelectionRequestEntity.Key.class)
@DynamicInsert
public class EmployeeRoleSelectionRequestEntity {
    @Id
    @Column(name = "organization_id")
    private UUID organizationId;
    @Id
    @Column(name = "learner_id")
    private UUID learnerId;
    @Id
    @Column(name = "retry_key")
    private String retryKey;
    @Column(name = "request_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String requestHash;
    @Column(name = "selection_id", nullable = false)
    private UUID selectionId;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response", nullable = false, columnDefinition = "jsonb")
    private String response;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected EmployeeRoleSelectionRequestEntity() {
    }

    @SuppressWarnings("java:S107")
    public EmployeeRoleSelectionRequestEntity(UUID organizationId, UUID learnerId, String retryKey, String requestHash, UUID selectionId, String response, Instant createdAt) {
        this.organizationId = organizationId;
        this.learnerId = learnerId;
        this.retryKey = retryKey;
        this.requestHash = requestHash;
        this.selectionId = selectionId;
        this.response = response;
        this.createdAt = createdAt;
    }

    public UUID getOrganizationId() { return organizationId; }
    public UUID getLearnerId() { return learnerId; }
    public String getRetryKey() { return retryKey; }
    public String getRequestHash() { return requestHash; }
    public UUID getSelectionId() { return selectionId; }
    public String getResponse() { return response; }
    public Instant getCreatedAt() { return createdAt; }

    public record Key(UUID organizationId, UUID learnerId, String retryKey) implements Serializable {
        public Key() {
            this(null, null, null);
        }
    }
}
