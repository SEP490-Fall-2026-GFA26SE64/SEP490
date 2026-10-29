package com.adaptlearngraph.pathway.infrastructure;

import static com.adaptlearngraph.assessment.adaptive.AdaptiveFixture.*;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.*;
import com.adaptlearngraph.assessment.adaptive.infrastructure.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.*;
import com.adaptlearngraph.assessment.adaptive.attempt.infrastructure.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import javax.sql.DataSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Isolated input setup: real baseline stores/policy/answers/results; no mock, development seed or outcome oracle. */
final class PathwayBaselineFixture {
    final JdbcTemplate sql;final NamedParameterJdbcTemplate jdbc;final DataSourceTransactionManager manager;
    final ObjectMapper json;final JdbcAdaptiveBlueprintStore blueprints;final Version version;
    PathwayBaselineFixture(DataSource ds,ObjectMapper json) {
        this.json=json;sql=new JdbcTemplate(ds);jdbc=new NamedParameterJdbcTemplate(ds);manager=new DataSourceTransactionManager(ds);
        sql.update("INSERT INTO platform.organization(organization_id,code,name) VALUES (?,'C3_FULL_A','C3 Full A'),(?,'C3_FULL_B','C3 Full B')",ORG,id(2));
        for(var account:List.of(MANAGER,id(2001))) {
            sql.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,?,?,'test-only')",account,ORG,"c3-"+account,"c3-"+account);
        }
        sql.update("INSERT INTO platform.account_role(account_id,role_code) VALUES (?,'DOMAIN_EXPERT')",id(2001));
        new TransactionTemplate(manager).executeWithoutResult(status->{
            sql.update("INSERT INTO platform.model_version(model_version_id,algorithm,version,parameter_hash,configuration,artifact_ref) VALUES (?,'IRT_3PL','C3_INPUT',?,CAST(? AS jsonb),'test:C3-independent')",PINS.modelVersionId(),"a".repeat(64),write(policy().model()));
            sql.update("INSERT INTO platform.mastery_mapping_version(mastery_mapping_version_id,mapping_type,configuration,configuration_hash) VALUES (?,'LOGISTIC_CONSERVATIVE_V1',CAST(? AS jsonb),?)",PINS.masteryMappingVersionId(),write(policy().mapping()),"b".repeat(64));
            sql.update("INSERT INTO platform.question_bank(question_bank_id,name,created_by) VALUES (?,'C3 independent bank',?)",id(50),MANAGER);
            sql.update("INSERT INTO platform.irt_parameter_set(parameter_set_id,model_version_id,source,status,parameter_hash) VALUES (?,?,'SEEDED','BUILDING',?)",PINS.parameterSetId(),PINS.modelVersionId(),"c".repeat(64));
            pool().forEach((item,skill)->{
                sql.update("INSERT INTO platform.item_version(item_version_id,item_id,version,question_bank_id,prompt,response_schema,protected_key,publication_state,content_hash,micro_skill_id,micro_skill_name_snapshot,difficulty) VALUES (?,?,1,?,'C3 independent question','{\"options\":[{\"id\":\"a\",\"text\":\"A\"},{\"id\":\"b\",\"text\":\"B\"}]}'::jsonb,'{\"correctOptionId\":\"b\"}'::jsonb,'PUBLISHED',?,?,?,'EASY')",item,item,id(50),"d".repeat(64),skill,"Skill "+skill);
                sql.update("INSERT INTO platform.irt_item_parameter(parameter_set_id,item_version_id,micro_skill_id,discrimination_a,difficulty_b,guessing_c) VALUES (?,?,?,1,0,0.25)",PINS.parameterSetId(),item,skill);
            });
            sql.update("UPDATE platform.irt_parameter_set SET status='CANDIDATE' WHERE parameter_set_id=?",PINS.parameterSetId());
            sql.update("UPDATE platform.irt_parameter_set SET status='PROMOTED',activated_by=?,activated_at=now() WHERE parameter_set_id=?",MANAGER,PINS.parameterSetId());
        });
        blueprints=new JdbcAdaptiveBlueprintStore(jdbc,json,manager);
        version=blueprints.inTransaction(SCOPE,()->{
            blueprints.ensureIdentity(SCOPE,MANAGER);var v=new Version(SCOPE,blueprints.nextVersion(SCOPE),config(),"Fixture Occupation","fixture-f3-v1",PINS,roles(),MANAGER,NOW);
            blueprints.insertVersion(SCOPE,v);
            var activation=new Activation(SCOPE,1,Optional.of(v.id()),MANAGER,NOW);
            blueprints.saveActivation(SCOPE,0,activation);blueprints.appendActivationEvent(SCOPE,activation,com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintStore.Operation.FINALIZE,"C3 fixture input");return v;
        });
    }
    UUID learner() {
        UUID learner=UUID.randomUUID();sql.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,?,?,'test-only')",learner,ORG,"c3-"+learner,"c3-"+learner);
        sql.update("INSERT INTO platform.learner_state(learner_id) VALUES (?)",learner);
        var scope=new AdaptiveAttempt.Scope(ORG,learner,OCC);
        var snapshot=new AdaptiveAttemptSnapshot(version,AdaptiveAttemptSnapshot.Purpose.OCCUPATION_EXPLORATION,Optional.empty(),Optional.empty(),pool());
        var context=new AdaptiveAttemptContextPort() {
            public Employee requireEmployee(){return new Employee(ORG,learner);}
            public void authorizeScope(Employee e,AdaptiveAttempt.Scope s){if(!e.equals(requireEmployee()) || !s.equals(scope))throw new IllegalStateException("foreign fixture scope");}
            public AdaptiveAttempt.Scope resolveScope(Employee e,AdaptiveAttemptUseCase.StartTarget target){authorizeScope(e,scope);return scope;}
            public AdaptiveAttemptSnapshot resolveStartingSnapshot(AdaptiveAttempt.Scope s,AdaptiveAttemptUseCase.StartTarget target){authorizeScope(requireEmployee(),s);return snapshot;}
        };
        var attempts=new JdbcAdaptiveAttemptStore(jdbc,json,manager,blueprints);
        var policy=new PinnedAdaptiveAttemptPolicyAdapter(new JdbcAdaptiveTechnicalVersionStore(jdbc));
        var content=new JdbcAdaptiveAttemptContent(jdbc,id(50));var outcome=new JdbcAdaptiveAttemptOutcome(jdbc,json,attempts);
        var finalizer=new AdaptiveAttemptFinalizationService(attempts,policy,outcome);
        var start=new AdaptiveAttemptStartService(context,attempts,policy,content);
        var answers=new AdaptiveAttemptAnswerService(context,attempts,policy,content,new JdbcAdaptiveAttemptScoring(jdbc,id(50)),Optional.of(finalizer));
        var view=start.startOrResume(new AdaptiveAttemptUseCase.Exploration(OCC),"fixture-start");int count=0;
        while(view.state().equals("IN_PROGRESS") && count++<20) {
            var item=view.items().getLast();view=answers.answer(new AdaptiveAttemptUseCase.Answer(view.id(),view.revision(),item.position(),item.itemVersionId(),"a","fixture-answer-"+view.revision()));
        }
        if(!Set.of("SUBMITTED","AUTO_SUBMITTED").contains(view.state()))throw new IllegalStateException("Fixture baseline did not complete");
        var mastery=new TreeMap<String,Object>();
        for(var row:sql.queryForList("SELECT micro_skill_id,mastery FROM platform.baseline_attempt_skill_result WHERE attempt_id=?",view.id()))mastery.put(row.get("micro_skill_id").toString(),row.get("mastery"));
        // Owner-profile fixture is an exact copy of real immutable outcomes, never fabricated scores.
        sql.update("INSERT INTO platform.employee_occupation_profile(organization_id,learner_id,occupation_id,attempt_id,blueprint_id,blueprint_version,catalog_fingerprint,required_skills,mastery,initialized_at) SELECT organization_id,learner_id,occupation_id,attempt_id,blueprint_id,blueprint_version,catalog_fingerprint,'[\"s1\",\"s2\",\"s3\"]'::jsonb,CAST(? AS jsonb),finished_at FROM platform.baseline_adaptive_attempt WHERE attempt_id=?",write(mastery),view.id());
        return learner;
    }
    String write(Object value){try{return json.writeValueAsString(value);}catch(Exception invalid){throw new IllegalStateException(invalid);}}
}
