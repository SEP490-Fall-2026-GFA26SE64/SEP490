package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.*;
import java.util.*;
import org.neo4j.driver.*;

/** Explicit synthetic catalog/content preconditions, never learner results. Only the isolated UI stack ports. */
public final class WF05UiFixtureTool {
    static final String ORG="e0000000-0000-0000-0000-000000000001",EXPERT="a0000000-0000-0000-0000-000000000002",MANAGER="a0000000-0000-0000-0000-000000000001";
    static final String JOB="OCC-15-1252.00",ROLE="WF05-UI-ROLE",LEVEL="WF05-UI-LEVEL",SKILL="WF05-UI-SKILL",TIME="2026-11-16T00:00:00Z";
    static final ObjectMapper JSON=new ObjectMapper().findAndRegisterModules();
    static UUID id(String label){return UUID.nameUUIDFromBytes(("WF05-UI-20261116:"+label).getBytes(java.nio.charset.StandardCharsets.UTF_8));}
    static int update(Connection db,String query,Object...args)throws Exception {try(var s=db.prepareStatement(query)){for(int i=0;i<args.length;i++)s.setObject(i+1,args[i]);return s.executeUpdate();}}
    public static void main(String[] args)throws Exception {
        Class.forName("org.postgresql.Driver");
        try(var db=DriverManager.getConnection("jdbc:postgresql://127.0.0.1:35532/wf05_ui","wf05","wf05-ui-isolated");
            var graph=GraphDatabase.driver("bolt://127.0.0.1:38687",AuthTokens.basic("neo4j","wf05-graph-isolated"))){
            try(var r=db.createStatement().executeQuery("SELECT current_database()")){r.next();if(!r.getString(1).equals("wf05_ui"))throw new IllegalStateException("Isolated UI DB required");}
            db.setAutoCommit(false);
            if(args.length>0){if(args[0].equals("certificate-p1"))seedCertificate(graph);else if(args[0].equals("staff-p1"))seedStaff(db,graph);else seedRun(db,graph,args[0]);db.commit();return;}
            UUID bank=id("bank");update(db,"INSERT INTO platform.question_bank(question_bank_id,name,created_by) VALUES (?,'WF05 synthetic UI bank',?) ON CONFLICT DO NOTHING",bank,UUID.fromString(EXPERT));
            update(db,"INSERT INTO platform.question_bank_scope(organization_id,question_bank_id) VALUES (?,?) ON CONFLICT DO NOTHING",UUID.fromString(ORG),bank);
            for(int i=1;i<=4;i++){UUID item=id("item-"+i);
                update(db,"INSERT INTO platform.item_version(item_version_id,item_id,version,question_bank_id,prompt,response_schema,protected_key,publication_state,content_hash,micro_skill_id,micro_skill_name_snapshot,difficulty) VALUES (?,?,1,?,?,'{\"options\":[{\"id\":\"A\",\"text\":\"WF05 correct answer\"},{\"id\":\"B\",\"text\":\"WF05 incorrect answer\"},{\"id\":\"C\",\"text\":\"Other C\"},{\"id\":\"D\",\"text\":\"Other D\"}]}'::jsonb,'{\"correctOptionId\":\"A\"}'::jsonb,'PUBLISHED',?,?,'WF05 Synthetic Skill','EASY') ON CONFLICT DO NOTHING",item,item,bank,"WF05 synthetic question "+i,"c".repeat(64),SKILL);
                update(db,"INSERT INTO platform.assessment_item_knowledge_mapping(item_version_id,organization_id,question_bank_id,skill_id,knowledge_level,outcome_code,mandatory,mapping_version,mapping_hash) VALUES (?,?,?,?,'FOUNDATION',NULL,false,1,?) ON CONFLICT DO NOTHING",item,UUID.fromString(ORG),bank,SKILL,"d".repeat(64));
                update(db,"INSERT INTO platform.assessment_item_skill_scope(item_version_id,skill_version,source) VALUES (?,'wf05-v1','PUBLICATION') ON CONFLICT DO NOTHING",item);}
            for(String module:List.of("WF05-UI-A1","WF05-UI-A2")) {
                var metadata=new ModuleAuthoring.Metadata(module,"0.12.0","ACTIVE","APPROVED",MANAGER,TIME);
                var lesson=new LearningContent.Lesson(module+"-lesson","WF05 short lesson","TEXT","WF05 synthetic learning example. Read this text and mark the lesson complete.","MARKDOWN",1,"MANUAL",null,null,null);
                var content=new ModuleAuthoring.Content(module+"-content","WF05 learning content",null,LearningContent.MANIFEST_TYPE,"wf05-content-v1",List.of(JOB),EXPERT,TIME,List.of(lesson));
                var teaching=new ModuleAuthoring.Teaching(new ModuleAuthoring.Metadata(module+"-teaches","0.12.0","ACTIVE","APPROVED",MANAGER,TIME),SKILL,"WF05 Synthetic Skill");
                var payload=new ModuleAuthoring.Package(metadata,"WF05 Module "+module.substring(module.length()-2),"LESSON_AND_PRACTICE",content.id(),LearningContent.MANIFEST_TYPE,content.contentVersion(),1,List.of(teaching),content,KnowledgeLevel.FOUNDATION,List.of(),"wf05-v1");
                var document=new ModuleAuthoring.Document(module,ORG,List.of(JOB),EXPERT,TIME,1,true,false,1,
                    List.of(new ModuleAuthoring.Revision(1,"RELEASED",payload,EXPERT,TIME,MANAGER,TIME,"Synthetic fixture precondition; not a human review")),List.of());
                update(db,"INSERT INTO platform.module_authoring(organization_id,module_id,document) VALUES (?,?,CAST(? AS jsonb)) ON CONFLICT DO NOTHING",ORG,module,JSON.writeValueAsString(document));
                update(db,"INSERT INTO platform.module_authoring_content(organization_id,content_id,document) VALUES (?,?,CAST(? AS jsonb)) ON CONFLICT DO NOTHING",ORG,content.id(),JSON.writeValueAsString(content));
            }
            try(var session=graph.session()) {session.executeWrite(tx->{
                var properties=Map.of("organizationId",ORG,"version","wf05-v1","status","ACTIVE","reviewStatus","APPROVED","reviewedBy",MANAGER,"reviewedAt",TIME);
                tx.run("MERGE (j:JobPosition {id:$job,organizationId:$org}) SET j += $props,j.code='15-1252.00',j.name='Software Developers' MERGE (r:TargetRole {id:$role,organizationId:$org}) SET r += $props,r.code='WF05-UI-ROLE',r.name='WF05 Synthetic Target',r.scope='Isolated P1 UI fixture',r.assignedExpertId=$expert MERGE (l:Level {id:$level,organizationId:$org}) SET l += $props,l.code='WF05-L1',l.name='WF05 Level',l.rank=1,l.duration='3 months' MERGE (s:MicroSkill {id:$skill,organizationId:$org}) SET s += $props,s.code='WF05-S1',s.name='WF05 Synthetic Skill',s.moduleOnlyKnowledgeLevels=['FOUNDATION'],s.certificateOnlyKnowledgeLevels=[] MERGE (j)-[m:HAS_ROLE]->(r) SET m += $props,m.id='WF05-UI-HAS-ROLE' MERGE (r)-[h:HAS_LEVEL]->(l) SET h += $props,h.id='WF05-UI-HAS-LEVEL' MERGE (l)-[q:REQUIRES_SKILL]->(s) SET q += $props,q.id='WF05-UI-REQUIRES',q.requiredKnowledgeLevels=['FOUNDATION'],q.isMandatory=true",Map.of("job",JOB,"org",ORG,"role",ROLE,"level",LEVEL,"skill",SKILL,"expert",EXPERT,"props",properties)).consume();
                for(String module:List.of("WF05-UI-A1","WF05-UI-A2"))tx.run("MATCH (s:MicroSkill {id:$skill,organizationId:$org}) MERGE (m:LearningModule {id:$module,organizationId:$org}) SET m += $props,m.version='0.12.0',m.title=$title,m.name=$title,m.contentVersion='wf05-content-v1',m.knowledgeLevel='FOUNDATION',m.skillVersion='wf05-v1',m.duration=1 MERGE (m)-[t:TEACHES]->(s) SET t += $props,t.id=$edge,t.version='0.12.0'",Map.of("skill",SKILL,"org",ORG,"module",module,"title","WF05 Module "+module.substring(module.length()-2),"edge",module+"-teaches","props",properties)).consume();
                return null;});}
            db.commit();System.out.println(JSON.writeValueAsString(Map.of("source","WF05UiFixtureTool synthetic preconditions","organizationId",ORG,"roleId",ROLE,"levelId",LEVEL,"skillId",SKILL,"modules",List.of("WF05-UI-A1","WF05-UI-A2"),"bankId",bank,"learnerResultsCreated",false)));
        }
    }
    /** Five fixed role examples, two independent learners each; no attempts, results or pathway records. */
    static void seedRun(Connection db,org.neo4j.driver.Driver graph,String run)throws Exception {
        if(!run.matches("[a-z0-9-]{4,32}"))throw new IllegalArgumentException("Explicit fixture run label required");
        var password=new com.adaptlearngraph.utility.RegistrationCryptography("", "").hashPassword("Password123!");
        var learners=new ArrayList<Map<String,Object>>();
        int examples=run.startsWith("e01-")?1:5,repetitions=run.startsWith("e01-")?1:2;
        for(int example=1;example<=examples;example++) {
            String role="WF05-"+run+"-R"+example,level=role+"-L1";
            try(var session=graph.session()){session.executeWrite(tx->{
                tx.run("MATCH (j:JobPosition {id:$job,organizationId:$org}),(base:TargetRole {id:$base,organizationId:$org}),(bl:Level {id:$bl,organizationId:$org}),(s:MicroSkill {id:$skill,organizationId:$org}) MERGE (r:TargetRole {id:$role,organizationId:$org}) SET r=properties(base),r.id=$role,r.code=$role,r.name=$role MERGE (l:Level {id:$level,organizationId:$org}) SET l=properties(bl),l.id=$level,l.code=$level MERGE (j)-[h:HAS_ROLE]->(r) SET h=properties(base),h.id=$role+'-has-role' MERGE (r)-[v:HAS_LEVEL]->(l) SET v=properties(bl),v.id=$role+'-has-level' MERGE (l)-[q:REQUIRES_SKILL]->(s) SET q=properties(bl),q.id=$role+'-requires',q.requiredKnowledgeLevels=['FOUNDATION'],q.isMandatory=true",Map.of("job",JOB,"org",ORG,"base",ROLE,"bl",LEVEL,"skill",SKILL,"role",role,"level",level)).consume();return null;});}
            for(int repetition=1;repetition<=repetitions;repetition++) {
                String label=run+"-e"+example+"-"+repetition,email=label+"@wf05.invalid";
                UUID account=id(label),membership=id(label+"-membership");
                update(db,"INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING",account,UUID.fromString(ORG),email,email,password);
                update(db,"INSERT INTO platform.workspace_account_profile(account_id,full_name,email_verified_at,auth_version,recovery_required) VALUES (?,?,now(),0,false) ON CONFLICT DO NOTHING",account,"WF05 "+label);
                update(db,"INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,department_id,job_position_reference_id,created_at,updated_at) VALUES (?,?,?,true,'d0000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000001',now(),now()) ON CONFLICT DO NOTHING",membership,account,UUID.fromString(ORG));
                update(db,"INSERT INTO platform.organization_membership_role(membership_id,role_code) VALUES (?,'EMPLOYEE') ON CONFLICT DO NOTHING",membership);
                learners.add(Map.of("example",example,"repetition",repetition,"email",email,"accountId",account,"roleId",role,"levelId",level,"requirements",1,"eligibleModules",2));
            }
        }
        System.out.println(JSON.writeValueAsString(Map.of("run",run,"learners",learners,"learnerResultsCreated",false)));
    }
    static void seedCertificate(org.neo4j.driver.Driver graph){
        try(var session=graph.session()){session.executeWrite(tx->{tx.run("MATCH (j:JobPosition {id:$job,organizationId:$org}),(base:TargetRole {id:$base,organizationId:$org}),(bl:Level {id:$bl,organizationId:$org}),(bs:MicroSkill {id:$bs,organizationId:$org}) MERGE (r:TargetRole {id:'WF05-CERT-ROLE',organizationId:$org}) SET r=properties(base),r.id='WF05-CERT-ROLE',r.code=r.id,r.name='WF05 Certificate Target' MERGE (l:Level {id:'WF05-CERT-LEVEL',organizationId:$org}) SET l=properties(bl),l.id='WF05-CERT-LEVEL',l.code=l.id MERGE (s:MicroSkill {id:'WF05-CERT-SKILL',organizationId:$org}) SET s=properties(bs),s.id='WF05-CERT-SKILL',s.code=s.id,s.name='WF05 Certificate Skill',s.moduleOnlyKnowledgeLevels=[],s.certificateOnlyKnowledgeLevels=['FOUNDATION'] MERGE (j)-[h:HAS_ROLE]->(r) SET h=properties(base),h.id='WF05-CERT-has-role' MERGE (r)-[v:HAS_LEVEL]->(l) SET v=properties(bl),v.id='WF05-CERT-has-level' MERGE (l)-[q:REQUIRES_SKILL]->(s) SET q=properties(bl),q.id='WF05-CERT-requires',q.requiredKnowledgeLevels=['FOUNDATION'],q.isMandatory=true",Map.of("job",JOB,"org",ORG,"base",ROLE,"bl",LEVEL,"bs",SKILL)).consume();return null;});}
        System.out.println("WF05 certificate-only catalog preconditions created; no certificate definition, evidence or learner results seeded");
    }
    static void seedStaff(Connection db,org.neo4j.driver.Driver graph)throws Exception {
        var password=new com.adaptlearngraph.utility.RegistrationCryptography("", "").hashPassword("Password123!");
        for(String name:List.of("expert2","unassigned")){
            UUID account=id(name),membership=id(name+"-membership");String email=name+"@wf05.invalid";
            update(db,"INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING",account,UUID.fromString(ORG),email,email,password);
            update(db,"INSERT INTO platform.workspace_account_profile(account_id,full_name,email_verified_at,auth_version,recovery_required) VALUES (?,?,now(),0,false) ON CONFLICT DO NOTHING",account,"WF05 "+name);
            update(db,"INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,created_at,updated_at) VALUES (?,?,?,true,now(),now()) ON CONFLICT DO NOTHING",membership,account,UUID.fromString(ORG));
            update(db,"INSERT INTO platform.organization_membership_role(membership_id,role_code) VALUES (?,'DOMAIN_EXPERT') ON CONFLICT DO NOTHING",membership);
        }
        try(var session=graph.session()){session.executeWrite(tx->{tx.run("MATCH (j:JobPosition {id:$job,organizationId:$org}),(base:TargetRole {id:$base,organizationId:$org}),(bl:Level {id:$bl,organizationId:$org}),(s:MicroSkill {id:$skill,organizationId:$org}) MERGE (r:TargetRole {id:'WF05-EXPERT2-ROLE',organizationId:$org}) SET r=properties(base),r.id='WF05-EXPERT2-ROLE',r.code=r.id,r.name=r.id,r.assignedExpertId=$expert MERGE (l:Level {id:'WF05-EXPERT2-LEVEL',organizationId:$org}) SET l=properties(bl),l.id='WF05-EXPERT2-LEVEL',l.code=l.id MERGE (j)-[h:HAS_ROLE]->(r) SET h=properties(base),h.id='WF05-EXPERT2-has-role' MERGE (r)-[v:HAS_LEVEL]->(l) SET v=properties(bl),v.id='WF05-EXPERT2-has-level' MERGE (l)-[q:REQUIRES_SKILL]->(s) SET q=properties(bl),q.id='WF05-EXPERT2-requires',q.requiredKnowledgeLevels=['FOUNDATION'],q.isMandatory=true",Map.of("job",JOB,"org",ORG,"base",ROLE,"bl",LEVEL,"skill",SKILL,"expert",id("expert2").toString())).consume();return null;});}
        System.out.println("Synthetic assigned Expert2 and unassigned Expert created, no learner history changed");
    }
}
