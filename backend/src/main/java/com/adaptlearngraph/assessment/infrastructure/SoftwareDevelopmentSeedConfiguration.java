package com.adaptlearngraph.assessment.infrastructure;

import com.adaptlearngraph.shared.infrastructure.DevelopmentWorkspace;
import com.adaptlearngraph.identity.infrastructure.RegistrationCryptography;
import com.adaptlearngraph.assessment.adaptive.psychometrics.AdaptiveIrtPolicy;
import java.nio.file.*;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import javax.sql.DataSource;
import org.neo4j.driver.Driver;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static com.adaptlearngraph.assessment.infrastructure.SoftwareDevelopmentSeed.*;
import static com.adaptlearngraph.assessment.infrastructure.OfficialQuestionBankManifest.*;

/** Shared insert-only SE inputs; never creates Blueprint, activation, attempt, mastery or approval. */
@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-development & software-development-seed & !prod & !local-baseline-demo")
@ConditionalOnProperty(name="workspace.development-fixtures.enabled",havingValue="true")
public class SoftwareDevelopmentSeedConfiguration {
    @Bean ApplicationRunner softwareDevelopmentSeed(DataSource source,Driver driver,Environment env,ConfigurableApplicationContext context) {
        return args -> {
            if(!DevelopmentWorkspace.enabled(env))throw new IllegalStateException("Development fixture gate required");
            var graph=Files.readAllBytes(Path.of(env.getProperty("pathway.initial.catalog.seed-file","/seed/ontology_seed.json")));
            var catalog=LocalCatalogBootstrap.forExistingDevelopment(driver,graph);
            if(!catalog.hasSoftwareDevelopment())System.out.println("SE bank ready; existing sealed graph retained. Three additional prerequisite edges remain pending approved catalog import.");
            var manifest=bank(graph);
            var jdbc=new JdbcTemplate(source);
            var currentItems=jdbc.queryForList("SELECT item_version_id FROM platform.item_version WHERE question_bank_id=?",UUID.class,id("bank"));
            var expectedItems=manifest.items().stream().map(OfficialQuestionBankManifest.Item::itemVersionId).collect(java.util.stream.Collectors.toSet());
            require(currentItems.isEmpty() || currentItems.size()==360 && expectedItems.equals(new HashSet<>(currentItems)),"SE bank item inventory drift");
            String url;try(var connection=source.getConnection()){url=connection.getMetaData().getURL();}
            new OfficialQuestionBankImporter(source).importManifest(manifest,new OfficialQuestionBankImporter.Owner(
                    DevelopmentWorkspace.id("ld"),DevelopmentWorkspace.ORGANIZATION,url),OfficialQuestionBankImporter.Mode.LOCAL_SEED);
            new TransactionTemplate(new JdbcTransactionManager(source)).executeWithoutResult(tx -> {
                jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended('WORKSPACE_SE',0))",(rs,n)->true);
                provision(jdbc,manifest,env.getRequiredProperty("workspace.development-fixtures.password"));
            });
            context.close();
        };
    }
    private static void provision(JdbcTemplate jdbc,OfficialQuestionBankManifest bank,String password) {
        require(password.length()>=12,"Development password must contain at least twelve characters");
        var org=DevelopmentWorkspace.ORGANIZATION;
        var now=Timestamp.from(Instant.parse("2026-01-01T00:00:00Z"));
        jdbc.update("INSERT INTO platform.department_reference(department_id,organization_id,name,active) VALUES(?,?,'Development Software Engineering',true) ON CONFLICT DO NOTHING",id("department"),org);
        jdbc.update("""
                INSERT INTO platform.occupation_department_reference(occupation_reference_id,occupation_id,organization_id,department_id,name,active)
                VALUES(?,?,?,?,'Software Developers',true) ON CONFLICT DO NOTHING
                """,id("reference"),id("occupation"),org,id("department"));
        require(Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM platform.occupation_department_reference r JOIN platform.department_reference d USING(department_id,organization_id)
                WHERE r.occupation_reference_id=? AND r.occupation_id=? AND r.organization_id=? AND r.department_id=?
                  AND r.name='Software Developers' AND r.active AND d.name='Development Software Engineering' AND d.active)
                """,Boolean.class,id("reference"),id("occupation"),org,id("department"))),"SE department/occupation drift");
        var account=DevelopmentWorkspace.id("employee-se");var membership=DevelopmentWorkspace.id("membership:employee-se");
        var crypto=new RegistrationCryptography("","");
        jdbc.update("""
                INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash)
                VALUES(?,?,'employee-se@workspace.dev.invalid','employee-se@workspace.dev.invalid',?) ON CONFLICT DO NOTHING
                """,account,org,crypto.hashPassword(password));
        var existing=jdbc.queryForMap("SELECT organization_id,identifier,normalized_identifier,password_hash,active FROM platform.account WHERE account_id=?",account);
        require(org.equals(existing.get("organization_id")) && "employee-se@workspace.dev.invalid".equals(existing.get("identifier"))
                && "employee-se@workspace.dev.invalid".equals(existing.get("normalized_identifier"))
                && Boolean.TRUE.equals(existing.get("active")) && crypto.passwordMatches(password,(String)existing.get("password_hash")),"SE account/password drift");
        jdbc.update("INSERT INTO platform.workspace_account_profile(account_id,full_name,email_verified_at) VALUES(?,'Development SE employee',?) ON CONFLICT DO NOTHING",account,now);
        jdbc.update("""
                INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,department_id,occupation_reference_id,created_at,updated_at)
                VALUES(?,?,?,true,?,?,?,?) ON CONFLICT DO NOTHING
                """,membership,account,org,id("department"),id("reference"),now,now);
        jdbc.update("INSERT INTO platform.organization_membership_role(membership_id,role_code) VALUES(?,'EMPLOYEE') ON CONFLICT DO NOTHING",membership);
        require(jdbc.queryForList("""
                SELECT g.role_code FROM platform.organization_membership m JOIN platform.organization_membership_role g USING(membership_id)
                WHERE m.membership_id=? AND m.account_id=? AND m.organization_id=? AND m.active AND m.department_id=? AND m.occupation_reference_id=?
                """,String.class,membership,account,org,id("department"),id("reference")).equals(List.of("EMPLOYEE")),"SE membership drift");
        try {
            var model=canonical(JSON.valueToTree(AdaptiveIrtPolicy.referenceModelV1()));
            var mapping=canonical(JSON.valueToTree(AdaptiveIrtPolicy.referenceMappingV1()));
            jdbc.update("""
                    INSERT INTO platform.model_version(model_version_id,algorithm,version,parameter_hash,configuration,artifact_ref)
                    VALUES(?,'IRT_3PL','WORKSPACE_SE_SYNTHETIC',?,?::jsonb,'development:SE:DECLARED_SYNTHETIC') ON CONFLICT DO NOTHING
                    """,id("model"),technicalHash(),model);
            jdbc.update("""
                    INSERT INTO platform.mastery_mapping_version(mastery_mapping_version_id,mapping_type,configuration,configuration_hash)
                    VALUES(?,'LOGISTIC_CONSERVATIVE_V1',?::jsonb,?) ON CONFLICT DO NOTHING
                    """,id("mapping"),mapping,sha256(mapping.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            require(Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM platform.model_version WHERE model_version_id=? AND algorithm='IRT_3PL'
                    AND version='WORKSPACE_SE_SYNTHETIC' AND parameter_hash=? AND configuration=?::jsonb
                    AND artifact_ref='development:SE:DECLARED_SYNTHETIC' AND approved_by IS NULL AND approved_at IS NULL)
                    """,Boolean.class,id("model"),technicalHash(),model)),"SE model drift");
            require(Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM platform.mastery_mapping_version WHERE mastery_mapping_version_id=?
                    AND mapping_type='LOGISTIC_CONSERVATIVE_V1' AND configuration=?::jsonb AND configuration_hash=?)
                    """,Boolean.class,id("mapping"),mapping,sha256(mapping.getBytes(java.nio.charset.StandardCharsets.UTF_8)))),"SE mapping drift");
            boolean assemble=!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.irt_parameter_set WHERE parameter_set_id=?)",Boolean.class,id("parameters")));
            if(assemble)jdbc.update("""
                    INSERT INTO platform.irt_parameter_set(parameter_set_id,model_version_id,source,status,parameter_hash)
                    VALUES(?,?,'SEEDED','BUILDING',?)
                    """,id("parameters"),id("model"),technicalHash());
            require(Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM platform.irt_parameter_set WHERE parameter_set_id=? AND model_version_id=?
                    AND source='SEEDED' AND parameter_hash=? AND
                      ((status=? AND activated_by IS NULL AND activated_at IS NULL)
                       OR (? AND status='PROMOTED' AND activated_by=? AND activated_at IS NOT NULL)))
                    """,Boolean.class,id("parameters"),id("model"),technicalHash(),assemble ? "BUILDING" : "CANDIDATE",
                    !assemble,DevelopmentWorkspace.id("ld"))),"SE parameter-set drift");
            for(var item:bank.items()) {
                var b=switch(item.difficulty()){case "EASY" -> -1;case "MEDIUM" -> 0;default -> 1;};
                if(assemble)jdbc.update("""
                        INSERT INTO platform.irt_item_parameter(parameter_set_id,item_version_id,micro_skill_id,discrimination_a,difficulty_b,guessing_c,fit_diagnostics)
                        VALUES(?,?,?,1.5,?,0.25,'{"origin":"DECLARED_SYNTHETIC","operationalPromotionEligible":false}'::jsonb) ON CONFLICT DO NOTHING
                        """,id("parameters"),item.itemVersionId(),item.microSkillId(),b);
                require(Boolean.TRUE.equals(jdbc.queryForObject("""
                        SELECT EXISTS(SELECT 1 FROM platform.irt_item_parameter WHERE parameter_set_id=? AND item_version_id=?
                        AND micro_skill_id=? AND discrimination_a=1.5 AND difficulty_b=? AND guessing_c=0.25
                        AND fit_diagnostics='{"origin":"DECLARED_SYNTHETIC","operationalPromotionEligible":false}'::jsonb)
                        """,Boolean.class,id("parameters"),item.itemVersionId(),item.microSkillId(),b)),"SE item-parameter drift");
            }
            if(assemble)jdbc.update("UPDATE platform.irt_parameter_set SET status='CANDIDATE' WHERE parameter_set_id=? AND status='BUILDING'",id("parameters"));
            require(jdbc.queryForObject("SELECT count(*) FROM platform.irt_item_parameter WHERE parameter_set_id=?",Integer.class,id("parameters"))==360,"SE parameter coverage drift");
            // Existing Blueprint persistence requires PROMOTED even for this explicit SEEDED fixture.
            // Keep synthetic provenance/model approval untouched; operational production lookup still denies SEEDED.
            require(Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM platform.account a JOIN platform.organization_membership m USING(account_id)
                    JOIN platform.organization_membership_role g USING(membership_id)
                    WHERE a.account_id=? AND a.organization_id=? AND m.organization_id=? AND a.active AND m.active AND g.role_code='LD_MANAGER')
                    """,Boolean.class,DevelopmentWorkspace.id("ld"),org,org)),"SE technical fixture actor unavailable");
            jdbc.update("""
                    UPDATE platform.irt_parameter_set SET status='PROMOTED',activated_by=?,activated_at=clock_timestamp()
                    WHERE parameter_set_id=? AND status='CANDIDATE' AND source='SEEDED' AND parameter_hash=?
                    """,DevelopmentWorkspace.id("ld"),id("parameters"),technicalHash());
            require(Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM platform.irt_parameter_set WHERE parameter_set_id=? AND model_version_id=?
                    AND source='SEEDED' AND status='PROMOTED' AND parameter_hash=? AND activated_by=? AND activated_at IS NOT NULL)
                    """,Boolean.class,id("parameters"),id("model"),technicalHash(),DevelopmentWorkspace.id("ld"))),"SE fixture promotion incomplete");
        } catch(RuntimeException invalid) { throw invalid; }
        jdbc.update("""
                INSERT INTO platform.workspace_baseline_resource(organization_id,occupation_reference_id,graph_occupation_id,question_bank_id,model_version_id,mastery_mapping_version_id)
                VALUES(?,?,?,?,?,?) ON CONFLICT DO NOTHING
                """,org,id("reference"),OCCUPATION,id("bank"),id("model"),id("mapping"));
        require(Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM platform.workspace_baseline_resource WHERE organization_id=? AND occupation_reference_id=?
                AND graph_occupation_id=? AND question_bank_id=? AND model_version_id=? AND mastery_mapping_version_id=?)
                """,Boolean.class,org,id("reference"),OCCUPATION,id("bank"),id("model"),id("mapping"))),"SE resource binding drift");
    }
}
