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

/** platform.assessment_item: frozen manifest entries of an assessment version (triggers assessment_items_frozen). */
@Entity
@Immutable
@Table(schema = "platform", name = "assessment_item")
@IdClass(AssessmentItemEntity.Key.class)
@DynamicInsert
public class AssessmentItemEntity {
    @Id
    @Column(name = "assessment_version_id")
    private UUID assessmentVersionId;
    @Id
    @Column(name = "item_position")
    private Integer itemPosition;
    @Column(name = "item_version_id", nullable = false)
    private UUID itemVersionId;
    @Column(name = "required", nullable = false)
    private Boolean required;
    @Column(name = "scoring_weight", nullable = false)
    private BigDecimal scoringWeight;
    @Column(name = "role_id")
    private String roleId;
    @Column(name = "role_name_snapshot")
    private String roleNameSnapshot;

    protected AssessmentItemEntity() {
    }

    @SuppressWarnings("java:S107")
    public AssessmentItemEntity(UUID assessmentVersionId, Integer itemPosition, UUID itemVersionId, Boolean required, BigDecimal scoringWeight, String roleId, String roleNameSnapshot) {
        this.assessmentVersionId = assessmentVersionId;
        this.itemPosition = itemPosition;
        this.itemVersionId = itemVersionId;
        this.required = required;
        this.scoringWeight = scoringWeight;
        this.roleId = roleId;
        this.roleNameSnapshot = roleNameSnapshot;
    }

    public UUID getAssessmentVersionId() { return assessmentVersionId; }
    public Integer getItemPosition() { return itemPosition; }
    public UUID getItemVersionId() { return itemVersionId; }
    public Boolean getRequired() { return required; }
    public BigDecimal getScoringWeight() { return scoringWeight; }
    public String getRoleId() { return roleId; }
    public String getRoleNameSnapshot() { return roleNameSnapshot; }

    public record Key(UUID assessmentVersionId, Integer itemPosition) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
