package com.adaptlearngraph.subscription.infrastructure;

import com.adaptlearngraph.identity.application.port.out.RegistrationSecrets;
import com.adaptlearngraph.subscription.application.port.out.PaymentGateway;
import com.adaptlearngraph.subscription.application.port.out.PaymentOrderStore;
import com.adaptlearngraph.subscription.application.port.out.PaymentProcessingStore;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionIdentity;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Actor;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.neo4j.driver.Driver;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.*;

/** Opt-in test runtime only: real hashed passwords, memberships, sessions, entitlement and catalog fixtures. */
@RestController
@TestComponent
public final class ModuleWorkspaceTestFixtures {
    private final JdbcTemplate jdbc;
    private final RegistrationSecrets secrets;
    private final TransactionTemplate tx;
    private final Driver graph;
    private final PaymentOrderStore orders;
    private final PaymentProcessingStore payments;
    public ModuleWorkspaceTestFixtures(JdbcTemplate jdbc, RegistrationSecrets secrets, PlatformTransactionManager manager,
            Driver graph, PaymentOrderStore orders, PaymentProcessingStore payments) {
        this.jdbc = jdbc; this.secrets = secrets; this.tx = new TransactionTemplate(manager); this.graph = graph; this.orders = orders; this.payments = payments;
    }
    @PostMapping("/api/v1/__subscription-test/module-workspace")
    public Map<String, Object> create() {
        UUID org = UUID.randomUUID(), owner = UUID.randomUUID(), registration = UUID.randomUUID();
        UUID expert = UUID.randomUUID(), reviewer = UUID.randomUUID();
        String password = UUID.randomUUID().toString();
        String occupation = "occ-merge-" + org, skill = "skill-merge-" + org, module = "MOD-MERGE-" + org;
        tx.executeWithoutResult(status -> {
            jdbc.update("INSERT INTO platform.organization(organization_id,code,name) VALUES (?,?,?)", org, "MERGE_" + org.toString().replace("-", "").toUpperCase(java.util.Locale.ROOT), "Merge verification workspace");
            member(owner, org, "ORGANIZATION_ADMINISTRATOR", password);
            member(expert, org, "DOMAIN_EXPERT", password);
            member(reviewer, org, "LD_MANAGER", password);
            jdbc.update("""
                    INSERT INTO platform.organization_registration(registration_id,account_id,organization_name,workspace_slug,admin_name,state,
                        email_verified_at,completed_at,created_at,updated_at)
                    VALUES (?,?,?,?,'Test owner','REGISTERED',now(),now(),now(),now())
                    """, registration, owner, "Merge verification workspace", "merge-" + org);
            jdbc.update("""
                    INSERT INTO platform.organization_workspace(workspace_id,organization_id,registration_id,slug,setup_state,created_at,ready_at)
                    VALUES (?,?,?,?,'READY',now(),now())
                    """, UUID.randomUUID(), org, registration, "merge-" + org);
            jdbc.update("INSERT INTO platform.subscription(subscription_id,organization_id,created_at) VALUES (?,?,now())", UUID.randomUUID(), org);
        });
        var context = new SubscriptionIdentity.Context(new Actor(owner, null, true, false, Set.of(), true), registration);
        var terms = jdbc.queryForMap("SELECT plan_id,current_version_id FROM platform.subscription_plan WHERE code='starter'");
        var now = Instant.now();
        var order = orders.create(context, new PaymentOrderStore.Command(null, (UUID) terms.get("plan_id"),
                (UUID) terms.get("current_version_id"), UUID.randomUUID(), null), now);
        payments.record(new PaymentGateway.Observation(order.providerOrderCode(), "merge-test-" + order.providerOrderCode(),
                order.terms().priceVnd(), null, "VND", "PAID", "merge-reference-" + order.providerOrderCode(), null,
                now, "WEBHOOK", "a".repeat(64)), now);
        payments.apply(order.orderId(), now);
        try (var session = graph.session()) {
            session.run("""
                    CREATE (:Occupation {id:$occupation,name:'Merge verification occupation',status:'ACTIVE',version:'0.11.0',reviewStatus:'NEEDS_EXPERT_REVIEW'})
                    CREATE (s:MicroSkill {id:$skill,name:'Merge verification skill',status:'ACTIVE',version:'0.11.0',reviewStatus:'NEEDS_EXPERT_REVIEW'})
                    CREATE (m:LearningModule {id:$module,title:'Imported merge verification module',moduleType:'LESSON_AND_PRACTICE',
                        contentUri:'content/modules/MOD-FOCUS-SEC01-HIGH.md',contentType:'text/markdown',contentVersion:'1.0',duration:60,price:100000,
                        status:'ACTIVE',version:'0.11.0',reviewStatus:'NEEDS_EXPERT_REVIEW'})
                    CREATE (m)-[:TEACHES {id:$edge,status:'ACTIVE',version:'0.11.0',reviewStatus:'NEEDS_EXPERT_REVIEW',teachingFocus:'PRIMARY',difficultyLevel:'HIGH'}]->(s)
                    """, Map.of("occupation", occupation, "skill", skill, "module", module, "edge", "edge-" + module)).consume();
        }
        return Map.of("organizationId", org, "occupationId", occupation, "skillId", skill, "moduleId", module,
                "expert", Map.of("accountId", expert, "email", expert + "@example.test", "password", password),
                "manager", Map.of("accountId", reviewer, "email", reviewer + "@example.test", "password", password));
    }
    private void member(UUID account, UUID org, String role, String password) {
        UUID membership = UUID.randomUUID();
        jdbc.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,?,?,?)",
                account, org, account + "@example.test", account + "@example.test", secrets.hashPassword(password));
        jdbc.update("INSERT INTO platform.workspace_account_profile(account_id,full_name,email_verified_at) VALUES (?,?,now())", account, "Merge " + role);
        jdbc.update("INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,created_at,updated_at) VALUES (?,?,?,true,now(),now())", membership, account, org);
        jdbc.update("INSERT INTO platform.organization_membership_role VALUES (?,?)", membership, role);
    }
}
