package com.adaptlearngraph.config;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Explicit opt-in repair of the approved development pathway only. Normal API/startup never runs this. */
@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-development & certificate-pathway-fixture & !prod")
@ConditionalOnProperty(name="certificates.development-pathway.enabled",havingValue="true")
public class DevelopmentCertificatePathwayConfiguration {
    @Bean ApplicationRunner developmentCertificatePathway(ObjectMapper json,Neo4jCypher graph,Environment env,BeanFactory beans,
            EntityManager entityManager,JdbcTemplate jdbc,@Qualifier(TransactionManagers.JPA) PlatformTransactionManager manager,
            ConfigurableApplicationContext context) {
        return args->{
            DevelopmentCertificateFixtures.require(com.adaptlearngraph.constants.DevelopmentWorkspace.enabled(env),"Development fixture gate required");
            UUID request=UUID.fromString(env.getRequiredProperty("certificates.development-pathway.request-id"));
            DevelopmentCertificateFixtures.require(request.equals(UUID.fromString("f7dd9f48-1290-4b50-bdce-cd0e5ec6dbed")),"Only the user-approved development pathway may change");
            long expected=Long.parseLong(env.getRequiredProperty("certificates.development-pathway.expected-revision"));
            var definitions=DevelopmentCertificateFixtures.read(json);
            var rules=beans.getBean(RequirementPathwayJpaRepository.class);
            var revisions=new RequirementPathwayRevisions(InitialPathwayRepositories.from(beans::getBean),rules,beans.getBean(RuleAssessmentAttemptJpaRepository.class),json);
            var organization=DevelopmentCertificateFixtures.ORGANIZATION;var learner=DevelopmentWorkspaceAccountBootstrap.EMPLOYEE_ACCOUNT_ID;
            var locks=new PostgresAdvisoryLocks(entityManager);
            new TransactionTemplate(manager).executeWithoutResult(tx->{
                locks.lock("AB-ATTEMPT-ACTOR-V1\n"+organization+"\n"+learner);
                var row=rules.lock(organization,request).orElseThrow();
                DevelopmentCertificateFixtures.require(learner.equals(row.getLearnerId()) && row.getArchivedAt()==null,"Exact active development learner required");
                try{DevelopmentCertificateFixtures.require("Application Developer".equals(json.readTree(row.getFrozenInput()).path("input").path("binding").path("roleName").asText()),"Application Developer binding required");}
                catch(java.io.IOException invalid){throw new IllegalStateException(invalid);}
                var original=revisions.read(row);var targets=original.steps().stream().filter(step->definitions.stream().anyMatch(d->d.skillId().equals(step.requirement().skillId()) && d.knowledgeLevel()==step.requirement().knowledgeLevel())).toList();
                DevelopmentCertificateFixtures.require(targets.size()==2,"Both exact target steps required");
                boolean already=targets.stream().allMatch(step->step.requirement().provision()==Provision.CERTIFICATE_ONLY && definitions.stream().anyMatch(d->step.certificate()!=null && d.id().equals(step.certificate().id())));
                if(already){System.out.println("Certificate pathway fixture already applied; no revision changed.");return;}
                DevelopmentCertificateFixtures.require(Objects.equals(row.getCurrentRevision(),expected) && "APPROVED".equals(row.getReviewStatus()),"Pathway revision/status drift; preserve current data");
                var ids=targets.stream().map(Step::id).collect(java.util.stream.Collectors.toSet());
                DevelopmentCertificateFixtures.require(targets.stream().allMatch(step->step.requirement().provision()==Provision.MODULE_ONLY && step.state()==State.NEEDS_SUPPLEMENTATION),"Target already started/resolved or changed");
                DevelopmentCertificateFixtures.require(rules.progress(organization,learner,revisions.encode(original)).stream().noneMatch(p->ids.contains(p.getStepId()) && (p.getStartedAt()!=null || p.getCompletedAt()!=null)),"Preserve started target modules");
                DevelopmentCertificateFixtures.require(original.dependencies().stream().noneMatch(d->ids.contains(d.prerequisiteStepId()) || ids.contains(d.dependentStepId())),"Preserve assessed target dependencies");
                DevelopmentCertificateFixtures.require(rules.official(organization,learner,revisions.encode(targets.stream().map(Step::requirement).toList())).isEmpty(),"Preserve existing target achievements");
                for(var step:targets) {
                    var need=step.requirement();var definition=definitions.stream().filter(d->d.skillId().equals(need.skillId()) && d.knowledgeLevel()==need.knowledgeLevel()).findFirst().orElseThrow();
                    DevelopmentCertificateFixtures.require(definition.skillVersion().equals(need.skillVersion()) && new HashSet<>(definition.outcomeCodes()).equals(new HashSet<>(need.outcomeCodes())),"Frozen requirement drift");
                    for(var option:step.options())DevelopmentCertificateFixtures.require(jdbc.queryForObject("SELECT count(*) FROM platform.rule_assessment_attempt WHERE organization_id=? AND learner_id=? AND purpose='SKILL_ASSESSMENT' AND context_snapshot->'context'->>'moduleId'=?",Long.class,organization,learner,option.moduleId())==0,"Preserve target attempt history");
                }
                var publisher=UUID.nameUUIDFromBytes("development-knowledge-bank:v1:publisher".getBytes(StandardCharsets.UTF_8));
                DevelopmentCertificateFixtures.require(beans.getBean(DevelopmentSeedJpaRepository.class).accountState(publisher).stream().anyMatch(a->organization.equals(a.organizationId()) && "DEVELOPMENT_NO_LOGIN".equals(a.passwordHash())),"Explicit service seed publisher required");
                var receipt=Path.of(env.getRequiredProperty("certificates.development-pathway.receipt-directory"));
                try {
                    Files.createDirectories(receipt);
                    var file=receipt.resolve("pathway-before-revision-"+expected+".json");
                    if(!Files.exists(file))Files.writeString(file,json.writeValueAsString(Map.of("requestId",request,"revision",expected,"contentHash",row.getContentHash(),"content",json.readTree(row.getContent()),"frozenInput",json.readTree(row.getFrozenInput()))),StandardOpenOption.CREATE_NEW);
                    var graphFile=receipt.resolve("certificate-graph-before.json");
                    if(!Files.exists(graphFile)) {
                        var snapshot=graph.read(g->g.list("MATCH (s:MicroSkill {organizationId:$org}) WHERE s.id IN $ids OPTIONAL MATCH (s)-[r:REQUIRES_CERTIFICATE]->(c) RETURN properties(s) AS skill,collect(properties(r)) AS assignments,collect(properties(c)) AS certificates",Map.of("org",organization.toString(),"ids",definitions.stream().map(DevelopmentCertificateFixtures.Definition::skillId).toList()))
                                .stream().map(r->Map.of("skill",r.get("skill").asMap(),"assignments",r.get("assignments").asList(v->v.asMap()),"certificates",r.get("certificates").asList(v->v.asMap()))).toList());
                        Files.writeString(graphFile,json.writeValueAsString(snapshot),StandardOpenOption.CREATE_NEW);
                    }
                }catch(java.io.IOException failure){throw new IllegalStateException("Retained pre-change snapshot required",failure);}
                DevelopmentCertificateFixtures.apply(graph,definitions);
                var steps=original.steps().stream().map(step->{
                    if(!ids.contains(step.id()))return step;
                    var d=definitions.stream().filter(item->item.skillId().equals(step.requirement().skillId()) && item.knowledgeLevel()==step.requirement().knowledgeLevel()).findFirst().orElseThrow();
                    var old=step.requirement();var need=new Requirement(old.skillId(),old.skillName(),old.knowledgeLevel(),old.skillVersion(),old.outcomeCodes(),Provision.CERTIFICATE_ONLY);
                    return new Step(step.id(),need,step.kind(),step.sourceBypassId(),State.NEEDS_SUPPLEMENTATION,"LEARNING_OR_CERTIFICATE_REQUIRED",null,List.of(),new CertificateReference(d.id(),"1",d.name(),d.referenceUrl()),step.assessedSources());
                }).toList();
                long next=revisions.publish(row,new Plan(steps,original.dependencies()),row.getRunId(),"PROVISION",null,null,"AWAITING_EXPERT_REVIEW",publisher);
                revisions.event(row,next,"DEVELOPMENT_CERTIFICATE_PROVISION_CHANGED",publisher,Map.of("source",DevelopmentCertificateFixtures.SOURCE,"previousRevision",expected,"stepIds",ids.stream().map(UUID::toString).sorted().toList()));
                System.out.println("Certificate pathway revision "+next+" created; Expert approval required. Other steps/history retained.");
            });
            context.close();
        };
    }
}
