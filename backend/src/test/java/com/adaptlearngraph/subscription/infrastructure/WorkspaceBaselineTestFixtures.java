package com.adaptlearngraph.subscription.infrastructure;

import com.adaptlearngraph.assessment.adaptive.AdaptiveFixture;
import com.adaptlearngraph.identity.application.port.out.RegistrationSecrets;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.neo4j.driver.Driver;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.*;

/** Synthetic fixtures packaged only in the isolated test image. No live catalog or calibration claims. */
@RestController
@TestComponent
public final class WorkspaceBaselineTestFixtures {
    private static final String PASSWORD = "isolated-baseline-test-password";
    private final JdbcTemplate jdbc;
    private final RegistrationSecrets secrets;
    private final TransactionTemplate tx;
    private final Driver graph;
    private final ObjectMapper json;

    public WorkspaceBaselineTestFixtures(JdbcTemplate jdbc, RegistrationSecrets secrets,
            PlatformTransactionManager manager, Driver graph, ObjectMapper json) {
        this.jdbc=jdbc; this.secrets=secrets; this.tx=new TransactionTemplate(manager); this.graph=graph; this.json=json;
    }
    @PostMapping("/api/v1/__subscription-test/baseline/{organization}")
    public Map<String,Object> create(@PathVariable UUID organization, @RequestParam(defaultValue="true") boolean ready) {
        UUID manager=UUID.randomUUID(), employee=UUID.randomUUID(), department=UUID.randomUUID(), reference=UUID.randomUUID();
        String occupation="test-occupation-"+organization, role="test-role-"+organization;
        var now=Timestamp.from(Instant.now());
        tx.executeWithoutResult(status -> {
            jdbc.update("INSERT INTO platform.department_reference(department_id,organization_id,name,active) VALUES (?,?,?,true)",
                    department,organization,"Baseline fixture department");
            jdbc.update("""
                    INSERT INTO platform.occupation_department_reference(occupation_reference_id,occupation_id,organization_id,department_id,name,active)
                    VALUES (?,?,?,?,?,true)
                    """,reference,UUID.randomUUID(),organization,department,"Baseline fixture occupation");
            member(manager,organization,"LD_MANAGER",null,null);
            member(employee,organization,"EMPLOYEE",department,reference);
            jdbc.update("INSERT INTO platform.workspace_baseline_resource(organization_id,occupation_reference_id,graph_occupation_id) VALUES (?,?,?)",
                    organization,reference,occupation);
        });
        if (ready) {
            UUID bank=UUID.randomUUID(), model=UUID.randomUUID(), mapping=UUID.randomUUID(), parameters=UUID.randomUUID(), run=UUID.randomUUID();
            List<String> skills=List.of("test-skill-1-"+organization,"test-skill-2-"+organization,"test-skill-3-"+organization);
            try (var session=graph.session()) {
                session.executeWrite(transaction -> {
                    transaction.run("""
                            CREATE (o:Occupation {id:$occupation,code:$occupation,name:'Baseline fixture occupation',status:'ACTIVE',
                              version:'synthetic-v1',organizationId:$org,reviewStatus:'APPROVED',reviewedBy:$reviewer,reviewedAt:$now})
                            CREATE (r:TargetRole {id:$role,code:$role,name:'Synthetic target role',scope:'Isolated test only',status:'ACTIVE',
                              version:'synthetic-v1',organizationId:$org,reviewStatus:'APPROVED',reviewedBy:$reviewer,reviewedAt:$now})
                            CREATE (l:Level {id:$level,code:$level,name:'Fixture level',rank:1,status:'ACTIVE',version:'synthetic-v1',
                              organizationId:$org,reviewStatus:'APPROVED',reviewedBy:$reviewer,reviewedAt:$now})
                            CREATE (o)-[:HAS_ROLE {id:$membership,status:'ACTIVE',version:'synthetic-v1',organizationId:$org,
                              reviewStatus:'APPROVED',reviewedBy:$reviewer,reviewedAt:$now}]->(r)
                            CREATE (r)-[:HAS_LEVEL {id:$roleLevel,status:'ACTIVE',version:'synthetic-v1',organizationId:$org,
                              reviewStatus:'APPROVED',reviewedBy:$reviewer,reviewedAt:$now}]->(l)
                            WITH l UNWIND $skills AS skill
                            CREATE (s:MicroSkill {id:skill,code:skill,name:skill,status:'ACTIVE',version:'synthetic-v1',
                              organizationId:$org,reviewStatus:'APPROVED',reviewedBy:$reviewer,reviewedAt:$now})
                            CREATE (l)-[:REQUIRES_SKILL {id:'requires-'+skill,status:'ACTIVE',version:'synthetic-v1',
                              requiredScore:0.7,isMandatory:true,organizationId:$org,reviewStatus:'APPROVED',
                              reviewedBy:$reviewer,reviewedAt:$now}]->(s)
                            """,Map.of("occupation",occupation,"role",role,"level","level-"+organization,
                            "membership","has-role-"+organization,"roleLevel","has-level-"+organization,
                            "org",organization.toString(),"reviewer",manager.toString(),"now",now.toInstant().toString(),"skills",skills)).consume();
                    return null;
                });
            }
            tx.executeWithoutResult(status -> {
                jdbc.update("""
                        INSERT INTO platform.model_version(model_version_id,algorithm,version,parameter_hash,configuration,artifact_ref,approved_by,approved_at)
                        VALUES (?,'IRT_3PL',?, ?,CAST(? AS jsonb),'test:synthetic-only',?,?)
                        """,model,"fixture-"+model,"a".repeat(64),write(AdaptiveFixture.policy().model()),manager,now);
                jdbc.update("""
                        INSERT INTO platform.mastery_mapping_version(mastery_mapping_version_id,mapping_type,configuration,configuration_hash)
                        VALUES (?,'LOGISTIC_CONSERVATIVE_V1',CAST(? AS jsonb),?)
                        """,mapping,write(AdaptiveFixture.policy().mapping()),"b".repeat(64));
                jdbc.update("INSERT INTO platform.question_bank(question_bank_id,name,created_by) VALUES (?,'Synthetic baseline bank',?)",bank,manager);
                jdbc.update("""
                        INSERT INTO platform.irt_parameter_set(parameter_set_id,model_version_id,source,status,parameter_hash)
                        VALUES (?,?,'CALIBRATED','BUILDING',?)
                        """,parameters,model,"c".repeat(64));
                for (String skill:skills) for(int i=0;i<3;i++) {
                    UUID item=UUID.randomUUID();
                    jdbc.update("""
                            INSERT INTO platform.item_version(item_version_id,item_id,version,question_bank_id,prompt,response_schema,
                              protected_key,publication_state,content_hash,micro_skill_id,micro_skill_name_snapshot,difficulty)
                            VALUES (?,?,1,?,'Synthetic question - choose option A',CAST(? AS jsonb),
                              '{"correctOptionId":"a"}'::jsonb,'PUBLISHED',?,?,?,'EASY')
                            """,item,item,bank,write(Map.of("type","SINGLE_CHOICE","options",List.of(Map.of("id","a","text","Option A"),Map.of("id","b","text","Option B")))),
                            "d".repeat(64),skill,skill);
                    jdbc.update("""
                            INSERT INTO platform.irt_item_parameter(parameter_set_id,item_version_id,micro_skill_id,discrimination_a,difficulty_b,guessing_c)
                            VALUES (?,?,?,1,0,0.25)
                            """,parameters,item,skill);
                }
                jdbc.update("UPDATE platform.irt_parameter_set SET status='CANDIDATE' WHERE parameter_set_id=?",parameters);
                var calibration=Map.of("origin","ACTUAL_PILOT","fixture","SYNTHETIC_TEST_ONLY",
                        "request",Map.of("scope",Map.of("organizationId",organization,"bankId",bank)));
                jdbc.update("""
                        INSERT INTO platform.irt_calibration_run(calibration_run_id,model_version_id,input_dataset_ref,configuration,status)
                        VALUES (?,?,'test:synthetic-only',CAST(? AS jsonb),'PENDING')
                        """,run,model,write(calibration));
                jdbc.update("UPDATE platform.irt_calibration_run SET status='RUNNING',started_at=? WHERE calibration_run_id=?",now,run);
                jdbc.update("""
                        UPDATE platform.irt_calibration_run SET status='SUCCEEDED',output_parameter_set_id=?,completed_at=?,
                          diagnostics='{"result":{"origin":"ACTUAL_PILOT","fixture":"SYNTHETIC_TEST_ONLY"}}'::jsonb WHERE calibration_run_id=?
                        """,parameters,now,run);
                jdbc.update("UPDATE platform.irt_parameter_set SET status='PROMOTED',activated_by=?,activated_at=? WHERE parameter_set_id=?",manager,now,parameters);
                jdbc.update("""
                        INSERT INTO platform.irt_effective_parameter_selection VALUES (?,?,?,?,1,?,?)
                        """,organization,bank,model,parameters,manager,now);
                jdbc.update("""
                        INSERT INTO platform.irt_parameter_promotion_command(organization_id,actor_id,idempotency_key,question_bank_id,
                          model_version_id,request_hash,parameter_set_id,parameter_hash,expected_revision,expected_parameter_set_id,
                          selection_revision,reason,occurred_at)
                        VALUES (?,?,'synthetic-fixture',?,?,?,?,?,0,NULL,1,'Synthetic fixture, not actual calibration',?)
                        """,organization,manager,bank,model,"e".repeat(64),parameters,"c".repeat(64),now);
                jdbc.update("""
                        UPDATE platform.workspace_baseline_resource SET question_bank_id=?,model_version_id=?,mastery_mapping_version_id=?
                        WHERE organization_id=? AND graph_occupation_id=?
                        """,bank,model,mapping,organization,occupation);
            });
        }
        return Map.of("manager",Map.of("email",manager+"@example.test","password",PASSWORD),
                "employee",Map.of("email",employee+"@example.test","password",PASSWORD),
                "occupationId",occupation,"roleId",role,"organizationId",organization);
    }
    private void member(UUID account,UUID org,String role,UUID department,UUID reference) {
        UUID membership=UUID.randomUUID();
        jdbc.update("""
                INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash)
                VALUES (?,?,?,?,?)
                """,account,org,account+"@example.test",account+"@example.test",secrets.hashPassword(PASSWORD));
        jdbc.update("INSERT INTO platform.workspace_account_profile(account_id,full_name,email_verified_at) VALUES (?,?,now())",account,"Synthetic "+role);
        jdbc.update("""
                INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,department_id,
                  occupation_reference_id,created_at,updated_at) VALUES (?,?,?,true,?,?,now(),now())
                """,membership,account,org,department,reference);
        jdbc.update("INSERT INTO platform.organization_membership_role VALUES (?,?)",membership,role);
    }
    private String write(Object value) {
        try { return json.writeValueAsString(value); }
        catch(com.fasterxml.jackson.core.JsonProcessingException error) { throw new IllegalStateException(error); }
    }
}
