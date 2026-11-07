package com.adaptlearngraph.entities;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity @Table(schema="platform",name="assessment_rule_policy_version")
public class AssessmentRulePolicyEntity {
    public static final String HASH_DOMAIN="ASSESSMENT_POLICY_V1";
    @Id private UUID id;
    @Column(name="organization_id",nullable=false) private UUID organizationId;
    @Column(nullable=false) private String purpose;
    @Column(nullable=false) private long version;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable=false,columnDefinition="jsonb") private String configuration;
    @Column(name="configuration_hash",nullable=false,columnDefinition=PostgresColumnTypes.CONTENT_HASH) private String configurationHash;
    @Column(name="hash_domain",nullable=false) private String hashDomain=HASH_DOMAIN;
    @Column(name="scope_key",columnDefinition=PostgresColumnTypes.CONTENT_HASH) private String scopeKey;
    @Column(name="catalog_hash",columnDefinition=PostgresColumnTypes.CONTENT_HASH) private String catalogHash;
    @Column(name="created_by",nullable=false) private UUID createdBy;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="published_by",nullable=false) private UUID publishedBy;
    @Column(name="published_at",nullable=false) private Instant publishedAt;
    protected AssessmentRulePolicyEntity() {}
    public AssessmentRulePolicyEntity(UUID id,UUID org,String purpose,long version,String configuration,String hash,UUID actor,Instant now) {
        this.id=id;this.organizationId=org;this.purpose=purpose;this.version=version;this.configuration=configuration;
        this.configurationHash=hash;this.createdBy=actor;this.publishedBy=actor;this.createdAt=now;this.publishedAt=now;
    }
    public UUID getId(){return id;}
    public AssessmentRulePolicyEntity(UUID id,UUID org,String purpose,long version,String configuration,String hash,UUID actor,Instant now,
                                      String scopeKey,String catalogHash) {
        this(id,org,purpose,version,configuration,hash,actor,now);
        this.scopeKey=java.util.Objects.requireNonNull(scopeKey);this.catalogHash=java.util.Objects.requireNonNull(catalogHash);
    }
    public String getScopeKey(){return scopeKey;}
    public String getCatalogHash(){return catalogHash;}
    public UUID getOrganizationId(){return organizationId;}
    public String getPurpose(){return purpose;}
    public long getVersion(){return version;}
    public String getConfiguration(){return configuration;}
    public String getConfigurationHash(){return configurationHash;}
    public String getHashDomain(){return hashDomain;}
    public UUID getCreatedBy(){return createdBy;}
    public Instant getCreatedAt(){return createdAt;}
}
