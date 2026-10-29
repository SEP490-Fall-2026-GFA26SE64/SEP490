package com.adaptlearngraph.identity.infrastructure;

import com.adaptlearngraph.identity.application.port.out.RegistrationStore;
import com.adaptlearngraph.identity.application.port.out.WorkspaceIdentityStore;
import com.adaptlearngraph.identity.domain.RegistrationFailure;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashSet;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

public final class JdbcWorkspaceIdentityStore implements WorkspaceIdentityStore {
    private static final String CREDENTIAL = """
            SELECT a.account_id, a.organization_id, a.identifier, a.password_hash, a.active,
                coalesce(p.full_name, r.admin_name) AS full_name,
                coalesce(r.email_verified_at, p.email_verified_at) AS email_verified_at,
                coalesce(r.auth_version, p.auth_version, 0) AS auth_version,
                coalesce(r.recovery_required, p.recovery_required, false) AS recovery_required,
                coalesce(m.active, false) AS membership_active,
                coalesce(w.setup_state = 'READY', false) AS workspace_ready,
                EXISTS (SELECT 1 FROM platform.account_totp t WHERE t.account_id = a.account_id) AS has_totp
            FROM platform.account a
            LEFT JOIN platform.organization_registration r ON r.account_id = a.account_id
            LEFT JOIN platform.workspace_account_profile p ON p.account_id = a.account_id
            LEFT JOIN platform.organization_membership m ON m.account_id = a.account_id AND m.organization_id = a.organization_id
            LEFT JOIN platform.organization_workspace w ON w.organization_id = m.organization_id
            """;
    private final JdbcTemplate jdbc;
    private final RegistrationStore registration;

    public JdbcWorkspaceIdentityStore(JdbcTemplate jdbc, RegistrationStore registration) {
        this.jdbc = jdbc;
        this.registration = registration;
    }

    @Override
    public Optional<Credential> findByEmail(String email) {
        return jdbc.query(CREDENTIAL + " WHERE a.normalized_identifier = ?", this::map, email).stream().findFirst();
    }

    @Override
    public Credential lock(UUID accountId) {
        boolean registered = Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM platform.organization_registration WHERE account_id = ?)",
                Boolean.class, accountId));
        if (registered) registration.lockRegistration(accountId);
        else jdbc.query("SELECT account_id FROM platform.account WHERE account_id = ? FOR UPDATE",
                (row, index) -> row.getObject(1, UUID.class), accountId);
        return jdbc.query(CREDENTIAL + " WHERE a.account_id = ?", this::map, accountId).stream().findFirst()
                .orElseThrow(() -> new RegistrationFailure(RegistrationFailure.Code.UNAUTHENTICATED,
                        "Your account is unavailable. Sign in again."));
    }

    @Override
    public void completeEnrollment(UUID accountId, String encryptedSecret, long step, Instant now) {
        registration.completeEnrollment(accountId, encryptedSecret, step, now);
        jdbc.update("""
                UPDATE platform.workspace_account_profile SET auth_version = auth_version + 1, recovery_required = false
                WHERE account_id = ? AND NOT EXISTS
                    (SELECT 1 FROM platform.organization_registration WHERE account_id = ?)
                """, accountId, accountId);
    }

    @Override
    public long beginRecovery(UUID accountId, Instant now) {
        boolean registered = Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM platform.organization_registration WHERE account_id = ?)",
                Boolean.class, accountId));
        if (registered) return registration.beginRecovery(accountId, now);
        return jdbc.queryForObject("""
                UPDATE platform.workspace_account_profile SET auth_version = auth_version + 1, recovery_required = true
                WHERE account_id = ? RETURNING auth_version
                """, Long.class, accountId);
    }

    private Credential map(ResultSet row, int index) throws SQLException {
        UUID accountId = row.getObject("account_id", UUID.class);
        var roles = new HashSet<>(jdbc.query("""
                SELECT r.role_code FROM platform.organization_membership_role r
                JOIN platform.organization_membership m USING (membership_id) WHERE m.account_id = ?
                UNION ALL SELECT 'PLATFORM_ADMINISTRATOR' FROM platform.platform_administrator WHERE account_id = ?
                """, (role, number) -> role.getString(1), accountId, accountId));
        Timestamp verified = row.getTimestamp("email_verified_at");
        return new Credential(accountId, row.getObject("organization_id", UUID.class), row.getString("identifier"),
                row.getString("full_name"), row.getString("password_hash"), row.getBoolean("active"),
                row.getBoolean("membership_active"), roles, verified == null ? null : verified.toInstant(),
                row.getLong("auth_version"), row.getBoolean("recovery_required"), row.getBoolean("has_totp"),
                row.getBoolean("workspace_ready"));
    }
}
