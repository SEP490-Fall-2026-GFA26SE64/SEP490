package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.baseline_blueprint_version_registry: trigger-maintained version namespace shared by fixed and adaptive Blueprints. */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_blueprint_version_registry")
@IdClass(BaselineBlueprintVersionRegistryEntity.Key.class)
@DynamicInsert
public class BaselineBlueprintVersionRegistryEntity {
    @Id
    @Column(name = "blueprint_id")
    private UUID blueprintId;
    @Id
    @Column(name = "version")
    private Integer version;
    @Column(name = "contract_family", nullable = false)
    private String contractFamily;

    protected BaselineBlueprintVersionRegistryEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineBlueprintVersionRegistryEntity(UUID blueprintId, Integer version, String contractFamily) {
        this.blueprintId = blueprintId;
        this.version = version;
        this.contractFamily = contractFamily;
    }

    public UUID getBlueprintId() { return blueprintId; }
    public Integer getVersion() { return version; }
    public String getContractFamily() { return contractFamily; }

    public record Key(UUID blueprintId, Integer version) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
