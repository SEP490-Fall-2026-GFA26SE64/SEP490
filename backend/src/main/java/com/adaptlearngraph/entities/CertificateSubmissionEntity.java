package com.adaptlearngraph.entities;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** Submitted evidence owner. Native fenced commands preserve immutable submission fields and decision history. */
@Entity
@Table(schema="platform",name="certificate_submission")
public class CertificateSubmissionEntity {
    @Id private UUID id;
    @Column(name="organization_id",nullable=false) private UUID organizationId;
    @Column(name="learner_id",nullable=false) private UUID learnerId;
    @Column(name="skill_id",nullable=false) private String skillId;
    @Column(name="knowledge_level",nullable=false) private String knowledgeLevel;
    @Column(name="definition_id",nullable=false) private String definitionId;
    @Column(name="definition_version",nullable=false) private String definitionVersion;
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name="definition_snapshot",nullable=false,columnDefinition="jsonb") private String definitionSnapshot;
    private long revision;private String status;
    @Column(name="submitted_at",nullable=false) private Instant submittedAt;
    @Column(name="replaces_submission_id") private UUID replacesSubmissionId;
    protected CertificateSubmissionEntity() {}
}
