package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.initial_pathway_module: ordered modules of an initial pathway revision (trigger initial_pathway_module_immutable). */
@Entity
@Immutable
@Table(schema = "platform", name = "initial_pathway_module")
@IdClass(InitialPathwayModuleEntity.Key.class)
@DynamicInsert
public class InitialPathwayModuleEntity {
    @Id
    @Column(name = "request_id")
    private UUID requestId;
    @Id
    @Column(name = "revision")
    private Long revision;
    @Id
    @Column(name = "module_id")
    private String moduleId;
    @Column(name = "content_version", nullable = false)
    private String contentVersion;
    @Column(name = "ordinal", nullable = false)
    private Integer ordinal;
    @Column(name = "duration_minutes", nullable = false)
    private BigDecimal durationMinutes;
    @Column(name = "price_vnd", nullable = false)
    private BigDecimal priceVnd;

    protected InitialPathwayModuleEntity() {
    }

    @SuppressWarnings("java:S107")
    public InitialPathwayModuleEntity(UUID requestId, Long revision, String moduleId, String contentVersion, Integer ordinal, BigDecimal durationMinutes, BigDecimal priceVnd) {
        this.requestId = requestId;
        this.revision = revision;
        this.moduleId = moduleId;
        this.contentVersion = contentVersion;
        this.ordinal = ordinal;
        this.durationMinutes = durationMinutes;
        this.priceVnd = priceVnd;
    }

    public UUID getRequestId() { return requestId; }
    public Long getRevision() { return revision; }
    public String getModuleId() { return moduleId; }
    public String getContentVersion() { return contentVersion; }
    public Integer getOrdinal() { return ordinal; }
    public BigDecimal getDurationMinutes() { return durationMinutes; }
    public BigDecimal getPriceVnd() { return priceVnd; }

    public record Key(UUID requestId, Long revision, String moduleId) implements Serializable {
        public Key() {
            this(null, null, null);
        }
    }
}
