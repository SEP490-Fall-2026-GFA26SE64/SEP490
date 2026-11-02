package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;

/** platform.organization_membership_role (single role per membership, enforced by membership_single_role). */
@Entity
@Table(schema = "platform", name = "organization_membership_role")
@IdClass(OrganizationMembershipRoleEntity.Key.class)
@DynamicInsert
public class OrganizationMembershipRoleEntity {
    @Id
    @Column(name = "membership_id")
    private UUID membershipId;
    @Id
    @Column(name = "role_code")
    private String roleCode;

    protected OrganizationMembershipRoleEntity() {
    }

    public OrganizationMembershipRoleEntity(UUID membershipId, String roleCode) {
        this.membershipId = membershipId;
        this.roleCode = roleCode;
    }

    public UUID getMembershipId() { return membershipId; }
    public String getRoleCode() { return roleCode; }

    public record Key(UUID membershipId, String roleCode) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
