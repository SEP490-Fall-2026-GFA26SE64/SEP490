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

/** platform.account_role: application role granted to an account; rows are only inserted or removed. */
@Entity
@Immutable
@Table(schema = "platform", name = "account_role")
@IdClass(AccountRoleEntity.Key.class)
@DynamicInsert
public class AccountRoleEntity {
    @Id
    @Column(name = "account_id")
    private UUID accountId;
    @Id
    @Column(name = "role_code")
    private String roleCode;

    protected AccountRoleEntity() {
    }

    @SuppressWarnings("java:S107")
    public AccountRoleEntity(UUID accountId, String roleCode) {
        this.accountId = accountId;
        this.roleCode = roleCode;
    }

    public UUID getAccountId() { return accountId; }
    public String getRoleCode() { return roleCode; }

    public record Key(UUID accountId, String roleCode) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
