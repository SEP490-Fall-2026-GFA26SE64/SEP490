package com.adaptlearngraph.assessment.infrastructure;

import com.adaptlearngraph.assessment.adaptive.demo.LocalDemoIdentity;
import com.adaptlearngraph.assessment.adaptive.demo.LocalDemoProvisioning;
import com.adaptlearngraph.identity.infrastructure.RegistrationCryptography;
import com.adaptlearngraph.shared.infrastructure.DevelopmentWorkspace;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import javax.sql.DataSource;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Insert-only development workspace. No learner outcomes, publication, real payment or readiness is seeded. */
@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-development & workspace-seed & !local-baseline-demo & !prod")
@ConditionalOnProperty(name="workspace.development-fixtures.enabled",havingValue="true")
public class DevelopmentWorkspaceSeedConfiguration {
    @Bean ApplicationRunner developmentWorkspaceSeed(DataSource source,ObjectMapper json,Environment environment,
            ConfigurableApplicationContext context) {
        return args -> {
            if(!DevelopmentWorkspace.enabled(environment)) throw new IllegalStateException("Development fixture gate required");
            var password=environment.getRequiredProperty("workspace.development-fixtures.password");
            if(password.length()<12) throw new IllegalStateException("Development password must contain at least twelve characters");
            var jdbc=new JdbcTemplate(source);
            var secrets=new RegistrationCryptography("","");
            new TransactionTemplate(new JdbcTransactionManager(source)).executeWithoutResult(status -> {
                jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended('WORKSPACE_DEVELOPMENT_V1',0))",(rs,n)->true);
                var org=DevelopmentWorkspace.ORGANIZATION;
                if(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.organization WHERE organization_id=? AND code='LOCAL-DEMO')",Boolean.class,org)))
                    throw new IllegalStateException("Import the exact development catalog and bank first");
                var now=Timestamp.from(Instant.parse("2026-01-01T00:00:00Z"));
                UUID provisioner=DevelopmentWorkspace.id("provisioner"),registration=DevelopmentWorkspace.id("registration");
                jdbc.update("""
                        INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash)
                        VALUES(?,?,'development-provisioner.invalid','development-provisioner.invalid','DEVELOPMENT_NO_LOGIN')
                        ON CONFLICT(account_id) DO NOTHING
                        """,provisioner,org);
                jdbc.update("""
                        INSERT INTO platform.organization_registration(registration_id,account_id,organization_name,workspace_slug,
                          admin_name,state,email_verified_at,completed_at,created_at,updated_at)
                        VALUES(?,?,'Shared development fixture','workspace-development','Development fixture','REGISTERED',?,?,?,?)
                        ON CONFLICT(registration_id) DO NOTHING
                        """,registration,provisioner,now,now,now,now);
                jdbc.update("""
                        INSERT INTO platform.organization_workspace(workspace_id,organization_id,registration_id,slug,setup_state,created_at,ready_at)
                        VALUES(?,?,?,'workspace-development','READY',?,?) ON CONFLICT(organization_id) DO NOTHING
                        """,DevelopmentWorkspace.id("workspace"),org,registration,now,now);
                UUID department=DevelopmentWorkspace.id("department"),reference=DevelopmentWorkspace.id("occupation-reference");
                jdbc.update("INSERT INTO platform.department_reference(department_id,organization_id,name,active) VALUES(?,?,'Development Security',true) ON CONFLICT(department_id) DO NOTHING",department,org);
                jdbc.update("""
                        INSERT INTO platform.occupation_department_reference(occupation_reference_id,occupation_id,organization_id,department_id,name,active)
                        VALUES(?,?,?,?,'Information Security Analysts',true) ON CONFLICT(occupation_reference_id) DO NOTHING
                        """,reference,DevelopmentWorkspace.id("occupation"),org,department);
                for(var pair:Map.of("ld","LD_MANAGER","employee","EMPLOYEE","expert","DOMAIN_EXPERT").entrySet()) {
                    UUID account=DevelopmentWorkspace.id(pair.getKey()),membership=DevelopmentWorkspace.id("membership:"+pair.getKey());
                    String email=pair.getKey()+"@workspace.dev.invalid";
                    jdbc.update("""
                            INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash)
                            VALUES(?,?,?,?,?) ON CONFLICT(account_id) DO NOTHING
                            """,account,org,email,email,secrets.hashPassword(password));
                    var stored=jdbc.queryForList("SELECT organization_id,identifier,password_hash,active FROM platform.account WHERE account_id=?",account);
                    if(stored.size()!=1 || !org.equals(stored.getFirst().get("organization_id"))
                            || !email.equals(stored.getFirst().get("identifier")) || !Boolean.TRUE.equals(stored.getFirst().get("active"))
                            || !secrets.passwordMatches(password,(String)stored.getFirst().get("password_hash")))
                        throw new IllegalStateException("Development account drift; no account or password is overwritten");
                    jdbc.update("""
                            INSERT INTO platform.workspace_account_profile(account_id,full_name,email_verified_at)
                            VALUES(?,?,?) ON CONFLICT(account_id) DO NOTHING
                            """,account,"Development "+pair.getKey(),now);
                    boolean employee=pair.getKey().equals("employee");
                    jdbc.update("""
                            INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,department_id,occupation_reference_id,created_at,updated_at)
                            VALUES(?,?,?,true,?,?,?,?) ON CONFLICT(account_id) DO NOTHING
                            """,membership,account,org,employee?department:null,employee?reference:null,now,now);
                    jdbc.update("INSERT INTO platform.organization_membership_role(membership_id,role_code) VALUES(?,?) ON CONFLICT DO NOTHING",membership,pair.getValue());
                    var roles=jdbc.queryForList("""
                            SELECT r.role_code FROM platform.organization_membership m JOIN platform.organization_membership_role r USING(membership_id)
                            WHERE m.membership_id=? AND m.account_id=? AND m.organization_id=? AND m.active
                            """,String.class,membership,account,org);
                    if(!roles.equals(List.of(pair.getValue()))) throw new IllegalStateException("Development membership drift");
                }
                jdbc.update("""
                        INSERT INTO platform.workspace_baseline_resource(organization_id,occupation_reference_id,graph_occupation_id,question_bank_id,model_version_id,mastery_mapping_version_id)
                        VALUES(?,?,?,?,?,?) ON CONFLICT DO NOTHING
                        """,org,reference,DevelopmentWorkspace.OCCUPATION,LocalDemoIdentity.BANK,null,null);
            });
            // Reuse the exact validated synthetic artifact, without provisioning persona accounts or learner state.
            new LocalDemoProvisioning(source,json,false,DevelopmentWorkspace.id("ld")).run(args);
            jdbc.update("""
                    UPDATE platform.workspace_baseline_resource SET model_version_id=?,mastery_mapping_version_id=?
                    WHERE organization_id=? AND graph_occupation_id=? AND question_bank_id=?
                      AND model_version_id IS NULL AND mastery_mapping_version_id IS NULL
                    """,LocalDemoIdentity.id("model-v1"),LocalDemoIdentity.id("mapping-v1"),DevelopmentWorkspace.ORGANIZATION,
                    DevelopmentWorkspace.OCCUPATION,LocalDemoIdentity.BANK);
            if(!Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM platform.workspace_baseline_resource WHERE organization_id=? AND graph_occupation_id=?
                      AND question_bank_id=? AND model_version_id=? AND mastery_mapping_version_id=?)
                    """,Boolean.class,DevelopmentWorkspace.ORGANIZATION,DevelopmentWorkspace.OCCUPATION,LocalDemoIdentity.BANK,
                    LocalDemoIdentity.id("model-v1"),LocalDemoIdentity.id("mapping-v1"))))
                throw new IllegalStateException("Development baseline resource drift");
            context.close();
        };
    }
}
