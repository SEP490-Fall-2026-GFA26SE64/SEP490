package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.subscription_plan: global plan identity pointing at its current immutable version. */
@Entity
@Table(schema = "platform", name = "subscription_plan")
@DynamicInsert
@DynamicUpdate
public class SubscriptionPlanEntity {
    @Id
    @Column(name = "plan_id")
    private UUID planId;
    @Column(name = "code", nullable = false, updatable = false)
    private String code;
    @Column(name = "current_version_id", nullable = false)
    private UUID currentVersionId;

    protected SubscriptionPlanEntity() {
    }

    public UUID getPlanId() { return planId; }
    public String getCode() { return code; }
    public UUID getCurrentVersionId() { return currentVersionId; }
}
