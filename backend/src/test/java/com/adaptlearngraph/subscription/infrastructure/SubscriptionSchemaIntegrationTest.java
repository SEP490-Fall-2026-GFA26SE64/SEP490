package com.adaptlearngraph.subscription.infrastructure;

import static org.junit.jupiter.api.Assertions.*;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.Duration;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;

class SubscriptionSchemaIntegrationTest {
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.6-alpine");

    @BeforeAll
    static void migrate() {
        POSTGRES.start();
        var flyway = Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration").load();
        flyway.migrate();
        assertEquals(0, flyway.migrate().migrationsExecuted);
        flyway.validate();
    }

    @AfterAll
    static void stop() { POSTGRES.stop(); }

    private Connection connection() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }

    @Test
    void seedsExactlyTheApprovedCommercialFieldsWithTruthfulSystemProvenance() throws Exception {
        try (var connection = connection(); var statement = connection.createStatement();
             var rows = statement.executeQuery("""
                     SELECT v.* FROM platform.subscription_plan p
                     JOIN platform.subscription_plan_version v ON v.version_id = p.current_version_id
                     ORDER BY v.employee_seats
                     """)) {
            String[] names = {"Starter", "Growth", "Enterprise"};
            int[] seats = {20, 50, 200};
            long[] prices = {4_900_000, 12_250_000, 24_500_000};
            for (int i = 0; i < names.length; i++) {
                assertTrue(rows.next());
                assertEquals(names[i], rows.getString("name"));
                assertEquals("Organization workspace subscription for up to " + seats[i] + " Employee seats.",
                        rows.getString("description"));
                assertEquals(prices[i], rows.getLong("price_vnd"));
                assertEquals("VND", rows.getString("currency"));
                assertEquals(1, rows.getInt("duration_months"));
                assertEquals(seats[i], rows.getInt("employee_seats"));
                assertEquals(1, rows.getLong("revision"));
                assertNotNull(rows.getTimestamp("created_at"));
                assertNull(rows.getObject("created_by"));
                assertEquals("SYSTEM", rows.getString("creation_source"));
            }
            assertFalse(rows.next());
        }
    }

    @Test
    void protectsVersionsAndOrderSnapshotsAndDoesNotInventProviderFacts() throws Exception {
        UUID account = UUID.randomUUID();
        UUID registration = UUID.randomUUID();
        UUID intent = UUID.randomUUID();
        UUID order = UUID.randomUUID();
        try (var connection = connection(); var statement = connection.createStatement()) {
            statement.execute("INSERT INTO platform.account(account_id, identifier, normalized_identifier, password_hash) "
                    + "VALUES ('" + account + "', 'schema-" + account + "@example.test', 'schema-" + account
                    + "@example.test', 'test-only-unusable')");
            statement.execute("INSERT INTO platform.organization_registration(registration_id, account_id, "
                    + "organization_name, workspace_slug, admin_name, created_at, updated_at) VALUES ('" + registration
                    + "', '" + account + "', 'Schema Organization', 'schema-" + registration
                    + "', 'Schema Administrator', now(), now())");
            statement.execute("INSERT INTO platform.subscription_intent(intent_id, kind, registration_id, "
                    + "owner_account_id, created_at, updated_at) VALUES ('" + intent + "', 'PURCHASE', '" + registration
                    + "', '" + account + "', now(), now())");
            try (var insert = connection.prepareStatement("""
                    INSERT INTO platform.payment_order(order_id, intent_id, created_by, attempt, plan_id, plan_version_id,
                        name, description, price_vnd, currency, duration_months, employee_seats,
                        idempotency_key, request_digest, created_at, expires_at)
                    SELECT ?, ?, ?, 1, plan_id, version_id, name, description, price_vnd, currency, duration_months,
                        employee_seats, ?, repeat('a', 64), now(), now() + interval '30 minutes'
                    FROM platform.subscription_plan_version WHERE name = 'Starter' AND revision = 1
                    """)) {
                insert.setObject(1, order);
                insert.setObject(2, intent);
                insert.setObject(3, account);
                insert.setObject(4, UUID.randomUUID());
                assertEquals(1, insert.executeUpdate());
            }
            try (var row = statement.executeQuery("SELECT * FROM platform.payment_order WHERE order_id = '" + order + "'")) {
                assertTrue(row.next());
                assertEquals("Starter", row.getString("name"));
                assertEquals(4_900_000L, row.getLong("price_vnd"));
                assertEquals("VND", row.getString("currency"));
                assertEquals(1, row.getInt("duration_months"));
                assertEquals(20, row.getInt("employee_seats"));
                assertEquals(1800, Duration.between(row.getTimestamp("created_at").toInstant(),
                        row.getTimestamp("expires_at").toInstant()).getSeconds());
                assertNull(row.getObject("observed_paid_amount"));
                assertNull(row.getString("payment_link_id"));
                assertNull(row.getString("checkout_url"));
                assertNull(row.getTimestamp("paid_at"));
                assertNull(row.getTimestamp("last_checked_at"));
                assertEquals("CREATING", row.getString("payment_status"));
            }
            assertEquals("23514", assertThrows(SQLException.class, () -> statement.execute(
                    "UPDATE platform.subscription_plan_version SET price_vnd = 1 WHERE name = 'Starter'")).getSQLState());
            assertEquals("23514", assertThrows(SQLException.class, () -> statement.execute(
                    "UPDATE platform.payment_order SET employee_seats = 200 WHERE order_id = '" + order + "'")).getSQLState());
            assertEquals("23514", assertThrows(SQLException.class, () -> statement.execute(
                    "UPDATE platform.payment_order SET payment_status = 'UNPAID_TERMINAL' WHERE order_id = '" + order + "'")).getSQLState());
            assertEquals("23514", assertThrows(SQLException.class, () -> statement.execute(
                    "UPDATE platform.payment_order SET payment_status = 'PAID', paid_at = now() WHERE order_id = '" + order + "'")).getSQLState());
            assertEquals("23514", assertThrows(SQLException.class, () -> statement.execute(
                    "DELETE FROM platform.payment_order WHERE order_id = '" + order + "'")).getSQLState());
        }
    }

    @Test
    void enforcesMembershipOrganizationAndMandatoryEmployeeReferences() throws Exception {
        UUID orgA = UUID.randomUUID();
        UUID orgB = UUID.randomUUID();
        UUID account = UUID.randomUUID();
        UUID membership = UUID.randomUUID();
        try (var connection = connection(); var statement = connection.createStatement()) {
            statement.execute("INSERT INTO platform.organization(organization_id, code, name) VALUES ('" + orgA
                    + "', 'A_" + orgA.toString().toUpperCase() + "', 'Organization A'), ('" + orgB + "', 'B_"
                    + orgB.toString().toUpperCase() + "', 'Organization B')");
            statement.execute("INSERT INTO platform.account(account_id, organization_id, identifier, normalized_identifier, "
                    + "password_hash) VALUES ('" + account + "', '" + orgA + "', '" + account
                    + "@example.test', '" + account + "@example.test', 'test-only-unusable')");
            assertEquals("23503", assertThrows(SQLException.class, () -> statement.execute(
                    "INSERT INTO platform.organization_membership(membership_id, account_id, organization_id, active, "
                    + "created_at, updated_at) VALUES ('" + membership + "', '" + account + "', '" + orgB
                    + "', true, now(), now())")).getSQLState());
            connection.setAutoCommit(false);
            statement.execute("INSERT INTO platform.organization_membership(membership_id, account_id, organization_id, "
                    + "active, created_at, updated_at) VALUES ('" + membership + "', '" + account + "', '" + orgA
                    + "', true, now(), now())");
            statement.execute("INSERT INTO platform.organization_membership_role VALUES ('" + membership + "', 'ORGANIZATION_ADMINISTRATOR')");
            connection.commit();
            connection.setAutoCommit(true);
            assertEquals("23514", assertThrows(SQLException.class, () -> statement.execute(
                    "UPDATE platform.organization_membership_role SET role_code='EMPLOYEE' WHERE membership_id='" + membership + "'")).getSQLState());
            try (var row = statement.executeQuery("SELECT department_id, occupation_reference_id FROM "
                    + "platform.organization_membership WHERE membership_id = '" + membership + "'")) {
                assertTrue(row.next());
                assertNull(row.getObject(1));
                assertNull(row.getObject(2));
            }
        }
    }
}
