package com.adaptlearngraph.entities;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity @Immutable @Table(schema="platform",name="pathway_requirement_snapshot")
public class PathwayRequirementSnapshotEntity {
    @Id private UUID id;
    @Column(name="organization_id",nullable=false) private UUID organizationId;
    @Column(name="learner_id",nullable=false) private UUID learnerId;
    @Column(name="selection_id",nullable=false) private UUID selectionId;
    @Column(name="selection_revision",nullable=false) private Long selectionRevision;
    @Column(name="content_hash",nullable=false,columnDefinition=PostgresColumnTypes.CONTENT_HASH) private String contentHash;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name="snapshot",nullable=false,columnDefinition="jsonb") private String snapshot;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    protected PathwayRequirementSnapshotEntity() {}
    public PathwayRequirementSnapshotEntity(UUID id,UUID org,UUID learner,UUID selection,long selectionRevision,String hash,String snapshot,Instant at) {
        this.id=id;organizationId=org;learnerId=learner;selectionId=selection;this.selectionRevision=selectionRevision;contentHash=hash;this.snapshot=snapshot;createdAt=at;
    }
}
