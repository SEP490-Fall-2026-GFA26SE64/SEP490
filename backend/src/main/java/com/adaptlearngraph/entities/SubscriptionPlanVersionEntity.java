package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.subscription_plan_version: immutable plan terms (trigger subscription_plan_version_immutable). */
@Entity
@Immutable
@Table(schema = "platform", name = "subscription_plan_version")
@DynamicInsert
public class SubscriptionPlanVersionEntity {
    @Id
    @Column(name = "version_id")
    private UUID versionId;
    @Column(name = "plan_id", nullable = false)
    private UUID planId;
    @Column(name = "revision", nullable = false)
    private Long revision;
    @Column(name = "name", nullable = false)
    private String name;
    @Column(name = "description", nullable = false)
    private String description;
    @Column(name = "price_vnd", nullable = false)
    private Long priceVnd;
    @Column(name = "currency", nullable = false)
    private String currency;
    @Column(name = "duration_months", nullable = false)
    private Integer durationMonths;
    @Column(name = "employee_seats", nullable = false)
    private Integer employeeSeats;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "created_by")
    private UUID createdBy;
    @Column(name = "creation_source", nullable = false)
    private String creationSource;

    protected SubscriptionPlanVersionEntity() {
    }

    public SubscriptionPlanVersionEntity(UUID versionId, UUID planId, long revision, String name, String description,
            long priceVnd, String currency, int durationMonths, int employeeSeats, Instant createdAt, UUID createdBy,
            String creationSource) {
        this.versionId = versionId;
        this.planId = planId;
        this.revision = revision;
        this.name = name;
        this.description = description;
        this.priceVnd = priceVnd;
        this.currency = currency;
        this.durationMonths = durationMonths;
        this.employeeSeats = employeeSeats;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.creationSource = creationSource;
    }

    public UUID getVersionId() { return versionId; }
    public UUID getPlanId() { return planId; }
    public Long getRevision() { return revision; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public Long getPriceVnd() { return priceVnd; }
    public String getCurrency() { return currency; }
    public Integer getDurationMonths() { return durationMonths; }
    public Integer getEmployeeSeats() { return employeeSeats; }
    public Instant getCreatedAt() { return createdAt; }
    public UUID getCreatedBy() { return createdBy; }
    public String getCreationSource() { return creationSource; }
}
