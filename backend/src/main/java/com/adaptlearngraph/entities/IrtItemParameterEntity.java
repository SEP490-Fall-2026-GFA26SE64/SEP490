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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Sealed per-item IRT parameters of a parameter set; append-only (trigger-frozen). */
@Entity
@Immutable
@Table(schema = "platform", name = "irt_item_parameter")
@IdClass(IrtItemParameterEntity.Key.class)
@DynamicInsert
public class IrtItemParameterEntity {
    @Id
    @Column(name = "parameter_set_id")
    private UUID parameterSetId;
    @Id
    @Column(name = "item_version_id")
    private UUID itemVersionId;
    @Id
    @Column(name = "micro_skill_id")
    private String microSkillId;
    @Column(name = "discrimination_a", nullable = false)
    private BigDecimal discriminationA;
    @Column(name = "difficulty_b", nullable = false)
    private BigDecimal difficultyB;
    @Column(name = "guessing_c", nullable = false)
    private BigDecimal guessingC;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "fit_diagnostics", nullable = false, columnDefinition = "jsonb")
    private String fitDiagnostics;

    protected IrtItemParameterEntity() {
    }

    @SuppressWarnings("java:S107")
    public IrtItemParameterEntity(UUID parameterSetId, UUID itemVersionId, String microSkillId, BigDecimal discriminationA, BigDecimal difficultyB, BigDecimal guessingC, String fitDiagnostics) {
        this.parameterSetId = parameterSetId;
        this.itemVersionId = itemVersionId;
        this.microSkillId = microSkillId;
        this.discriminationA = discriminationA;
        this.difficultyB = difficultyB;
        this.guessingC = guessingC;
        this.fitDiagnostics = fitDiagnostics;
    }

    public UUID getParameterSetId() { return parameterSetId; }
    public UUID getItemVersionId() { return itemVersionId; }
    public String getMicroSkillId() { return microSkillId; }
    public BigDecimal getDiscriminationA() { return discriminationA; }
    public BigDecimal getDifficultyB() { return difficultyB; }
    public BigDecimal getGuessingC() { return guessingC; }
    public String getFitDiagnostics() { return fitDiagnostics; }

    public record Key(UUID parameterSetId, UUID itemVersionId, String microSkillId) implements Serializable {
        public Key() {
            this(null, null, null);
        }
    }
}
