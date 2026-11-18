package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.registration_org_structure; {@code structure} is the normalized imported structure as jsonb. */
@Entity
@Table(schema = "platform", name = "registration_org_structure")
public class RegistrationOrgStructureEntity {
    @Id
    @Column(name = "registration_id")
    private UUID registrationId;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "structure", nullable = false, columnDefinition = "jsonb")
    private String structure;
    @Column(name = "node_count", nullable = false)
    private int nodeCount;
    @Column(name = "relationship_count", nullable = false)
    private int relationshipCount;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected RegistrationOrgStructureEntity() {
    }

    public RegistrationOrgStructureEntity(UUID registrationId, String structure, int nodeCount, int relationshipCount,
                                          Instant createdAt) {
        this.registrationId = registrationId;
        this.structure = structure;
        this.nodeCount = nodeCount;
        this.relationshipCount = relationshipCount;
        this.createdAt = createdAt;
    }

    public UUID getRegistrationId() { return registrationId; }
    public String getStructure() { return structure; }
    public int getNodeCount() { return nodeCount; }
    public int getRelationshipCount() { return relationshipCount; }
    public Instant getCreatedAt() { return createdAt; }
}
