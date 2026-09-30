package com.adaptlearngraph.catalog;

import com.adaptlearngraph.catalog.application.port.in.TargetRoleFilter;
import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.RoleTrack;
import com.adaptlearngraph.catalog.domain.TargetRole;
import com.adaptlearngraph.catalog.domain.TargetRoleId;
import com.adaptlearngraph.catalog.infrastructure.PostgresTargetRoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("REQ-023-F01 & REQ-023-F02: PostgresTargetRoleRepository Unit Tests")
class PostgresTargetRoleRepositoryTest {

    private DataSource dataSource;
    private Connection connection;
    private PreparedStatement preparedStatement;
    private ResultSet resultSet;
    private PostgresTargetRoleRepository repository;

    @BeforeEach
    void setUp() throws SQLException {
        dataSource = mock(DataSource.class);
        connection = mock(Connection.class);
        preparedStatement = mock(PreparedStatement.class);
        resultSet = mock(ResultSet.class);

        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenReturn(preparedStatement);
        when(preparedStatement.executeQuery()).thenReturn(resultSet);

        repository = new PostgresTargetRoleRepository(dataSource);
    }

    @Test
    @DisplayName("REQ-023-F01: existsByOrganizationIdAndCode returns true when count > 0")
    void existsByOrganizationIdAndCodeReturnsTrue() throws SQLException {
        when(resultSet.next()).thenReturn(true);
        when(resultSet.getInt(1)).thenReturn(1);

        boolean exists = repository.existsByOrganizationIdAndCode("comp-technova", "ROLE-AI-ARCH");

        assertTrue(exists);
        verify(preparedStatement).setString(1, "comp-technova");
        verify(preparedStatement).setString(2, "ROLE-AI-ARCH");
    }

    @Test
    @DisplayName("REQ-023-F01: existsByOrganizationIdAndCode returns false when count == 0")
    void existsByOrganizationIdAndCodeReturnsFalse() throws SQLException {
        when(resultSet.next()).thenReturn(true);
        when(resultSet.getInt(1)).thenReturn(0);

        boolean exists = repository.existsByOrganizationIdAndCode("comp-technova", "NON_EXISTING");

        assertFalse(exists);
    }

    @Test
    @DisplayName("REQ-023-F02: findByOrganizationId maps ResultSet rows correctly to TargetRole domain objects")
    void findByOrganizationIdMapsRows() throws SQLException {
        UUID roleId = UUID.randomUUID();
        Timestamp now = Timestamp.from(Instant.now());

        when(resultSet.next()).thenReturn(true, false);
        when(resultSet.getObject("role_id")).thenReturn(roleId);
        when(resultSet.getString("organization_id")).thenReturn("comp-technova");
        when(resultSet.getString("code")).thenReturn("ROLE-AI-ARCH");
        when(resultSet.getString("name")).thenReturn("AI Knowledge Architect");
        when(resultSet.getString("domain_code")).thenReturn("AI");
        when(resultSet.getString("family_code")).thenReturn("AI_ML");
        when(resultSet.getString("track")).thenReturn("PROFESSIONAL");
        when(resultSet.getString("assigned_expert_id")).thenReturn("expert-chen");
        when(resultSet.getString("description")).thenReturn("Architect role");
        when(resultSet.getString("status")).thenReturn("ACTIVE");
        when(resultSet.getTimestamp("created_at")).thenReturn(now);
        when(resultSet.getTimestamp("updated_at")).thenReturn(now);

        List<TargetRole> roles = repository.findByOrganizationId("comp-technova", TargetRoleFilter.empty());

        assertEquals(1, roles.size());
        TargetRole role = roles.getFirst();
        assertEquals(roleId, role.getId().value());
        assertEquals("comp-technova", role.getOrganizationId());
        assertEquals("ROLE-AI-ARCH", role.getCode());
        assertEquals(RoleStatus.ACTIVE, role.getStatus());
        assertEquals(RoleTrack.PROFESSIONAL, role.getTrack());
        assertEquals("expert-chen", role.getAssignedExpertId());
    }

    @Test
    @DisplayName("REQ-023-F02: findById returns Optional containing TargetRole when record exists")
    void findByIdReturnsRole() throws SQLException {
        UUID roleId = UUID.randomUUID();
        Timestamp now = Timestamp.from(Instant.now());

        when(resultSet.next()).thenReturn(true);
        when(resultSet.getObject("role_id")).thenReturn(roleId);
        when(resultSet.getString("organization_id")).thenReturn("comp-technova");
        when(resultSet.getString("code")).thenReturn("ROLE-AI-ARCH");
        when(resultSet.getString("name")).thenReturn("AI Knowledge Architect");
        when(resultSet.getString("domain_code")).thenReturn("AI");
        when(resultSet.getString("family_code")).thenReturn("AI_ML");
        when(resultSet.getString("track")).thenReturn("PROFESSIONAL");
        when(resultSet.getString("assigned_expert_id")).thenReturn("expert-chen");
        when(resultSet.getString("description")).thenReturn("Architect role");
        when(resultSet.getString("status")).thenReturn("ACTIVE");
        when(resultSet.getTimestamp("created_at")).thenReturn(now);
        when(resultSet.getTimestamp("updated_at")).thenReturn(now);

        Optional<TargetRole> result = repository.findById("comp-technova", new TargetRoleId(roleId));

        assertTrue(result.isPresent());
        assertEquals(roleId, result.get().getId().value());
    }

    @Test
    @DisplayName("REQ-023-F04: deleteById executes delete SQL statement")
    void deleteByIdExecutesStatement() throws SQLException {
        UUID roleId = UUID.randomUUID();

        repository.deleteById("comp-technova", new TargetRoleId(roleId));

        verify(preparedStatement).setString(1, "comp-technova");
        verify(preparedStatement).setObject(2, roleId);
        verify(preparedStatement).executeUpdate();
    }
}
