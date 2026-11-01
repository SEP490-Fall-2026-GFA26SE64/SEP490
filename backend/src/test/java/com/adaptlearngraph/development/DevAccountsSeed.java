package com.adaptlearngraph.development;

import com.adaptlearngraph.identity.infrastructure.PlatformAdministratorBootstrap;
import com.adaptlearngraph.identity.infrastructure.RegistrationCryptography;
import com.adaptlearngraph.subscription.application.port.out.PaymentGateway;
import com.adaptlearngraph.subscription.application.port.out.PaymentOrderStore;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionIdentity;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Actor;
import com.adaptlearngraph.subscription.infrastructure.JdbcPaymentOrderStore;
import com.adaptlearngraph.subscription.infrastructure.JdbcPaymentProcessingStore;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Explicit local fixture command, never component-scanned or included in the application JAR. */
public final class DevAccountsSeed {
    private static final List<String> ROLES = List.of("PLATFORM_ADMINISTRATOR", "ORGANIZATION_ADMINISTRATOR", "LD_MANAGER", "DOMAIN_EXPERT", "EMPLOYEE");
    private static final List<String> EMAILS = List.of("platform.admin@example.test", "org.admin@example.test", "ld.manager@example.test", "expert@example.test", "employee@example.test");
    private static UUID id(String value) { return UUID.nameUUIDFromBytes(("sep490-dev-accounts:" + value).getBytes(StandardCharsets.UTF_8)); }
    private static String env(String key) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) throw new IllegalStateException("Missing private setting: " + key);
        return value;
    }
    public static void main(String[] args) {
        String url = env("DEV_ACCOUNTS_DB_URL");
        if (!"true".equals(env("DEV_ACCOUNTS_SEED_ALLOWED")) || !url.matches("jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/adapt_learn_graph_dev_accounts")) {
            throw new IllegalStateException("Seed accepts only the dedicated loopback dev-accounts database.");
        }
        var source = new DriverManagerDataSource(url, env("DEV_ACCOUNTS_DB_USER"), env("DEV_ACCOUNTS_DB_PASSWORD"));
        var jdbc = new JdbcTemplate(source);
        var manager = new DataSourceTransactionManager(source);
        var tx = new TransactionTemplate(manager);
        var secrets = new RegistrationCryptography("", "");
        UUID organization = id("organization"), registration = id("registration"), owner = id(EMAILS.get(1));
        tx.executeWithoutResult(status -> {
            jdbc.queryForList("SELECT pg_advisory_xact_lock(hashtextextended('dev-accounts-seed',0))");
            Integer count = jdbc.queryForObject("SELECT count(*) FROM platform.account WHERE normalized_identifier IN (?,?,?,?,?)", Integer.class, EMAILS.toArray());
            if (count != null && count > 0) {
                if (count != 5) throw new IllegalStateException("Partial/conflicting seed exists; no credentials overwritten.");
                for (int i = 0; i < EMAILS.size(); i++) {
                    var account = jdbc.queryForMap("SELECT account_id,password_hash,active FROM platform.account WHERE normalized_identifier=?", EMAILS.get(i));
                    UUID expected = i == 0 ? (UUID) account.get("account_id") : id(EMAILS.get(i));
                    if (!expected.equals(account.get("account_id")) || !Boolean.TRUE.equals(account.get("active")) || !secrets.passwordMatches(env("DEV_ACCOUNT_PASSWORD_" + i), (String) account.get("password_hash"))) {
                        throw new IllegalStateException("Existing seed credentials conflict; no account changed.");
                    }
                    Boolean role = i == 0 ? jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.platform_administrator WHERE account_id=?)", Boolean.class, expected)
                        : jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.organization_membership m JOIN platform.organization_membership_role r USING(membership_id) WHERE m.account_id=? AND m.organization_id=? AND m.active AND r.role_code=?)", Boolean.class, expected, organization, ROLES.get(i));
                    if (!Boolean.TRUE.equals(role)) throw new IllegalStateException("Existing account role differs; no account changed.");
                }
                return;
            }
            new PlatformAdministratorBootstrap(jdbc, manager, EMAILS.getFirst(), env("DEV_ACCOUNT_PASSWORD_0")).run(null);
            jdbc.update("INSERT INTO platform.organization(organization_id,code,name) VALUES (?,'SEP490_DEV_ACCOUNTS','SEP490 Development Workspace')", organization);
            jdbc.update("INSERT INTO platform.department_reference VALUES (?,?,'Development',true)", id("department"), organization);
            jdbc.update("INSERT INTO platform.occupation_department_reference VALUES (?,?,?,?,'Development occupation fixture',true)", id("occupation-reference"), id("occupation"), organization, id("department"));
            for (int i = 1; i < EMAILS.size(); i++) {
                UUID account = id(EMAILS.get(i)), member = id("member:" + EMAILS.get(i));
                jdbc.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,?,?,?)", account, organization, EMAILS.get(i), EMAILS.get(i), secrets.hashPassword(env("DEV_ACCOUNT_PASSWORD_" + i)));
                // Synthetic local seed verification, not evidence of email delivery or MFA enrollment.
                jdbc.update("INSERT INTO platform.workspace_account_profile(account_id,full_name,email_verified_at) VALUES (?,?,now())", account, "Dev " + ROLES.get(i));
                jdbc.update("INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,created_at,updated_at) VALUES (?,?,?,true,now(),now())", member, account, organization);
                jdbc.update("INSERT INTO platform.organization_membership_role VALUES (?,?)", member, ROLES.get(i));
                if (i == 4) jdbc.update("UPDATE platform.organization_membership SET department_id=?,occupation_reference_id=? WHERE membership_id=?", id("department"), id("occupation-reference"), member);
                if (i == 4) jdbc.update("INSERT INTO platform.learner_state(learner_id) VALUES (?)", account);
            }
            jdbc.update("""
                    INSERT INTO platform.organization_registration(registration_id,account_id,organization_name,workspace_slug,admin_name,state,email_verified_at,completed_at,created_at,updated_at)
                    VALUES (?,?,'SEP490 Development Workspace','sep490-dev-accounts','Dev Organization Administrator','REGISTERED',now(),now(),now(),now())
                    """, registration, owner);
            jdbc.update("INSERT INTO platform.organization_workspace(workspace_id,organization_id,registration_id,slug,setup_state,created_at,ready_at) VALUES (?,?,?,'sep490-dev-accounts','READY',now(),now())", id("workspace"), organization, registration);
            jdbc.update("INSERT INTO platform.subscription(subscription_id,organization_id,created_at) VALUES (?,?,now())", id("subscription"), organization);
            var orders = new JdbcPaymentOrderStore(jdbc, tx);
            var payments = new JdbcPaymentProcessingStore(jdbc, tx, orders);
            var plan = jdbc.queryForMap("SELECT plan_id,current_version_id FROM platform.subscription_plan WHERE code='starter'");
            var now = Instant.now();
            var order = orders.create(new SubscriptionIdentity.Context(new Actor(owner, null, true, false, Set.of(), true), registration),
                    new PaymentOrderStore.Command(null, (UUID) plan.get("plan_id"), (UUID) plan.get("current_version_id"), id("local-purchase"), null), now);
            payments.record(new PaymentGateway.Observation(order.providerOrderCode(), "DEV-SEED-" + order.providerOrderCode(), order.terms().priceVnd(), null, "VND", "PAID", "DEV-SEED-NOT-A-REAL-PAYMENT", null, now, "WEBHOOK", "a".repeat(64)), now);
            payments.apply(order.orderId(), now);
            jdbc.update("INSERT INTO platform.audit_event(audit_event_id,service_name,action,resource_id,occurred_at,outcome,correlation_id) VALUES (?,'LOCAL_DEV_SEED','DEV_ACCOUNTS_CREATED',?,now(),'SUCCEEDED',?)", UUID.randomUUID(), organization, UUID.randomUUID());
        });
        System.out.println("Five local development accounts verified. No passwords printed. Organization Administrator still requires real MFA enrollment.");
    }
}
