import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.domain.*;
import com.adaptlearngraph.entities.domain.QuestionBank.*;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.utility.RegistrationCryptography;
import com.fasterxml.jackson.databind.*;
import jakarta.persistence.EntityManagerFactory;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import javax.sql.DataSource;
import org.neo4j.driver.*;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

/** External CLI only: not on the backend source path, not component-scanned, never in its application JAR. */
public final class CouncilDemoSeed {
    static final ObjectMapper JSON = new ObjectMapper().findAndRegisterModules();
    static final UUID ORG = UUID.fromString("e0000000-0000-0000-0000-000000000001");
    static final String SOURCE = "COUNCIL_DEMO_V1";
    static final Set<String> LABELS = Set.of("Department","JobPosition","TargetRole","Level","Competency","MicroSkill","LearningModule","Certificate");
    static final Set<String> TYPES = Set.of("HAS_JOB_POSITION","HAS_ROLE","HAS_LEVEL","HAS_COMPETENCY","HAS_SKILL","REQUIRES_SKILL","TEACHES","HAS_SKILL_PREREQUISITE","REQUIRES_CERTIFICATE");
    private abstract static class ContentEncoding {
        @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
        public abstract String skillVersion();
    }
    static String encode(Object value) { try { return JSON.writeValueAsString(value); } catch(Exception e) { throw new IllegalStateException(e); } }
    static boolean same(Object a,Object b) { try { return JSON.readTree(encode(a)).equals(JSON.readTree(encode(b))); } catch(Exception e) { throw new IllegalStateException(e); } }
    static void need(boolean value,String message) { if(!value)throw new IllegalStateException(message); }
    static String setting(String name) { String v=System.getenv(name);need(v!=null&&!v.isBlank(),"Missing private environment setting: "+name);return v; }
    static UUID uuid(JsonNode v,String field) { return UUID.fromString(v.path(field).asText()); }
    static Map<String,Object> props(JsonNode node) { return JSON.convertValue(node, new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){}); }
    static UUID receiptId() { return UUID.nameUUIDFromBytes(SOURCE.getBytes(StandardCharsets.UTF_8)); }

    public static void main(String[] args) throws Exception {
        need(args.length==2 && Set.of("validate","check","apply","verify").contains(args[0]),"Use validate|check|apply|verify <fixture.json>");
        byte[] bytes=Files.readAllBytes(Path.of(args[1]));JsonNode f=JSON.readTree(bytes);
        validate(f);
        if(args[0].equals("validate"))return;
        String url=setting("COUNCIL_DB_URL"),bolt=setting("COUNCIL_NEO4J_URI");
        need(url.equals("jdbc:postgresql://127.0.0.1:29432/adapt_learn_graph_council_demo"),"Only the dedicated council demo database at 127.0.0.1:29432 is accepted");
        need(bolt.equals("bolt://127.0.0.1:29687"),"Only the dedicated council demo Bolt endpoint at 127.0.0.1:29687 is accepted");
        if(args[0].equals("apply"))need("true".equals(setting("COUNCIL_SEED_ALLOWED")),"Explicit local seed gate required");
        String hash=HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(bytes));
        var source=new DriverManagerDataSource(url,setting("COUNCIL_DB_USER"),setting("COUNCIL_DB_PASSWORD"));
        try(var context=new AnnotationConfigApplicationContext();var driver=GraphDatabase.driver(bolt,AuthTokens.basic(setting("COUNCIL_NEO4J_USER"),setting("COUNCIL_NEO4J_PASSWORD")))) {
            context.registerBean("dataSource",DataSource.class,()->source);context.register(Persistence.class);context.refresh();
            var jdbc=new JdbcTemplate(source);var tx=new TransactionTemplate(context.getBean(TransactionManagers.JPA,JpaTransactionManager.class));
            var identities=context.getBean(DevelopmentSeedJpaRepository.class);
            try(var session=driver.session(SessionConfig.forDatabase("neo4j"))) {
                preflight(f,jdbc,identities,session,args[0].equals("verify"));
                if(args[0].equals("apply")) {
                    String password=setting("COUNCIL_EMPLOYEE_PASSWORD");need(password.length()>=12,"Employee demo password must have at least 12 characters");
                    tx.executeWithoutResult(status->{
                        jdbc.queryForList("SELECT pg_advisory_xact_lock(hashtextextended('COUNCIL_DEMO_V1',0))");
                        var prior=jdbc.queryForList("SELECT resource_revision FROM platform.audit_event WHERE audit_event_id=?",receiptId());
                        need(prior.isEmpty() || hash.equals(prior.getFirst().get("resource_revision")),"Seed receipt hash differs; no overwrite");
                        accounts(f,identities,password);
                        modules(f,jdbc);
                        bank(f,context,tx);
                        // Separate stores have no distributed commit. Exact graph checks make a retry safe after a partial failure.
                        session.executeWrite(g->{ graph(f,g,true);return null; });
                        if(prior.isEmpty())jdbc.update("INSERT INTO platform.audit_event(audit_event_id,service_name,action,resource_id,resource_revision,occurred_at,outcome,correlation_id) VALUES (?,'COUNCIL_DEMO_SEED','DEVELOPMENT_SEED_APPLIED',?,?,now(),'SUCCEEDED',?)",receiptId(),ORG,hash,receiptId());
                    });
                }
                if(!args[0].equals("check"))preflight(f,jdbc,identities,session,true);
                System.out.println("Council seed "+args[0]+" passed. No learner results, progress, pathways or human decisions were seeded.");
            }
        }
    }

    static void validate(JsonNode f) throws Exception {
        need(SOURCE.equals(f.path("format").asText()) && f.path("developmentOnly").asBoolean() && ORG.equals(uuid(f,"organizationId")),"Unexpected demo fixture");
        need(f.path("items").size()==15 && f.path("modules").size()==4 && f.path("learners").size()==11,"Fixture inventory mismatch");
        var ids=new HashSet<String>();
        for(var node:f.path("nodes")) {
            need(LABELS.contains(node.path("label").asText()),"Unsupported graph label");
            var p=node.path("properties");need(ids.add(p.path("id").asText()) && ORG.toString().equals(p.path("organizationId").asText()) && SOURCE.equals(p.path("fixtureSource").asText()),"Duplicate or foreign graph node");
        }
        for(var e:f.path("relationships"))need(TYPES.contains(e.path("type").asText()) && ids.contains(e.path("fromId").asText()) && ids.contains(e.path("toId").asText()),"Invalid graph edge");
        for(var row:f.path("modules")) {
            var doc=JSON.treeToValue(row,ModuleAuthoring.Document.class);var p=doc.released().payload();
            need(doc.everReleased() && !doc.archived() && p.teachings().size()==1 && p.content().lessons().size()==1 && p.content().lessons().getFirst().complete(),"Module content is not complete");
        }
        var candidates=new ArrayList<Candidate>();var itemIds=new HashSet<UUID>();
        for(var row:f.path("items")) {
            var c=JSON.treeToValue(row.path("content"),Content.class);
            need(itemIds.add(uuid(row,"versionId")) && c.options().size()==4 && c.correctAnswer()==(c.skillId().equals("MS-DEMO-05")?0:1),"Question identity/answer convention changed");
            candidates.add(new Candidate(uuid(row,"versionId"),new Requirement(c.skillId(),KnowledgeLevel.valueOf(c.knowledgeLevel()),List.of()),null,c.mandatory(),c.prompt(),
                java.util.stream.IntStream.range(0,4).mapToObj(i->new Option(""+(char)('A'+i),c.options().get(i))).toList(),""+(char)('A'+c.correctAnswer()),"demo-content","demo-mapping"));
        }
        for(int iteration=0;iteration<10;iteration++)for(var p:f.path("policies")) {
            var purpose=Purpose.valueOf(p.path("purpose").asText());var policy=JSON.treeToValue(p.path("configuration"),Policy.class);var groups=new ArrayList<Group>();
            for(int n=0;n<policy.groups().size();n++) {
                var rule=policy.groups().get(n);var requirement=new Requirement(rule.skillId(),rule.knowledgeLevel(),List.of());
                groups.add(RuleAssessment.select(requirement,purpose==Purpose.BASELINE?GroupRole.TARGET:n==0?GroupRole.MAIN:GroupRole.PREREQUISITE,rule,candidates,new Random(iteration*31L+n)));
            }
            boolean baseline=purpose==Purpose.BASELINE;String answer=baseline||p.path("ownerId").asText().equals("MS-DEMO-05")?"A":"B";
            var answers=new HashMap<UUID,String>();groups.forEach(g->g.items().forEach(i->answers.put(i.itemVersionId(),answer)));
            var now=Instant.parse("2026-11-18T00:00:00Z");var scored=RuleAssessment.score(new Paper(purpose,groups,now,now.plusSeconds(policy.timeLimitSeconds())),answers);
            for(var result:scored)need(result.correctCount()==(result.requirement().skillId().equals("MS-DEMO-05")==answer.equals("A")?3:0),"Unexpected fixed-answer score");
            var decision=RuleAssessmentDecision.decide(purpose,scored,Set.of(),Set.of(),false);
            need(decision.state()==(baseline?RuleAssessmentDecision.State.BASELINE_RECORDED:p.path("ownerId").asText().equals("MS-DEMO-02")?RuleAssessmentDecision.State.WAITING_SUPPLEMENT:RuleAssessmentDecision.State.READY),"Unexpected downstream decision");
        }
        System.out.println("Actual Java values/scorer: 10/10 fixed-answer runs passed; baseline 12, A 3, B 6, P 3 questions.");
    }

    static void preflight(JsonNode f,JdbcTemplate jdbc,DevelopmentSeedJpaRepository identities,Session session,boolean complete) {
        need(identities.activeOrganizationExists(ORG,"TECHNOVA"),"Active TechNova development workspace required");
        need(identities.activeMemberWithRole(uuid(f,"managerId"),ORG,"LD_MANAGER") && identities.activeMemberWithRole(uuid(f,"expertId"),ORG,"DOMAIN_EXPERT"),"Expected active L&D/Expert required");
        need(jdbc.queryForObject("SELECT count(*) FROM platform.organization_workspace WHERE organization_id=? AND setup_state='READY'",Long.class,ORG)==1,"Ready workspace required");
        session.executeRead(g->{graph(f,g,false);if(complete) {
            for(var n:f.path("nodes"))need(g.run("MATCH (n {id:$id}) RETURN count(n) AS n",Map.of("id",n.path("properties").path("id").asText())).single().get("n").asLong()==1,"Missing demo node");
            for(var e:f.path("relationships"))need(g.run("MATCH ()-[r {id:$id}]->() RETURN count(r) AS n",Map.of("id",e.path("properties").path("id").asText())).single().get("n").asLong()==1,"Missing demo edge");
        }return null;});
        for(var row:f.path("modules")) {
            var existing=jdbc.queryForList("SELECT organization_id,document::text AS document FROM platform.module_authoring WHERE module_id=?",row.path("id").asText());
            if(!existing.isEmpty())try{need(ORG.toString().equals(existing.getFirst().get("organization_id")) && same(JSON.readTree((String)existing.getFirst().get("document")),row),"Preserve changed/foreign module document: "+row.path("id").asText());}catch(java.io.IOException e){throw new IllegalStateException(e);}
            need(!complete || existing.size()==1,"Missing module document");
        }
        if(complete)for(var learner:f.path("learners"))need(identities.activeEmployeeMembershipRoles(uuid(learner,"membershipId"),uuid(learner,"id"),ORG,uuid(f,"departmentId"),uuid(f,"referenceId")).equals(List.of("EMPLOYEE")),"Missing learner membership");
        if(complete)for(var item:f.path("items"))need(jdbc.queryForObject("SELECT count(*) FROM platform.assessment_item_knowledge_mapping m JOIN platform.assessment_item_skill_scope s USING(item_version_id) JOIN platform.item_version i USING(item_version_id) WHERE m.item_version_id=? AND m.organization_id=? AND s.skill_version='0.12.1' AND i.publication_state='PUBLISHED'",Long.class,uuid(item,"versionId"),ORG)==1,"Missing exact published mapping");
    }

    static void graph(JsonNode f,TransactionContext g,boolean write) {
        for(var row:f.path("nodes")) {
            var p=props(row.path("properties"));var rows=g.run("MATCH (n {id:$id}) RETURN labels(n) AS labels,properties(n) AS props",Map.of("id",p.get("id"))).list();
            need(rows.size()<=1,"Duplicate graph node identity");
            if(!rows.isEmpty())need(rows.getFirst().get("labels").asList(Value::asString).contains(row.path("label").asText()) && same(rows.getFirst().get("props").asMap(),p),"Preserve changed/foreign node: "+p.get("id"));
            else if(write)g.run("CREATE (n:"+row.path("label").asText()+") SET n=$props",Map.of("props",p)).consume();
        }
        for(var row:f.path("relationships")) {
            var p=props(row.path("properties"));var rows=g.run("MATCH (a)-[r {id:$id}]->(b) RETURN a.id AS a,b.id AS b,type(r) AS type,properties(r) AS props",Map.of("id",p.get("id"))).list();
            need(rows.size()<=1,"Duplicate relationship identity");
            if(!rows.isEmpty())need(row.path("fromId").asText().equals(rows.getFirst().get("a").asString()) && row.path("toId").asText().equals(rows.getFirst().get("b").asString()) && row.path("type").asText().equals(rows.getFirst().get("type").asString()) && same(rows.getFirst().get("props").asMap(),p),"Preserve changed relationship");
            else if(write)g.run("MATCH (a {id:$a}),(b {id:$b}) CREATE (a)-[r:"+row.path("type").asText()+"]->(b) SET r=$props",Map.of("a",row.path("fromId").asText(),"b",row.path("toId").asText(),"props",p)).consume();
        }
    }

    static void accounts(JsonNode f,DevelopmentSeedJpaRepository data,String password) {
        var secrets=new RegistrationCryptography("","");var now=Instant.now();
        data.insertDepartmentIfAbsent(uuid(f,"departmentId"),ORG,"Council Demo — Development");
        data.insertJobPositionReferenceIfAbsent(uuid(f,"referenceId"),uuid(f,"jobPositionReferenceId"),ORG,uuid(f,"departmentId"),"Council Demo — Application Engineering");
        need(data.activeJobPositionReference(uuid(f,"referenceId"),uuid(f,"jobPositionReferenceId"),ORG,uuid(f,"departmentId"),"Council Demo — Application Engineering","Council Demo — Development"),"Reference drift");
        for(var row:f.path("learners")) {
            UUID account=uuid(row,"id"),member=uuid(row,"membershipId");String email=row.path("email").asText();
            data.insertAccountIfAbsent(account,ORG,email,email,secrets.hashPassword(password));var stored=data.accountState(account);
            need(stored.size()==1 && ORG.equals(stored.getFirst().organizationId()) && email.equals(stored.getFirst().identifier()) && Boolean.TRUE.equals(stored.getFirst().active()) && secrets.passwordMatches(password,stored.getFirst().passwordHash()),"Account drift; password not overwritten");
            data.insertProfileIfAbsent(account,row.path("name").asText(),now);
            data.insertEmployeeMembershipIfAbsent(member,account,ORG,uuid(f,"departmentId"),uuid(f,"referenceId"),now);data.insertMembershipRoleIfAbsent(member,"EMPLOYEE");
            need(data.activeEmployeeMembershipRoles(member,account,ORG,uuid(f,"departmentId"),uuid(f,"referenceId")).equals(List.of("EMPLOYEE")),"Learner membership drift");
            data.insertLearnerStateIfAbsent(account);
        }
    }
    static void modules(JsonNode f,JdbcTemplate jdbc) {
        for(var row:f.path("modules")) {
            var content=row.path("revisions").get(0).path("payload").path("content");
            var old=jdbc.queryForList("SELECT document::text AS document FROM platform.module_authoring_content WHERE organization_id=? AND content_id=?",ORG.toString(),content.path("id").asText());
            if(!old.isEmpty())try{need(same(JSON.readTree((String)old.getFirst().get("document")),content),"Preserve changed content");}catch(Exception e){throw new IllegalStateException(e);}
            jdbc.update("INSERT INTO platform.module_authoring_content(organization_id,content_id,document) VALUES(?,?,CAST(? AS jsonb)) ON CONFLICT DO NOTHING",ORG.toString(),content.path("id").asText(),encode(content));
            jdbc.update("INSERT INTO platform.module_authoring(organization_id,module_id,document) VALUES(?,?,CAST(? AS jsonb)) ON CONFLICT DO NOTHING",ORG.toString(),row.path("id").asText(),encode(row));
        }
    }
    static void bank(JsonNode f,AnnotationConfigApplicationContext context,TransactionTemplate tx) {
        var mapper=JSON.copy().addMixIn(Content.class,ContentEncoding.class);
        var emf=context.getBean(EntityManagerFactory.class);
        var store=new JpaQuestionBankStore(context.getBean(QuestionBankJpaRepository.class),context.getBean(ItemVersionJpaRepository.class),new PostgresAdvisoryLocks(SharedEntityManagerCreator.createSharedEntityManager(emf)),tx,mapper,context.getBean(AssessmentItemKnowledgeMappingJpaRepository.class));
        store.atomic(new Actor(uuid(f,"managerId"),ORG,"LD_MANAGER"),aggregate->{
            for(var row:f.path("items")) {
                UUID id=uuid(row,"id"),versionId=uuid(row,"versionId");Content content=mapper.convertValue(row.path("content"),Content.class);
                var existing=aggregate.questions.stream().filter(q->q.id.equals(id)).findFirst();
                if(existing.isPresent()) {need(!existing.get().retired && existing.get().versions.stream().anyMatch(v->v.id.equals(versionId) && "PUBLISHED".equals(v.state) && "DEVELOPMENT_SEED".equals(v.publicationSource) && content.equals(v.content)),"Preserve changed demo question");continue;}
                need(aggregate.questions.stream().flatMap(q->q.versions.stream()).noneMatch(v->v.id.equals(versionId)),"Item version collision");
                var q=new Question();q.id=id;q.sourceBankId=aggregate.id;q.code="Q-"+id.toString().toUpperCase(Locale.ROOT);q.owner=uuid(f,"expertId");q.createdBy=uuid(f,"managerId");q.createdAt=Instant.now();q.revision=1;
                var v=new Version();v.id=versionId;v.number=1;v.state="PUBLISHED";v.content=content;v.editedBy=uuid(f,"managerId");v.editedAt=q.createdAt;v.publicationSource="DEVELOPMENT_SEED";v.reason="COUNCIL_DEMO_V1 explicit synthetic publication; no human content review claimed.";
                q.versions.add(v);aggregate.questions.add(q);aggregate.history.add(new Audit(UUID.nameUUIDFromBytes((SOURCE+id).getBytes(StandardCharsets.UTF_8)),id,versionId,"DEVELOPMENT_SEED_PUBLISHED",uuid(f,"managerId"),q.createdAt,v.reason,null));
            }
            return null;
        });
    }
    @EnableTransactionManagement
    @EnableJpaRepositories(basePackages="com.adaptlearngraph.repository",transactionManagerRef=TransactionManagers.JPA)
    static class Persistence {
        @Bean LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource source) {
            var f=new LocalContainerEntityManagerFactoryBean();f.setDataSource(source);f.setPackagesToScan("com.adaptlearngraph.entities");f.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            f.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto","validate","hibernate.physical_naming_strategy","org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy","hibernate.implicit_naming_strategy","org.springframework.boot.orm.jpa.hibernate.SpringImplicitNamingStrategy"));return f;
        }
        @Bean(TransactionManagers.JPA) JpaTransactionManager transactionManager(EntityManagerFactory factory) {return new JpaTransactionManager(factory);}
    }
}
