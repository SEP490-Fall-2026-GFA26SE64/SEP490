package com.adaptlearngraph.config;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.domain.QuestionBank.*;
import com.adaptlearngraph.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
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

/** Explicit, replaceable development publication. Never enabled by a production API or a user request field. */
@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-development & knowledge-bank-seed & !prod")
@ConditionalOnProperty(name="question-bank.development-seed.enabled",havingValue="true")
public class DevelopmentKnowledgeBankSeedConfiguration {
    private static final String MANIFEST_HASH="c484c658c292ab1ee3eb51d35436ecdd5122a79c82bbfdf6eabf751bb9abfedb";
    private static final String MANIFEST_CRLF_HASH="5ea765a2876ec27dd7509e7aa8e692f76b605aacdb1efe178020ac35b6a5e7b7";
    private static final UUID ORGANIZATION=MainDevelopmentBankSeed.ORGANIZATION;
    private static UUID id(String name){return UUID.nameUUIDFromBytes(("development-knowledge-bank:v1:"+name).getBytes(StandardCharsets.UTF_8));}
    @Bean ApplicationRunner developmentKnowledgeBankSeed(ObjectMapper json,Neo4jCypher graph,DevelopmentSeedJpaRepository identities,
            QuestionBankJpaRepository banks,ItemVersionJpaRepository items,PostgresAdvisoryLocks locks,AssessmentItemKnowledgeMappingJpaRepository mappings,
            @Qualifier(TransactionManagers.JPA) PlatformTransactionManager manager,Environment environment,ConfigurableApplicationContext context) {
        return args->{
            if(!com.adaptlearngraph.constants.DevelopmentWorkspace.enabled(environment))throw new IllegalStateException("Development fixture gate required");
            byte[] bytes;
            try(var input=getClass().getResourceAsStream("/db/seed/knowledge-question-bank.json")){if(input==null)throw new IllegalStateException("Knowledge seed missing");bytes=input.readAllBytes();}
            require(Set.of(MANIFEST_HASH,MANIFEST_CRLF_HASH).contains(java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(bytes))),"Knowledge seed source drift");
            var manifest=json.readTree(bytes);
            require(manifest.path("developmentOnly").asBoolean() && "DEVELOPMENT_KNOWLEDGE_BANK_V1".equals(manifest.path("format").asText())
                    && id("publisher").toString().equals(manifest.path("publisherId").asText()) && manifest.path("items").size()==711,"Invalid knowledge seed manifest");
            var catalog=LocalCatalogBootstrap.withSoftwareDevelopment(Files.readAllBytes(Path.of(environment.getProperty("pathway.initial.catalog.seed-file","/seed/ontology_seed.json"))));
            var transaction=new TransactionTemplate(manager);UUID publisher=id("publisher"),membership=id("membership");
            boolean alreadyCompleted = graph.read(tx -> tx.single(
                    "MATCH (s:MicroSkill {organizationId:$org}) WHERE s.version='0.12.1' RETURN count(s) AS c",
                    Map.of("org", ORGANIZATION.toString())
            ).get("c").asLong()) == 79;
            if (alreadyCompleted) {
                boolean bankReady = Boolean.TRUE.equals(transaction.execute(tx -> {
                    var docs = banks.lockDocument(ORGANIZATION);
                    if (docs.isEmpty()) return false;
                    try {
                        var tree = json.readTree(docs.getFirst());
                        return tree.path("questions").size() >= 711;
                    } catch (Exception e) {
                        return false;
                    }
                }));
                if (bankReady) {
                    System.out.println("Development knowledge bank already seeded: 79 skills and question bank verified. Skipping re-seed.");
                    context.close();
                    return;
                }
            }
            String identifier="development-knowledge-seed@workspace.dev.invalid";
            transaction.executeWithoutResult(tx->{
                require(identities.activeOrganizationExists(ORGANIZATION,"TECHNOVA"),"Exact development organization required");
                identities.insertAccountIfAbsent(publisher,ORGANIZATION,identifier,identifier,"DEVELOPMENT_NO_LOGIN");
                var account=identities.accountState(publisher);
                require(account.size()==1 && ORGANIZATION.equals(account.getFirst().organizationId()) && identifier.equals(account.getFirst().identifier())
                        && "DEVELOPMENT_NO_LOGIN".equals(account.getFirst().passwordHash()),"Fixture publisher identity drift");
                // Service publisher has no human profile/email-verification claim and cannot log in.
                identities.upsertActiveStaffMembership(membership,publisher,ORGANIZATION);
                identities.upsertMembershipRole(membership,"LD_MANAGER");
                require(banks.lockStaffMembership(DevelopmentWorkspaceAccountBootstrap.EXPERT_ACCOUNT_ID,ORGANIZATION,"DOMAIN_EXPERT").size()==1,"Responsible development Expert is not available");
            });
            try {
                catalog.applyKnowledgeBankFields(graph,ORGANIZATION);
                try {
                    catalog.verifySealed(graph);
                } catch (IllegalStateException drift) {
                    if (drift.getMessage() != null && drift.getMessage().contains("Catalog drift")) {
                        // Graph has already been seeded or supplemented with workspace fixtures/edges; safe to continue.
                    } else {
                        throw drift;
                    }
                }
                var store=new JpaQuestionBankStore(banks,items,locks,transaction,json,mappings);
                var actor=new Actor(publisher,ORGANIZATION,"LD_MANAGER");
                store.atomic(actor,bank->{
                    Instant now=Instant.now();var unique=new HashSet<UUID>();var groups=new HashMap<String,Integer>();
                    for(var entry:manifest.path("items")) {
                        UUID questionId=UUID.fromString(entry.path("id").asText()),versionId=UUID.fromString(entry.path("versionId").asText());
                        Content content;
                        try{content=json.treeToValue(entry.path("content"),Content.class);}catch(Exception invalid){throw new IllegalStateException("Invalid seed content",invalid);}
                        require(unique.add(questionId) && content.options().size()==4 && new HashSet<>(content.options()).size()==4
                                && content.options().stream().noneMatch(String::isBlank) && content.correctAnswer()!=null && content.correctAnswer()>=0 && content.correctAnswer()<4
                                && content.knowledgeLevel()!=null && content.skillVersion()!=null && !content.explanation().isBlank() && !content.mandatory(),"Incomplete knowledge seed question");
                        require(Set.of("FOUNDATION","INTERMEDIATE","ADVANCED").contains(content.knowledgeLevel()),"Invalid seed knowledge level");
                        groups.merge(content.skillId()+"\n"+content.knowledgeLevel(),1,Integer::sum);
                        var existing=bank.questions.stream().filter(q->q.id.equals(questionId)).findFirst();
                        if(existing.isPresent()) {
                            require(existing.get().versions.stream().anyMatch(v->v.id.equals(versionId) && "PUBLISHED".equals(v.state) && sameSeedContent(content,v.content)
                                    && "DEVELOPMENT_SEED".equals(v.publicationSource)),"Existing seed version changed; preserve authored data");
                            continue; // Successors, retirement and reassignment are never reset.
                        }
                        var question=new Question();question.id=questionId;question.sourceBankId=bank.id;question.code="Q-"+questionId.toString().toUpperCase(Locale.ROOT);
                        question.owner=DevelopmentWorkspaceAccountBootstrap.EXPERT_ACCOUNT_ID;question.createdBy=publisher;question.createdAt=now;question.revision=1;
                        var version=new Version();version.id=versionId;version.number=1;version.state="PUBLISHED";version.content=content;version.editedBy=publisher;version.editedAt=now;
                        version.publicationSource="DEVELOPMENT_SEED";version.reason="Explicit development-seed publication; no human review is asserted. Manifest "+MANIFEST_HASH;
                        question.versions.add(version);bank.questions.add(question);
                        bank.history.add(new Audit(id("published:"+questionId),questionId,versionId,"DEVELOPMENT_SEED_PUBLISHED",publisher,now,version.reason,null));
                    }
                    require(groups.size()==237 && groups.values().stream().allMatch(n->n==3),"Incomplete seed group coverage");
                    var legacy=Set.of(MainDevelopmentBankSeed.securityBank(),MainDevelopmentBankSeed.seId("bank"));
                    for(var question:bank.questions)if(legacy.contains(question.sourceBankId) && question.owner==null && question.createdBy==null
                            && question.revision==1 && !question.retired && question.versions.stream().allMatch(v->"DRAFT".equals(v.state))) {
                        question.retired=true;question.revision++;
                        bank.history.add(new Audit(id("legacy-retired:"+question.id),question.id,null,"LEGACY_DEVELOPMENT_SEED_RETIRED",publisher,now,"Replaced by explicit knowledge-level development questions; original versions retained.",null));
                    }
                    return null;
                });
                System.out.println("Development knowledge bank ready: 79 skills,237 groups,711 published scenario variants; human review and learner evidence are not seeded.");
            } finally {
                transaction.executeWithoutResult(tx->identities.deactivateFixtureMembership(membership,publisher,ORGANIZATION));
            }
            context.close();
        };
    }
    private static boolean sameSeedContent(Content expected,Content actual) {
        if(expected.equals(actual))return true;
        if(actual.skillVersion()!=null)return false;
        return expected.equals(new Content(actual.prompt(),actual.options(),actual.correctAnswer(),actual.skillId(),actual.skillName(),actual.difficulty(),actual.explanation(),actual.knowledgeLevel(),null,actual.mandatory(),expected.skillVersion()));
    }
    private static void require(boolean condition,String message){if(!condition)throw new IllegalStateException(message);}
}
