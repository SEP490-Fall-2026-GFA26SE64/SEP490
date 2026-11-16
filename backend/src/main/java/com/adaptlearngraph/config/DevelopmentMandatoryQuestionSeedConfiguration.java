package com.adaptlearngraph.config;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.domain.QuestionBank.*;
import com.adaptlearngraph.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Separate default-off additive release. Does not bootstrap catalog, reset data or republish the base bank. */
@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-development & knowledge-bank-seed & !prod")
@ConditionalOnProperty(name="question-bank.development-mandatory-seed.enabled",havingValue="true")
public class DevelopmentMandatoryQuestionSeedConfiguration {
    /** Keep the absent historical version property absent when this additive importer writes the document. */
    private abstract static class AdditiveContentEncoding {
        @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
        public abstract String skillVersion();
    }
    private static final String HASH="782e9a4cddfee13e57481e6f650a62f7d6b9b36780201ca4916726b67a8ba830";
    private static UUID id(String value){return UUID.nameUUIDFromBytes(("development-knowledge-bank:v1:"+value).getBytes(StandardCharsets.UTF_8));}
    @Bean ApplicationRunner developmentMandatoryQuestionSeed(ObjectMapper json,Neo4jCypher graph,DevelopmentSeedJpaRepository identities,
            QuestionBankJpaRepository banks,ItemVersionJpaRepository items,PostgresAdvisoryLocks locks,AssessmentItemKnowledgeMappingJpaRepository mappings,
            @Qualifier(TransactionManagers.JPA) PlatformTransactionManager manager,Environment environment,ConfigurableApplicationContext context) {
        return args->{
            require(com.adaptlearngraph.constants.DevelopmentWorkspace.enabled(environment),"Development fixture gate required");
            require(!environment.getProperty("question-bank.development-seed.enabled",Boolean.class,false),"Run the additive release separately from base publication");
            byte[] bytes;
            try(var stream=getClass().getResourceAsStream("/db/seed/app-dev-mandatory-questions-v1.json")){
                require(stream!=null,"Mandatory manifest missing");bytes=stream.readAllBytes();
            }
            String hash=HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(bytes));
            require(Set.of(HASH,"16c993af2c946bc6dfca8224230eba664e8fa30b1ae651d9a0489cbb8b850836").contains(hash),"Mandatory manifest drift");
            var manifest=json.readTree(bytes);
            require(manifest.path("developmentOnly").asBoolean() && "DEVELOPMENT_APP_DEV_MANDATORY_V1".equals(manifest.path("format").asText())
                    && manifest.path("items").size()==4 && id("publisher").toString().equals(manifest.path("publisherId").asText()),"Invalid additive release");
            UUID org=MainDevelopmentBankSeed.ORGANIZATION,publisher=id("publisher"),membership=id("membership");
            // Verify the exact Role/level/Skill/version scope without changing graph data.
            for(var entry:manifest.path("items")) {
                var content=entry.path("content");
                var found=graph.read(tx->tx.list("""
                        MATCH (r:TargetRole {id:$role})-[:HAS_LEVEL]->(l:Level)-[q:REQUIRES_SKILL]->(s:MicroSkill {id:$skill})
                        WHERE s.version=$version AND $level IN q.requiredKnowledgeLevels AND q.status='ACTIVE'
                            AND all(n IN [r,l,q,s] WHERE n.organizationId IS NULL OR n.organizationId=$org)
                        RETURN s.id AS id LIMIT 1
                        """,Map.of("role",manifest.path("roleId").asText(),"skill",content.path("skillId").asText(),
                                "version",content.path("skillVersion").asText(),"level",content.path("knowledgeLevel").asText(),"org",org.toString())));
                require(found.size()==1,"App Dev source scope unavailable");
            }
            var transaction=new TransactionTemplate(manager);
            transaction.executeWithoutResult(status->{
                require(identities.activeOrganizationExists(org,"TECHNOVA"),"Exact development organization required");
                var account=identities.accountState(publisher);
                require(account.size()==1 && org.equals(account.getFirst().organizationId())
                        && "development-knowledge-seed@workspace.dev.invalid".equals(account.getFirst().identifier())
                        && "DEVELOPMENT_NO_LOGIN".equals(account.getFirst().passwordHash()),"Run the original base publication first");
                require(banks.lockStaffMembership(DevelopmentWorkspaceAccountBootstrap.EXPERT_ACCOUNT_ID,org,"DOMAIN_EXPERT").size()==1,"Responsible Expert unavailable");
                identities.upsertActiveStaffMembership(membership,publisher,org);identities.upsertMembershipRole(membership,"LD_MANAGER");
            });
            try {
                var seedJson=json.copy().addMixIn(Content.class,AdditiveContentEncoding.class);
                var store=new JpaQuestionBankStore(banks,items,locks,transaction,seedJson,mappings);
                store.atomic(new Actor(publisher,org,"LD_MANAGER"),bank->{
                    var unique=new HashSet<UUID>();Instant now=Instant.now();
                    for(var entry:manifest.path("items")) {
                        UUID questionId=UUID.fromString(entry.path("id").asText()),versionId=UUID.fromString(entry.path("versionId").asText());
                        Content content=json.convertValue(entry.path("content"),Content.class);
                        require(unique.add(questionId) && content.mandatory() && "0.12.1".equals(content.skillVersion())
                                && content.options().size()==4 && new HashSet<>(content.options()).size()==4
                                && content.correctAnswer()!=null && content.correctAnswer()>=0 && content.correctAnswer()<4,"Invalid mandatory content");
                        var prior=bank.questions.stream().filter(q->q.id.equals(questionId)).findFirst();
                        if(prior.isPresent()) {
                            require(prior.get().versions.stream().anyMatch(v->v.id.equals(versionId) && "PUBLISHED".equals(v.state)
                                    && content.equals(v.content) && "DEVELOPMENT_SEED".equals(v.publicationSource)),"Existing release drift; no overwrite");
                            continue;
                        }
                        require(bank.questions.stream().flatMap(q->q.versions.stream()).noneMatch(v->v.id.equals(versionId)),"Version ID collision");
                        var question=new Question();question.id=questionId;question.sourceBankId=bank.id;question.code="Q-"+questionId.toString().toUpperCase(Locale.ROOT);
                        question.owner=DevelopmentWorkspaceAccountBootstrap.EXPERT_ACCOUNT_ID;question.createdBy=publisher;question.createdAt=now;question.revision=1;
                        var version=new Version();version.id=versionId;version.number=1;version.state="PUBLISHED";version.content=content;version.editedBy=publisher;version.editedAt=now;
                        version.publicationSource="DEVELOPMENT_SEED";version.reason="Explicit additive App Dev mandatory release; not human reviewed. Manifest "+HASH;
                        question.versions.add(version);bank.questions.add(question);
                        bank.history.add(new Audit(id("published:"+questionId),questionId,versionId,"DEVELOPMENT_SEED_PUBLISHED",publisher,now,version.reason,null));
                    }
                    return null;
                });
            } finally { transaction.executeWithoutResult(status->identities.deactivateFixtureMembership(membership,publisher,org)); }
            context.close();
        };
    }
    private static void require(boolean condition,String message){if(!condition)throw new IllegalStateException(message);}
}
