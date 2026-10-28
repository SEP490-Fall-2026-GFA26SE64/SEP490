package com.adaptlearngraph.identity.infrastructure;

import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Component
@Profile("platform-bootstrap")
public final class PlatformAdministratorBootstrap implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final String email;
    private final String password;
    public PlatformAdministratorBootstrap(JdbcTemplate jdbc,PlatformTransactionManager manager,
            @Value("${PLATFORM_ADMIN_SEED_EMAIL:}") String email,
            @Value("${PLATFORM_ADMIN_SEED_PASSWORD:}") String password) {
        this.jdbc=jdbc;this.transactions=new TransactionTemplate(manager);this.email=email;this.password=password;
    }
    @Override
    public void run(ApplicationArguments arguments) {
        if(email==null || email.isBlank() || password==null || password.isBlank()) {
            throw new IllegalStateException("Configure PLATFORM_ADMIN_SEED_EMAIL and PLATFORM_ADMIN_SEED_PASSWORD outside source control.");
        }
        String normalized=com.adaptlearngraph.identity.domain.RegistrationFields.normalizeEmail(email);
        if(normalized.length()>254 || !normalized.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) {
            throw new IllegalArgumentException("Platform seed email is invalid.");
        }
        com.adaptlearngraph.identity.domain.RegistrationFields.validatePassword(password);
        var passwords=new RegistrationCryptography("", "");
        transactions.executeWithoutResult(tx->{
            jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?,0))",
                    (org.springframework.jdbc.core.RowCallbackHandler) row -> {}, "platform-seed:"+normalized);
            var existing=jdbc.query("""
                    SELECT a.account_id,a.password_hash,a.active,a.organization_id,
                      EXISTS(SELECT 1 FROM platform.platform_administrator p WHERE p.account_id=a.account_id) AS platform_role,
                      EXISTS(SELECT 1 FROM platform.organization_registration r WHERE r.account_id=a.account_id) AS registration
                    FROM platform.account a WHERE normalized_identifier=? FOR UPDATE OF a
                    """,(rs,i)->new Existing(rs.getObject(1,UUID.class),rs.getString(2),rs.getBoolean(3),
                    rs.getObject(4,UUID.class),rs.getBoolean(5),rs.getBoolean(6)),normalized);
            if(!existing.isEmpty()) {
                var account=existing.getFirst();
                if(!account.active() || account.organization()!=null || !account.platform() || account.registration()
                        || !passwords.passwordMatches(password,account.hash())) {
                    throw new IllegalStateException("Seed identity conflicts with an existing account or credentials. No account was changed.");
                }
                return;
            }
            UUID id=UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO platform.account(account_id,identifier,normalized_identifier,password_hash,active,created_at)
                    VALUES (?,?,?,?,true,now())
                    """,id,normalized,normalized,passwords.hashPassword(password));
            jdbc.update("""
                    INSERT INTO platform.platform_administrator(account_id,granted_at,grant_source) VALUES (?,now(),'OPERATOR')
                    """,id);
            jdbc.update("""
                    INSERT INTO platform.audit_event(audit_event_id,service_name,action,resource_id,occurred_at,outcome,correlation_id)
                    VALUES (?,'OPERATOR_BOOTSTRAP','PLATFORM_ADMINISTRATOR_GRANTED',?,now(),'SUCCEEDED',?)
                    """,UUID.randomUUID(),id,UUID.randomUUID());
        });
    }
    private record Existing(UUID id,String hash,boolean active,UUID organization,boolean platform,boolean registration) {
        @Override public String toString() { return "SeedIdentity[redacted]"; }
    }
}
