package com.adaptlearngraph.repository;

import com.adaptlearngraph.dtos.DemoResetResultDto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.minio.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import org.neo4j.driver.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Explicitly gated isolated-demo fixture. PostgreSQL, graph and private objects form one checkpoint. */
public final class DemoCheckpointStore {
    private final JdbcTemplate jdbc;private final Driver graph;private final MinioClient files;private final String bucket;
    private final ObjectMapper json;private final Path directory;private final TransactionTemplate tx;private final String captureToken;
    public DemoCheckpointStore(JdbcTemplate jdbc,Driver graph,MinioClient files,String bucket,ObjectMapper json,String directory,String isolation,String captureToken) {
        if(!"brightpath-8099".equals(isolation) || !"brightpath-demo-private".equals(bucket) || captureToken.length()<24)
            throw new IllegalStateException("Explicit isolated Brightpath checkpoint settings required");
        this.jdbc=jdbc;this.graph=Objects.requireNonNull(graph);this.files=Objects.requireNonNull(files);this.bucket=bucket;this.json=json;
        this.directory=Path.of(directory).toAbsolutePath().normalize();this.captureToken=captureToken;
        this.tx=new TransactionTemplate(new DataSourceTransactionManager(jdbc.getDataSource()));
        if(!"brightpath_demo".equals(jdbc.queryForObject("SELECT current_database()",String.class)))throw new IllegalStateException("Checkpoint requires dedicated brightpath_demo database");
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS demo_checkpoint");
        jdbc.execute("CREATE TABLE IF NOT EXISTS demo_checkpoint.control (id boolean PRIMARY KEY DEFAULT true CHECK(id), state text NOT NULL, schema_hash text, last_key text)");
        jdbc.execute("ALTER TABLE demo_checkpoint.control ADD COLUMN IF NOT EXISTS outcome text");
        jdbc.execute("ALTER TABLE demo_checkpoint.control ADD COLUMN IF NOT EXISTS checkpoint_id text NOT NULL DEFAULT 'BRIGHTPATH_END_SECTION_3'");
        jdbc.execute("ALTER TABLE demo_checkpoint.control ADD COLUMN IF NOT EXISTS manifest_file text NOT NULL DEFAULT 'checkpoint.json'");
    }
    private static String id(String name){return "\""+name.replace("\"","\"\"")+"\"";}
    private List<String> tables(){return jdbc.queryForList("SELECT tablename FROM pg_tables WHERE schemaname='platform' ORDER BY tablename",String.class);}
    private String schemaHash(){return jdbc.queryForObject("SELECT md5(string_agg(table_name||':'||column_name||':'||data_type||':'||udt_name,',' ORDER BY table_name,ordinal_position)) FROM information_schema.columns WHERE table_schema='platform'",String.class);}
    public String state(){return jdbc.query("SELECT state FROM demo_checkpoint.control WHERE id=true",(r,n)->r.getString(1)).stream().findFirst().orElse("NOT_CAPTURED");}
    public String checkpoint(){return jdbc.query("SELECT checkpoint_id FROM demo_checkpoint.control WHERE id=true",(r,n)->r.getString(1)).stream().findFirst().orElse("BRIGHTPATH_END_SECTION_3");}
    public boolean restoring(){return Set.of("RESTORING","FAILED","CAPTURING").contains(state());}
    public void authorizeFixture(String token) {
        if(!java.security.MessageDigest.isEqual(captureToken.getBytes(java.nio.charset.StandardCharsets.UTF_8),Objects.toString(token,"").getBytes(java.nio.charset.StandardCharsets.UTF_8)))throw new SecurityException("Checkpoint capture token required");
    }
    public synchronized void capture(String token) {
        authorizeFixture(token);
        boolean first="NOT_CAPTURED".equals(state());
        boolean retry="FAILED".equals(state()) && jdbc.queryForObject("SELECT schema_hash IS NULL FROM demo_checkpoint.control WHERE id=true",Boolean.class);
        if(!first && !retry)throw new IllegalStateException("Checkpoint already captured; preserve its provenance");
        if(jdbc.queryForObject("SELECT count(*) FROM platform.organization WHERE lower(code)='brightpath'",Integer.class)!=1)throw new IllegalStateException("Brightpath onboarding checkpoint required");
        if(first)jdbc.update("INSERT INTO demo_checkpoint.control(id,state) VALUES(true,'CAPTURING')");
        else jdbc.update("UPDATE demo_checkpoint.control SET state='CAPTURING' WHERE id=true");
        try {
            Files.createDirectories(directory);
            var snapshot=new LinkedHashMap<String,Object>();snapshot.put("provenance","Brightpath fixture: end of Demo section 3; no learner achievements");snapshot.put("capturedAt",Instant.now().toString());snapshot.put("schemaHash",schemaHash());
            try(var session=graph.session()) {
                snapshot.put("nodes",session.executeRead(g->g.run("MATCH(n) RETURN elementId(n) AS key,labels(n) AS labels,properties(n) AS props LIMIT 20001").list(r->Map.of("key",r.get("key").asString(),"labels",r.get("labels").asList(Value::asString),"props",encode(r.get("props"))))));
                snapshot.put("edges",session.executeRead(g->g.run("MATCH(a)-[r]->(b) RETURN elementId(a) AS source,elementId(b) AS target,type(r) AS type,properties(r) AS props LIMIT 100001").list(r->Map.of("source",r.get("source").asString(),"target",r.get("target").asString(),"type",r.get("type").asString(),"props",encode(r.get("props"))))));
            }
            if(((List<?>)snapshot.get("nodes")).size()>20000 || ((List<?>)snapshot.get("edges")).size()>100000)throw new IllegalStateException("Checkpoint graph capacity exceeded");
            var objects=new ArrayList<Map<String,Object>>();
            if(files.bucketExists(BucketExistsArgs.builder().bucket(bucket).build()))for(var result:files.listObjects(ListObjectsArgs.builder().bucket(bucket).recursive(true).build())) {
                var name=result.get().objectName();var stat=files.statObject(StatObjectArgs.builder().bucket(bucket).object(name).build());
                if(stat.size()>20_000_000 || objects.size()>1000)throw new IllegalStateException("Checkpoint file capacity exceeded");
                try(var in=files.getObject(GetObjectArgs.builder().bucket(bucket).object(name).build())){objects.add(Map.of("name",name,"contentType",Objects.toString(stat.contentType(),"application/octet-stream"),"bytes",Base64.getEncoder().encodeToString(in.readAllBytes())));}
            }
            snapshot.put("objects",objects);
            Path temporary=directory.resolve("checkpoint.pending.json"),target=directory.resolve("checkpoint.json");
            Files.writeString(temporary,json.writeValueAsString(snapshot));Files.move(temporary,target,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);
            tx.executeWithoutResult(status->{
                var names=tables();lock(names);
                for(var name:names)jdbc.execute("CREATE TABLE demo_checkpoint."+id(name)+" AS TABLE platform."+id(name));
                // Tokens and transient sessions are never retained as checkpoint login state.
                for(var name:names)if(name.contains("session") || name.contains("token") || name.equals("registration_rate_limit"))jdbc.execute("TRUNCATE demo_checkpoint."+id(name));
                jdbc.update("UPDATE demo_checkpoint.control SET state='READY',schema_hash=?,last_key=NULL WHERE id=true",schemaHash());
            });
        }catch(Exception failure){jdbc.update("UPDATE demo_checkpoint.control SET state='FAILED' WHERE id=true");throw new IllegalStateException("Checkpoint capture incomplete; runtime remains unavailable",failure);}
    }
    private void lock(List<String> names){jdbc.execute("LOCK TABLE "+String.join(",",names.stream().map(n->"platform."+id(n)).toList())+" IN ACCESS EXCLUSIVE MODE");}
    /** Rewind a copy of the real completed baseline, retaining a full recovery snapshot of current work. */
    public synchronized void captureBaseline(String token,UUID attempt) {
        authorizeFixture(token);
        if("BRIGHTPATH_END_STEP_8_7".equals(checkpoint()) && "READY".equals(state()))return;
        if(!"READY".equals(state()) || attempt==null)throw new IllegalStateException("Ready checkpoint and completed baseline required");
        if(jdbc.queryForObject("SELECT count(*) FROM platform.organization",Integer.class)!=1)throw new IllegalStateException("Rewind requires the single isolated Brightpath fixture");
        var baseline=jdbc.queryForList("""
                SELECT a.learner_id,a.finished_at,a.selection_id,a.selection_revision FROM platform.rule_assessment_attempt a
                JOIN platform.organization o ON o.organization_id=a.organization_id JOIN platform.account u ON u.account_id=a.learner_id
                WHERE a.id=? AND a.purpose='BASELINE' AND a.state='FINALIZED' AND a.processing_status='PROCESSED'
                  AND lower(o.code)='brightpath' AND lower(u.normalized_identifier)='proteccmee@gmail.com'
                  AND EXISTS(SELECT 1 FROM platform.employee_role_selection s WHERE s.selection_id=a.selection_id AND s.target_revision=a.selection_revision AND s.ended_at IS NULL)
                """,attempt);
        if(baseline.size()!=1)throw new IllegalStateException("Use James's processed current baseline");
        UUID learner=(UUID)baseline.getFirst().get("learner_id");var finished=baseline.getFirst().get("finished_at");
        for(String table:List.of("rule_assessment_attempt","initial_pathway_request","certificate_submission","learning_lesson_progress"))
            if(jdbc.queryForObject("SELECT count(*) FROM platform."+id(table)+" WHERE learner_id::text<>?",Integer.class,learner.toString())!=0)throw new IllegalStateException("Preserve other learners before rewinding");
        if(!Objects.equals(jdbc.queryForObject("SELECT schema_hash FROM demo_checkpoint.control WHERE id=true",String.class),schemaHash()))throw new IllegalStateException("Checkpoint schema changed");
        String generation=UUID.randomUUID().toString().replace("-","");String archive="demo_before_8_7_"+generation;
        String manifest="checkpoint-step-8-7-"+generation+".json";
        jdbc.update("UPDATE demo_checkpoint.control SET state='CAPTURING' WHERE id=true");
        try {
            // Archive the previous reset target and current graph/storage without exposing their contents.
            String previous=jdbc.queryForObject("SELECT manifest_file FROM demo_checkpoint.control WHERE id=true",String.class);
            Files.copy(directory.resolve(previous),directory.resolve("previous-target-"+generation+".json"));
            var snapshot=new LinkedHashMap<String,Object>();snapshot.put("provenance","User-requested rewind of actual Brightpath data to end of step 8.7");
            snapshot.put("capturedAt",Instant.now().toString());snapshot.put("schemaHash",schemaHash());snapshot.put("baselineAttemptId",attempt.toString());
            try(var session=graph.session()) {
                snapshot.put("nodes",session.executeRead(g->g.run("MATCH(n) RETURN elementId(n) AS key,labels(n) AS labels,properties(n) AS props LIMIT 20001").list(r->Map.of("key",r.get("key").asString(),"labels",r.get("labels").asList(Value::asString),"props",encode(r.get("props"))))));
                snapshot.put("edges",session.executeRead(g->g.run("MATCH(a)-[r]->(b) RETURN elementId(a) AS source,elementId(b) AS target,type(r) AS type,properties(r) AS props LIMIT 100001").list(r->Map.of("source",r.get("source").asString(),"target",r.get("target").asString(),"type",r.get("type").asString(),"props",encode(r.get("props"))))));
            }
            if(((List<?>)snapshot.get("nodes")).size()>20000 || ((List<?>)snapshot.get("edges")).size()>100000)throw new IllegalStateException("Checkpoint graph capacity exceeded");
            var objects=new ArrayList<Map<String,Object>>();
            if(files.bucketExists(BucketExistsArgs.builder().bucket(bucket).build()))for(var result:files.listObjects(ListObjectsArgs.builder().bucket(bucket).recursive(true).build())) {
                var name=result.get().objectName();var stat=files.statObject(StatObjectArgs.builder().bucket(bucket).object(name).build());
                if(stat.size()>20_000_000 || objects.size()>1000)throw new IllegalStateException("Checkpoint file capacity exceeded");
                try(var in=files.getObject(GetObjectArgs.builder().bucket(bucket).object(name).build())){objects.add(Map.of("name",name,"contentType",Objects.toString(stat.contentType(),"application/octet-stream"),"bytes",Base64.getEncoder().encodeToString(in.readAllBytes())));}
            }
            snapshot.put("objects",objects);Files.writeString(directory.resolve("before-step-8-7-"+generation+".json"),json.writeValueAsString(snapshot));
            tx.executeWithoutResult(status->{
                var names=tables();lock(names);jdbc.execute("CREATE SCHEMA "+id(archive));jdbc.execute("CREATE SCHEMA "+id(archive+"_previous"));
                for(String name:names) {
                    jdbc.execute("CREATE TABLE "+id(archive)+"."+id(name)+" AS TABLE platform."+id(name));
                    jdbc.execute("CREATE TABLE "+id(archive+"_previous")+"."+id(name)+" AS TABLE demo_checkpoint."+id(name));
                    jdbc.execute("TRUNCATE demo_checkpoint."+id(name));jdbc.execute("INSERT INTO demo_checkpoint."+id(name)+" SELECT * FROM platform."+id(name));
                    if(name.contains("session") || name.contains("token") || name.equals("registration_rate_limit")) {
                        jdbc.execute("TRUNCATE demo_checkpoint."+id(name));jdbc.execute("TRUNCATE "+id(archive)+"."+id(name));
                    }
                }
                var removedObjects=new HashSet<>(jdbc.queryForList("SELECT private_object_key FROM demo_checkpoint.certificate_submission_attachment WHERE private_object_key IS NOT NULL",String.class));
                var clear=Set.of("skill_knowledge_evidence","skill_knowledge_review","learning_completion_requirement","learning_lesson_progress","learning_module_completion","learning_resume","learning_self_study","learning_version_switch","manual_learning_pathway","module_learning_pin");
                for(String name:names)if(name.startsWith("initial_pathway_") && !name.equals("initial_pathway_receipt") || name.startsWith("pathway_requirement_") || name.startsWith("certificate_submission") || clear.contains(name))jdbc.execute("TRUNCATE demo_checkpoint."+id(name));
                jdbc.update("DELETE FROM demo_checkpoint.initial_pathway_receipt WHERE created_at>?",finished);
                for(String name:List.of("rule_assessment_answer","rule_assessment_group","rule_assessment_group_result","rule_assessment_item"))jdbc.update("DELETE FROM demo_checkpoint."+id(name)+" WHERE attempt_id<>?",attempt);
                jdbc.update("DELETE FROM demo_checkpoint.rule_assessment_attempt WHERE id<>?",attempt);
                jdbc.update("DELETE FROM demo_checkpoint.rule_assessment_command WHERE created_at>? AND resource<>?",finished,attempt.toString());
                jdbc.update("DELETE FROM demo_checkpoint.processing_job WHERE created_at>? AND event_id NOT IN (SELECT event_id FROM demo_checkpoint.outbox_event WHERE aggregate_id=?)",finished,attempt);
                jdbc.update("DELETE FROM demo_checkpoint.outbox_event WHERE created_at>? AND aggregate_id<>?",finished,attempt);
                jdbc.execute("DELETE FROM demo_checkpoint.processing_receipt WHERE event_id NOT IN (SELECT event_id FROM demo_checkpoint.outbox_event)");
                jdbc.update("DELETE FROM demo_checkpoint.learning_notification WHERE created_at>?",finished);
                jdbc.update("DELETE FROM demo_checkpoint.audit_event WHERE occurred_at>? AND resource_id IS DISTINCT FROM ?",finished,attempt);
                objects.removeIf(object->removedObjects.contains(object.get("name")));
                try{Files.writeString(directory.resolve(manifest),json.writeValueAsString(snapshot));}catch(Exception failure){throw new IllegalStateException(failure);}
                jdbc.update("UPDATE demo_checkpoint.control SET state='READY',checkpoint_id='BRIGHTPATH_END_STEP_8_7',manifest_file=?,last_key=NULL,outcome=NULL WHERE id=true",manifest);
            });
        }catch(Exception failure){jdbc.update("UPDATE demo_checkpoint.control SET state='READY' WHERE id=true");throw new IllegalStateException("Baseline checkpoint capture incomplete; previous target retained for recovery",failure);}
    }
    @SuppressWarnings("unchecked") public synchronized DemoResetResultDto restore(String command) {
        if(command==null || !command.matches("[0-9a-fA-F-]{36}"))throw new IllegalArgumentException("Reset command UUID required");
        if("NOT_CAPTURED".equals(state()) || "CAPTURING".equals(state()))throw new IllegalStateException("Checkpoint not ready");
        var last=jdbc.queryForList("SELECT last_key FROM demo_checkpoint.control WHERE id=true",String.class);
        if("READY".equals(state()) && !last.isEmpty() && command.equals(last.getFirst()))return result();
        String expected=jdbc.queryForObject("SELECT schema_hash FROM demo_checkpoint.control WHERE id=true",String.class);
        if(!Objects.equals(expected,schemaHash()))throw new IllegalStateException("Schema changed; create a compatible checkpoint before restoring");
        jdbc.update("UPDATE demo_checkpoint.control SET state='RESTORING' WHERE id=true");
        try {
            String manifest=jdbc.queryForObject("SELECT manifest_file FROM demo_checkpoint.control WHERE id=true",String.class);
            Map<String,Object> saved=json.readValue(Files.readString(directory.resolve(manifest)),new TypeReference<>(){});
            if(!Objects.equals(expected,saved.get("schemaHash")))throw new IllegalStateException("Checkpoint manifest incompatible");
            int graphRemoved;
            try(var session=graph.session()){graphRemoved=Math.max(0,Math.toIntExact(session.run("MATCH(n) RETURN count(n) AS count").single().get("count").asLong())-((List<?>)saved.get("nodes")).size());}
            var originalObjects=new HashSet<String>();for(var object:(List<Map<String,Object>>)saved.get("objects"))originalObjects.add((String)object.get("name"));
            int filesRemoved=0;
            if(files.bucketExists(BucketExistsArgs.builder().bucket(bucket).build()))for(var object:files.listObjects(ListObjectsArgs.builder().bucket(bucket).recursive(true).build()))if(!originalObjects.contains(object.get().objectName()))filesRemoved++;
            final int removedGraph=graphRemoved,removedFiles=filesRemoved;
            tx.executeWithoutResult(status->{
                var names=tables();lock(names);jdbc.execute("SET LOCAL session_replication_role=replica");
                int related=0;for(var name:names)if(!Set.of("organization","account","organization_registration").contains(name))related=Math.addExact(related,removedRows(name));
                var outcome=new DemoResetResultDto(removedRows("organization"),removedRows("account"),removedRows("organization_registration"),related,
                        removedGraph,removedFiles,jdbc.queryForObject("SELECT count(*) FROM demo_checkpoint.organization",Integer.class),List.of(),checkpoint(),"/workspace/brightpath/login");
                // All names/columns originate in PostgreSQL metadata, never request fields.
                jdbc.execute("TRUNCATE "+String.join(",",names.stream().map(n->"platform."+id(n)).toList()));
                for(var name:names) {
                    var cols=jdbc.queryForList("SELECT column_name FROM information_schema.columns WHERE table_schema='platform' AND table_name=? AND is_generated='NEVER' ORDER BY ordinal_position",String.class,name);
                    String columns=String.join(",",cols.stream().map(DemoCheckpointStore::id).toList());
                    jdbc.execute("INSERT INTO platform."+id(name)+" ("+columns+") OVERRIDING SYSTEM VALUE SELECT "+columns+" FROM demo_checkpoint."+id(name));
                }
                restoreGraph((List<Map<String,Object>>)saved.get("nodes"),(List<Map<String,Object>>)saved.get("edges"));
                try {
                    if(!files.bucketExists(BucketExistsArgs.builder().bucket(bucket).build()))files.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                    for(var item:files.listObjects(ListObjectsArgs.builder().bucket(bucket).recursive(true).build()))files.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(item.get().objectName()).build());
                    for(var object:(List<Map<String,Object>>)saved.get("objects")) {
                        byte[] bytes=Base64.getDecoder().decode((String)object.get("bytes"));
                        files.putObject(PutObjectArgs.builder().bucket(bucket).object((String)object.get("name")).contentType((String)object.get("contentType")).stream(new java.io.ByteArrayInputStream(bytes),bytes.length,-1).build());
                    }
                }catch(Exception failed){throw new IllegalStateException("Private storage checkpoint restore failed",failed);}
                try{jdbc.update("UPDATE demo_checkpoint.control SET state='READY',last_key=?,outcome=? WHERE id=true",command,json.writeValueAsString(outcome));}
                catch(com.fasterxml.jackson.core.JsonProcessingException invalid){throw new IllegalStateException(invalid);}
            });
            // Readiness is checked after all stores finished. A failure leaves an explicit repair state.
            jdbc.queryForObject("SELECT 1",Integer.class);try(var s=graph.session()){s.run("RETURN 1").consume();}
            files.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());return result();
        }catch(Exception failure){jdbc.update("UPDATE demo_checkpoint.control SET state='FAILED' WHERE id=true");throw new IllegalStateException("Checkpoint restore incomplete; retry reset to recover",failure);}
    }
    private int removedRows(String table){return Math.max(0,jdbc.queryForObject("SELECT (SELECT count(*) FROM platform."+id(table)+")-(SELECT count(*) FROM demo_checkpoint."+id(table)+")",Integer.class));}
    private DemoResetResultDto result(){
        String value=jdbc.queryForObject("SELECT outcome FROM demo_checkpoint.control WHERE id=true",String.class);
        try{return json.readValue(value,DemoResetResultDto.class);}catch(Exception invalid){throw new IllegalStateException("Checkpoint reset receipt unavailable",invalid);}
    }
    private Map<String,Object> encode(Value props) {
        var result=new LinkedHashMap<String,Object>();
        props.keys().forEach(k->{var v=props.get(k);String type=v.type().name();Object value=switch(type){case "DATE","TIME","LOCAL_TIME","DATE_TIME","LOCAL_DATE_TIME"->v.asObject().toString();default->v.asObject();};result.put(k,Map.of("type",type,"value",value));});return result;
    }
    @SuppressWarnings("unchecked") private Map<String,Object> decode(Map<String,Object> props) {
        var result=new LinkedHashMap<String,Object>();props.forEach((key,raw)->{var v=(Map<String,Object>)raw;var value=v.get("value");result.put(key,switch((String)v.get("type")){case "DATE"->LocalDate.parse(value.toString());case "TIME"->OffsetTime.parse(value.toString());case "LOCAL_TIME"->LocalTime.parse(value.toString());case "DATE_TIME"->ZonedDateTime.parse(value.toString());case "LOCAL_DATE_TIME"->LocalDateTime.parse(value.toString());default->value;});});return result;
    }
    @SuppressWarnings("unchecked") private void restoreGraph(List<Map<String,Object>> nodes,List<Map<String,Object>> edges) {
        try(var s=graph.session()){s.executeWrite(g->{
            g.run("MATCH(n) DETACH DELETE n").consume();var identities=new HashMap<String,String>();
            for(var node:nodes) {
                String labels=String.join(":",((List<String>)node.get("labels")).stream().map(v->"`"+v.replace("`","``")+"`").toList());
                String key=g.run("CREATE(n"+(labels.isEmpty()?"":":"+labels)+") SET n=$props RETURN elementId(n) AS key",Map.of("props",decode((Map<String,Object>)node.get("props")))).single().get("key").asString();identities.put((String)node.get("key"),key);
            }
            for(var edge:edges)g.run("MATCH(a),(b) WHERE elementId(a)=$a AND elementId(b)=$b CREATE(a)-[r:`"+edge.get("type").toString().replace("`","``")+"`]->(b) SET r=$props",Map.of("a",identities.get(edge.get("source")),"b",identities.get(edge.get("target")),"props",decode((Map<String,Object>)edge.get("props")))).consume();
            return null;
        });}
    }
}
