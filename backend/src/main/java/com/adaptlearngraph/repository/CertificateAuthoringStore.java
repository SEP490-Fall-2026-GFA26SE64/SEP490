package com.adaptlearngraph.repository;

import com.adaptlearngraph.services.CertificateCatalogService.CreateInput;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import com.adaptlearngraph.repository.InitialPathwayPorts.Failure;

/** PostgreSQL owns draft/review history and the durable publication queue. */
public final class CertificateAuthoringStore {
 public record Document(UUID id,long revision,String state,CreateInput input,String skillName,UUID authorId,
   UUID reviewerId,String reason,String definitionId,String updatedAt) {}
 private final JdbcTemplate db; private final ObjectMapper json;
 public CertificateAuthoringStore(JdbcTemplate db,ObjectMapper json){this.db=db;this.json=json;}
 public String encode(Object v){try{return json.writeValueAsString(v);}catch(Exception e){throw new Failure(400,"INVALID_REQUEST");}}
 public Document decode(java.sql.ResultSet r,int n)throws java.sql.SQLException {
  try{return new Document(r.getObject("id",UUID.class),r.getLong("revision"),r.getString("state"),json.readValue(r.getString("input"),CreateInput.class),r.getString("skill_name"),r.getObject("author_id",UUID.class),r.getObject("reviewer_id",UUID.class),r.getString("reason"),r.getString("definition_id"),r.getTimestamp("updated_at").toInstant().toString());}
  catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("Invalid certificate snapshot",e);}
 }
 public List<Document> list(UUID org){return db.query("SELECT * FROM platform.certificate_authoring WHERE organization_id=? ORDER BY CASE state WHEN 'SUBMITTED' THEN 0 WHEN 'PUBLISHING' THEN 1 ELSE 2 END,updated_at DESC,id LIMIT 1001",this::decode,org);}
 public Document lock(UUID org,UUID id){return db.query("SELECT * FROM platform.certificate_authoring WHERE organization_id=? AND id=? FOR UPDATE",this::decode,org,id).stream().findFirst().orElseThrow(()->new Failure(404,"CERTIFICATE_DRAFT_NOT_FOUND"));}
 public void scope(UUID org,String skill,String level){db.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))",Object.class,"CERTIFICATE:"+org+":"+skill+":"+level);}
 public void actor(UUID org,UUID actor){db.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))",Object.class,"CERTIFICATE-ACTOR:"+org+":"+actor);}
 public Optional<List<UUID>> replay(UUID org,UUID actor,UUID key,String hash){return db.query("SELECT hash,ids::text FROM platform.certificate_authoring_batch WHERE organization_id=? AND actor_id=? AND key=?",(r,n)->{
  if(!hash.equals(r.getString(1)))throw new Failure(409,"IDEMPOTENCY_CONFLICT");
  try{return Arrays.asList(json.readValue(r.getString(2),UUID[].class));}catch(Exception e){throw new IllegalStateException(e);}
 },org,actor,key).stream().findFirst();}
 public void receipt(UUID org,UUID actor,UUID key,String hash,List<UUID> ids){db.update("INSERT INTO platform.certificate_authoring_batch VALUES(?,?,?, ?,CAST(? AS jsonb))",org,actor,key,hash,encode(ids));}
 public void insert(UUID org,UUID author,UUID id,CreateInput input,String name){db.update("INSERT INTO platform.certificate_authoring(id,organization_id,author_id,skill_id,knowledge_level,skill_name,input,state) VALUES(?,?,?,?,?,?,CAST(? AS jsonb),'DRAFT')",id,org,author,input.skillId(),input.knowledgeLevel(),name,encode(input));}
 public boolean open(UUID org,String skill,String level){return Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.certificate_authoring WHERE organization_id=? AND skill_id=? AND knowledge_level=? AND state<>'PUBLISHED')",Boolean.class,org,skill,level));}
 public void state(UUID org,UUID id,String state,UUID reviewer,String reason){db.update("UPDATE platform.certificate_authoring SET state=?,reviewer_id=?,reason=?,updated_at=clock_timestamp(),attempts=0,next_attempt=clock_timestamp() WHERE organization_id=? AND id=?",state,reviewer,reason,org,id);}
 public void edit(UUID org,UUID id,CreateInput input){db.update("UPDATE platform.certificate_authoring SET input=CAST(? AS jsonb),revision=revision+1,state='DRAFT',reviewer_id=NULL,reason='',updated_at=clock_timestamp() WHERE organization_id=? AND id=?",encode(input),org,id);}
 public void event(UUID org,Document d,UUID actor,String action){db.update("INSERT INTO platform.certificate_authoring_event VALUES(?,?,?,?,?,?,CAST(? AS jsonb),clock_timestamp())",UUID.randomUUID(),org,d.id(),d.revision(),actor,action,encode(d));}
 public void viewed(UUID org,Document d,UUID reviewer){db.update("INSERT INTO platform.certificate_authoring_view(organization_id,draft_id,revision,reviewer_id) VALUES(?,?,?,?) ON CONFLICT DO NOTHING",org,d.id(),d.revision(),reviewer);}
 public boolean hasViewed(UUID org,Document d,UUID reviewer){return Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.certificate_authoring_view WHERE organization_id=? AND draft_id=? AND revision=? AND reviewer_id=?)",Boolean.class,org,d.id(),d.revision(),reviewer));}
 public Optional<Document> next(){return db.query("SELECT * FROM platform.certificate_authoring WHERE state='PUBLISHING' AND next_attempt<=clock_timestamp() ORDER BY updated_at,id LIMIT 1 FOR UPDATE SKIP LOCKED",this::decode).stream().findFirst();}
 public UUID organization(UUID id){return db.queryForObject("SELECT organization_id FROM platform.certificate_authoring WHERE id=?",UUID.class,id);}
 public void published(UUID org,Document d,String definition){db.update("UPDATE platform.certificate_authoring SET state='PUBLISHED',definition_id=?,updated_at=clock_timestamp() WHERE organization_id=? AND id=?",definition,org,d.id());}
 public void retry(UUID id,String reason,boolean permanent){db.update("UPDATE platform.certificate_authoring SET attempts=attempts+1,next_attempt=clock_timestamp()+interval '30 seconds',state=CASE WHEN ? OR attempts>=9 THEN 'PUBLISH_FAILED' ELSE state END,reason=? WHERE id=?",permanent,reason,id);}
}
