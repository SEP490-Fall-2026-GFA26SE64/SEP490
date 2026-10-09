package com.adaptlearngraph.learning.infrastructure;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Objects;

/** Deterministic local/demo PostgreSQL fixture required by the F02 vertical flow. */
public final class DevelopmentTargetSelectionSeeder {
    public static final String ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";
    public static final String ACCOUNT_ID = "00000000-0000-0000-0000-000000000001";
    public static final String ROLE_ID = "20000000-0000-0000-0000-000000000001";
    public static final String ROLE_REFERENCE_ID = "22000000-0000-0000-0000-000000000001";
    public static final String ALTERNATE_ROLE_ID = "20000000-0000-0000-0000-000000000002";
    public static final String ALTERNATE_ROLE_REFERENCE_ID = "22000000-0000-0000-0000-000000000003";

    private static final List<String> STATEMENTS = List.of(
            """
                    INSERT INTO platform.organization (
                        organization_id, code, name, status, created_at)
                    VALUES (
                        '00000000-0000-0000-0000-000000000001',
                        'LOCAL_DEMO',
                        'Local Demo Organization',
                        'ACTIVE',
                        '2026-10-01T00:00:00Z')
                    ON CONFLICT (organization_id) DO UPDATE
                    SET code = EXCLUDED.code,
                        name = EXCLUDED.name,
                        status = EXCLUDED.status
                    """,
            """
                    INSERT INTO platform.organizational_unit (
                        unit_id, parent_unit_id, name, organization_id)
                    VALUES (
                        '00000000-0000-0000-0000-000000000011',
                        NULL,
                        'Local Demo Unit',
                        '00000000-0000-0000-0000-000000000001')
                    ON CONFLICT (unit_id) DO UPDATE
                    SET parent_unit_id = EXCLUDED.parent_unit_id,
                        name = EXCLUDED.name,
                        organization_id = EXCLUDED.organization_id
                    """,
            """
                    INSERT INTO platform.account (
                        account_id, unit_id, identifier, normalized_identifier,
                        password_hash, active, created_at, organization_id)
                    VALUES (
                        '00000000-0000-0000-0000-000000000001',
                        '00000000-0000-0000-0000-000000000011',
                        'local.employee@adapt.invalid',
                        'local.employee@adapt.invalid',
                        'LOCAL_DEMO_NO_LOGIN',
                        true,
                        '2026-10-01T00:00:00Z',
                        '00000000-0000-0000-0000-000000000001')
                    ON CONFLICT (account_id) DO UPDATE
                    SET unit_id = EXCLUDED.unit_id,
                        identifier = EXCLUDED.identifier,
                        normalized_identifier = EXCLUDED.normalized_identifier,
                        password_hash = EXCLUDED.password_hash,
                        active = EXCLUDED.active,
                        organization_id = EXCLUDED.organization_id
                    """,
            """
                    INSERT INTO platform.account_role (account_id, role_code)
                    VALUES ('00000000-0000-0000-0000-000000000001', 'EMPLOYEE')
                    ON CONFLICT (account_id, role_code) DO NOTHING
                    """,
            """
                    INSERT INTO platform.learner_state (learner_id)
                    VALUES ('00000000-0000-0000-0000-000000000001')
                    ON CONFLICT (learner_id) DO NOTHING
                    """,
            """
                    INSERT INTO platform.catalog_release (
                        release_id, source_revision, manifest_hash, source_event_id, confirmed_at)
                    VALUES (
                        '21000000-0000-0000-0000-000000000001',
                        490001,
                        '70ef48b666f923de473ffe5552214c3a695beb7c98aa2e83b9691a77ac2ebd99',
                        '21000000-0000-0000-0000-000000000002',
                        '2026-10-01T00:00:00Z')
                    ON CONFLICT (release_id) DO NOTHING
                    """,
            """
                    INSERT INTO platform.catalog_reference (
                        catalog_ref_id, entity_id, version_id, release_id,
                        kind, source_hash, confirmed_at)
                    VALUES (
                        '22000000-0000-0000-0000-000000000001',
                        '20000000-0000-0000-0000-000000000001',
                        '22000000-0000-0000-0000-000000000002',
                        '21000000-0000-0000-0000-000000000001',
                        'TARGET_ROLE',
                        '3a2a8d7b34468a4661eec9163c28ca13185426015bdb43771147f4214e399db6',
                        '2026-10-01T00:00:00Z')
                    ON CONFLICT (catalog_ref_id) DO NOTHING
                    """,
            """
                    INSERT INTO platform.catalog_reference (
                        catalog_ref_id, entity_id, version_id, release_id,
                        kind, source_hash, confirmed_at)
                    VALUES (
                        '22000000-0000-0000-0000-000000000003',
                        '20000000-0000-0000-0000-000000000002',
                        '22000000-0000-0000-0000-000000000004',
                        '21000000-0000-0000-0000-000000000001',
                        'TARGET_ROLE',
                        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
                        '2026-10-01T00:00:00Z')
                    ON CONFLICT (catalog_ref_id) DO NOTHING
                    """,
            """
                    UPDATE platform.catalog_guard
                    SET state = 'OPEN',
                        intent_id = NULL,
                        release_id = '21000000-0000-0000-0000-000000000001',
                        source_revision = 490001,
                        availability_revision = 1,
                        manifest_hash = '70ef48b666f923de473ffe5552214c3a695beb7c98aa2e83b9691a77ac2ebd99',
                        updated_at = '2026-10-01T00:00:00Z'
                    WHERE guard_id = 1
                    """);

    private final Connection connection;

    public DevelopmentTargetSelectionSeeder(Connection connection) {
        this.connection = Objects.requireNonNull(connection, "connection must not be null");
    }

    public void seed() throws SQLException {
        try (var statement = connection.createStatement()) {
            for (String sql : STATEMENTS) {
                statement.executeUpdate(sql);
            }
        }
    }
}
