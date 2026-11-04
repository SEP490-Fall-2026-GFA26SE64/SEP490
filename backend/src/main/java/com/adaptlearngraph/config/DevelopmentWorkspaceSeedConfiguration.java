package com.adaptlearngraph.config;

import com.adaptlearngraph.utility.RegistrationCryptography;
import com.adaptlearngraph.constants.DevelopmentWorkspace;
import com.adaptlearngraph.repository.DevelopmentSeedRepositories;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.transaction.support.TransactionTemplate;

/** Insert-only development workspace. No learner outcomes, publication, real payment or readiness is seeded. */
@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-development & workspace-seed & !local-baseline-demo & !prod")
@ConditionalOnProperty(name="workspace.development-fixtures.enabled",havingValue="true")
@Import(PersistenceConfiguration.class)
public class DevelopmentWorkspaceSeedConfiguration {
    @Bean ApplicationRunner developmentWorkspaceSeed(BeanFactory beans,ObjectMapper json,Environment environment,
            ConfigurableApplicationContext context,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA)
            org.springframework.transaction.PlatformTransactionManager transactionManager) {
        return args -> {
            if(!DevelopmentWorkspace.enabled(environment)) throw new IllegalStateException("Development fixture gate required");
            var password=environment.getRequiredProperty("workspace.development-fixtures.password");
            if(password.length()<12) throw new IllegalStateException("Development password must contain at least twelve characters");
            var repositories=DevelopmentSeedRepositories.from(beans::getBean);
            var seeds=repositories.identities();var resources=repositories.resources();
            var secrets=new RegistrationCryptography("","");
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                repositories.locks().lock("WORKSPACE_DEVELOPMENT_V1");
                var org=MainDevelopmentBankSeed.ORGANIZATION;
                if(!seeds.organizationExists(org,"TECHNOVA"))
                    throw new IllegalStateException("Import the exact development catalog and bank first");
                var now=Instant.parse("2026-01-01T00:00:00Z");
                UUID provisioner=MainDevelopmentBankSeed.id("provisioner"),registration=MainDevelopmentBankSeed.id("registration");
                seeds.insertAccountIfAbsent(provisioner,org,"development-provisioner.invalid","development-provisioner.invalid","DEVELOPMENT_NO_LOGIN");
                seeds.insertRegistrationIfAbsent(registration,provisioner,"Shared development fixture","workspace-development","Development fixture",now);
                seeds.insertReadyWorkspaceIfAbsent(MainDevelopmentBankSeed.id("workspace"),org,registration,"workspace-development",now);
                UUID department=MainDevelopmentBankSeed.id("department"),reference=MainDevelopmentBankSeed.id("jobPosition-reference");
                seeds.insertDepartmentIfAbsent(department,org,"Development Security");
                seeds.insertJobPositionReferenceIfAbsent(reference,MainDevelopmentBankSeed.id("jobPosition"),org,department,"Information Security Analysts");
                for(var pair:Map.of("ld","LD_MANAGER","employee","EMPLOYEE","expert","DOMAIN_EXPERT").entrySet()) {
                    UUID account=MainDevelopmentBankSeed.id(pair.getKey()),membership=MainDevelopmentBankSeed.id("membership:"+pair.getKey());
                    String email=pair.getKey()+"@workspace.dev.invalid";
                    seeds.insertAccountIfAbsent(account,org,email,email,secrets.hashPassword(password));
                    var stored=seeds.accountState(account);
                    if(stored.size()!=1 || !org.equals(stored.getFirst().organizationId())
                            || !email.equals(stored.getFirst().identifier()) || !Boolean.TRUE.equals(stored.getFirst().active())
                            || !secrets.passwordMatches(password,stored.getFirst().passwordHash()))
                        throw new IllegalStateException("Development account drift; no account or password is overwritten");
                    seeds.insertProfileIfAbsent(account,"Development "+pair.getKey(),now);
                    boolean employee=pair.getKey().equals("employee");
                    if(employee) seeds.insertEmployeeMembershipIfAbsent(membership,account,org,department,reference,now);
                    else seeds.insertStaffMembershipIfAbsent(membership,account,org,now);
                    seeds.insertMembershipRoleIfAbsent(membership,pair.getValue());
                    var roles=seeds.activeMembershipRoles(membership,account,org);
                    if(!roles.equals(List.of(pair.getValue()))) throw new IllegalStateException("Development membership drift");
                }
                resources.seedBankIfAbsent(org,reference,DevelopmentWorkspace.JOB_POSITION,MainDevelopmentBankSeed.securityBank());
            });
            // Reuse the exact validated synthetic artifact, without provisioning persona accounts or learner state.
            new LocalDemoProvisioning(repositories,json,transactionManager,false,MainDevelopmentBankSeed.id("ld"),MainDevelopmentBankSeed.securityProjection()).run(args);
            resources.bindUnsetVersions(MainDevelopmentBankSeed.ORGANIZATION,DevelopmentWorkspace.JOB_POSITION,MainDevelopmentBankSeed.securityBank(),
                    MainDevelopmentBankSeed.securityId("model-v1"),MainDevelopmentBankSeed.securityId("mapping-v1"));
            if(!resources.bound(MainDevelopmentBankSeed.ORGANIZATION,DevelopmentWorkspace.JOB_POSITION,MainDevelopmentBankSeed.securityBank(),
                    MainDevelopmentBankSeed.securityId("model-v1"),MainDevelopmentBankSeed.securityId("mapping-v1")))
                throw new IllegalStateException("Development baseline resource drift");
            context.close();
        };
    }
}