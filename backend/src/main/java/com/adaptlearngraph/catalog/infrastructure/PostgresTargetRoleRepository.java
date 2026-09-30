package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.port.in.TargetRoleFilter;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleRepository;
import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.RoleTrack;
import com.adaptlearngraph.catalog.domain.TargetRole;
import com.adaptlearngraph.catalog.domain.TargetRoleId;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public class PostgresTargetRoleRepository implements TargetRoleRepository {

    private final DataSource dataSource;

    public PostgresTargetRoleRepository(DataSource dataSource) {
        this.dataSource = Objects.requireNonNull(dataSource, "DataSource cannot be null");
    }

    @Override
    public boolean existsByOrganizationIdAndCode(String organizationId, String code) {
        String sql = "SELECT count(*) FROM platform.target_role WHERE organization_id = ? AND code = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, organizationId);
            ps.setString(2, code.trim().toUpperCase());
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1) > 0;
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to check target role existence in PostgreSQL", e);
        }
        return false;
    }

    @Override
    public boolean existsByOrganizationIdAndCodeAndVersion(String organizationId, String code, String version) {
        String sql = "SELECT count(*) FROM platform.target_role WHERE organization_id = ? AND code = ? AND version = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, organizationId);
            ps.setString(2, code.trim().toUpperCase());
            ps.setString(3, (version != null && !version.isBlank()) ? version.trim() : "1.0");
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1) > 0;
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to check target role existence in PostgreSQL", e);
        }
        return false;
    }

    @Override
    public TargetRole save(TargetRole targetRole) {
        String sql = """
                INSERT INTO platform.target_role (
                    role_id, organization_id, code, name, domain_code, family_code,
                    track, assigned_expert_id, description, status, version, skill_targets, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (role_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    domain_code = EXCLUDED.domain_code,
                    family_code = EXCLUDED.family_code,
                    track = EXCLUDED.track,
                    assigned_expert_id = EXCLUDED.assigned_expert_id,
                    description = EXCLUDED.description,
                    status = EXCLUDED.status,
                    version = EXCLUDED.version,
                    skill_targets = EXCLUDED.skill_targets,
                    updated_at = EXCLUDED.updated_at
                RETURNING role_id, created_at, updated_at
                """;
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setObject(1, targetRole.getId().value());
            ps.setString(2, targetRole.getOrganizationId());
            ps.setString(3, targetRole.getCode());
            ps.setString(4, targetRole.getName());
            ps.setString(5, targetRole.getDomainCode());
            ps.setString(6, targetRole.getFamilyCode());
            ps.setString(7, targetRole.getTrack().name());
            ps.setString(8, targetRole.getAssignedExpertId());
            ps.setString(9, targetRole.getDescription());
            ps.setString(10, targetRole.getStatus().name());
            ps.setString(11, targetRole.getVersion());
            ps.setString(12, targetRole.getSkillTargets());
            ps.setTimestamp(13, Timestamp.from(targetRole.getCreatedAt()));
            ps.setTimestamp(14, Timestamp.from(targetRole.getUpdatedAt()));

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    UUID returnedId = (UUID) rs.getObject("role_id");
                    Instant createdAt = rs.getTimestamp("created_at").toInstant();
                    Instant updatedAt = rs.getTimestamp("updated_at").toInstant();
                    return new TargetRole(
                            new TargetRoleId(returnedId != null ? returnedId : targetRole.getId().value()),
                            targetRole.getOrganizationId(),
                            targetRole.getCode(),
                            targetRole.getName(),
                            targetRole.getDomainCode(),
                            targetRole.getFamilyCode(),
                            targetRole.getTrack(),
                            targetRole.getAssignedExpertId(),
                            targetRole.getDescription(),
                            targetRole.getStatus(),
                            targetRole.getVersion(),
                            targetRole.getSkillTargets(),
                            createdAt,
                            updatedAt);
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to save target role in PostgreSQL", e);
        }
        return targetRole;
    }

    @Override
    public List<TargetRole> findByOrganizationId(String organizationId, TargetRoleFilter filter) {
        StringBuilder sql = new StringBuilder("""
                SELECT role_id, organization_id, code, name, domain_code, family_code,
                       track, assigned_expert_id, description, status, version, skill_targets, created_at, updated_at
                FROM platform.target_role
                WHERE organization_id = ?
                """);
        List<Object> params = new ArrayList<>();
        params.add(organizationId);

        if (filter.track() != null) {
            sql.append(" AND track = ?");
            params.add(filter.track().name());
        }
        if (filter.status() != null) {
            sql.append(" AND status = ?");
            params.add(filter.status().name());
        }
        if (filter.domainCode() != null && !filter.domainCode().isBlank()) {
            sql.append(" AND domain_code = ?");
            params.add(filter.domainCode().trim().toUpperCase());
        }
        if (filter.assignedExpertId() != null && !filter.assignedExpertId().isBlank()) {
            sql.append(" AND assigned_expert_id = ?");
            params.add(filter.assignedExpertId().trim());
        }
        if (filter.search() != null && !filter.search().isBlank()) {
            sql.append(" AND (lower(name) LIKE ? OR lower(code) LIKE ? OR lower(description) LIKE ?)");
            String term = "%" + filter.search().trim().toLowerCase() + "%";
            params.add(term);
            params.add(term);
            params.add(term);
        }

        sql.append(" ORDER BY code ASC");

        List<TargetRole> result = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql.toString())) {
            for (int i = 0; i < params.size(); i++) {
                ps.setObject(i + 1, params.get(i));
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    result.add(mapRow(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to query target roles from PostgreSQL", e);
        }
        return result;
    }

    @Override
    public Optional<TargetRole> findById(String organizationId, TargetRoleId id) {
        String sql = """
                SELECT role_id, organization_id, code, name, domain_code, family_code,
                       track, assigned_expert_id, description, status, version, skill_targets, created_at, updated_at
                FROM platform.target_role
                WHERE organization_id = ? AND role_id = ?
                """;
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, organizationId);
            ps.setObject(2, id.value());
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapRow(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find target role by ID in PostgreSQL", e);
        }
        return Optional.empty();
    }

    @Override
    public Optional<TargetRole> findByCode(String organizationId, String code) {
        String sql = """
                SELECT role_id, organization_id, code, name, domain_code, family_code,
                       track, assigned_expert_id, description, status, version, skill_targets, created_at, updated_at
                FROM platform.target_role
                WHERE organization_id = ? AND code = ?
                """;
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, organizationId);
            ps.setString(2, code.trim().toUpperCase());
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapRow(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find target role by code in PostgreSQL", e);
        }
        return Optional.empty();
    }

    @Override
    public void deleteById(String organizationId, TargetRoleId id) {
        String sql = "DELETE FROM platform.target_role WHERE organization_id = ? AND role_id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, organizationId);
            ps.setObject(2, id.value());
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to delete target role from PostgreSQL", e);
        }
    }

    private TargetRole mapRow(ResultSet rs) throws SQLException {
        UUID roleId = (UUID) rs.getObject("role_id");
        String orgId = rs.getString("organization_id");
        String code = rs.getString("code");
        String name = rs.getString("name");
        String domainCode = rs.getString("domain_code");
        String familyCode = rs.getString("family_code");
        RoleTrack track = RoleTrack.fromString(rs.getString("track"));
        String assignedExpertId = rs.getString("assigned_expert_id");
        String description = rs.getString("description");
        RoleStatus status = RoleStatus.fromString(rs.getString("status"));
        String version = rs.getString("version");
        String skillTargets = rs.getString("skill_targets");
        Instant createdAt = rs.getTimestamp("created_at").toInstant();
        Instant updatedAt = rs.getTimestamp("updated_at").toInstant();

        return new TargetRole(
                new TargetRoleId(roleId),
                orgId,
                code,
                name,
                domainCode,
                familyCode,
                track,
                assignedExpertId,
                description,
                status,
                version != null ? version : "1.0",
                skillTargets != null ? skillTargets : "[]",
                createdAt,
                updatedAt);
    }
}
