package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.question_bank_mail: leased notification outbox of the question bank (never contains answer keys). */
@Entity
@Table(schema = "platform", name = "question_bank_mail")
@DynamicInsert
@DynamicUpdate
public class QuestionBankMailEntity {
    @Id
    @Column(name = "notice_id")
    private UUID noticeId;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;
    @Column(name = "recipient", nullable = false, updatable = false)
    private UUID recipient;
    @Column(name = "title", nullable = false)
    private String title;
    @Column(name = "body", nullable = false)
    private String body;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "status")
    private String status;
    @Column(name = "attempts")
    private Integer attempts;
    @Column(name = "next_attempt")
    private Instant nextAttempt;
    @Column(name = "lease_owner")
    private UUID leaseOwner;
    @Column(name = "lease_until")
    private Instant leaseUntil;
    @Column(name = "error_code")
    private String errorCode;

    protected QuestionBankMailEntity() {
    }

    public UUID getNoticeId() { return noticeId; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getRecipient() { return recipient; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public Instant getCreatedAt() { return createdAt; }
    public String getStatus() { return status; }
    public Integer getAttempts() { return attempts; }
    public Instant getNextAttempt() { return nextAttempt; }
    public UUID getLeaseOwner() { return leaseOwner; }
    public Instant getLeaseUntil() { return leaseUntil; }
    public String getErrorCode() { return errorCode; }
}