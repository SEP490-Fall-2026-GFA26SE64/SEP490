package com.adaptlearngraph.assessment.bank.infrastructure;

import com.adaptlearngraph.assessment.bank.application.port.out.QuestionBankPorts.Store;
import com.adaptlearngraph.assessment.bank.domain.QuestionBank;
import com.adaptlearngraph.assessment.bank.domain.QuestionBank.*;
import com.fasterxml.jackson.databind.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.util.*;
import java.util.function.Function;

public final class JdbcQuestionBankStore implements Store {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final ObjectMapper json;
    public JdbcQuestionBankStore(JdbcTemplate jdbc,TransactionTemplate tx,ObjectMapper json) {this.jdbc=jdbc;this.tx=tx;this.json=json;}
    @Override public <T> T atomic(Actor actor, Function<QuestionBank,T> command) {
        return tx.execute(status->{
            var membership=jdbc.queryForList("""
                SELECT a.account_id FROM platform.account a JOIN platform.organization_membership m USING(account_id)
                JOIN platform.organization_membership_role r USING(membership_id)
                JOIN platform.organization o ON o.organization_id=m.organization_id
                WHERE a.account_id=? AND a.organization_id=? AND m.organization_id=? AND a.active AND m.active
                    AND o.status='ACTIVE' AND r.role_code=? FOR SHARE OF a,m,r,o
                """,UUID.class,actor.id(),actor.organization(),actor.organization(),actor.role());
            if(membership.size()!=1)throw new Failure(403,"Current organization staff membership required");
            jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))::text",String.class,"question-bank:"+actor.organization());
            var existing=jdbc.queryForList("SELECT document::text FROM platform.question_bank_workspace WHERE organization_id=? FOR UPDATE",String.class,actor.organization());
            QuestionBank bank=existing.isEmpty()?initialize(actor):decode(existing.getFirst());
            boolean crossBank=Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.item_version own JOIN platform.item_version other ON other.item_id=own.item_id WHERE own.question_bank_id=? AND other.question_bank_id<>?)",Boolean.class,bank.id,bank.id));
            if(crossBank)throw new Failure(409,"Legacy item identity spans multiple banks; explicit reconciliation required");
            String before=encode(bank);
            var result=command.apply(bank);
            String after=encode(bank);
            if(existing.isEmpty()||!before.equals(after)) {
                project(bank);
                jdbc.update("INSERT INTO platform.question_bank_workspace(organization_id,question_bank_id,document) VALUES (?,?,?::jsonb) ON CONFLICT(organization_id) DO UPDATE SET document=EXCLUDED.document",actor.organization(),bank.id,after);
            }
            return result;
        });
    }
    private QuestionBank initialize(Actor actor) {
        var banks=jdbc.queryForList("SELECT b.question_bank_id FROM platform.question_bank b JOIN platform.account a ON a.account_id=b.created_by WHERE a.organization_id=? ORDER BY b.created_at,b.question_bank_id",UUID.class,actor.organization());
        if(banks.size()>1)throw new Failure(409,"Multiple legacy banks need explicit administrator resolution; no data was merged");
        var bank=new QuestionBank();bank.organization=actor.organization();bank.name="Organization Question Bank";
        if(banks.isEmpty()){bank.id=UUID.randomUUID();jdbc.update("INSERT INTO platform.question_bank(question_bank_id,name,created_by) VALUES (?,?,?)",bank.id,bank.name,actor.id());}
        else {bank.id=banks.getFirst();bank.name=jdbc.queryForObject("SELECT name FROM platform.question_bank WHERE question_bank_id=?",String.class,bank.id);}
        jdbc.query("SELECT * FROM platform.item_version WHERE question_bank_id=? ORDER BY item_id,version",rs->{
            UUID id=rs.getObject("item_id",UUID.class);var q=bank.questions.stream().filter(x->x.id.equals(id)).findFirst().orElse(null);
            if(q==null){q=new Question();q.id=id;q.code="Q-"+id.toString().toUpperCase(Locale.ROOT);q.revision=1;bank.questions.add(q);}
            var v=new Version();v.id=rs.getObject("item_version_id",UUID.class);v.number=rs.getInt("version");v.state=rs.getString("publication_state");
            try {var schema=json.readTree(rs.getString("response_schema"));var options=new ArrayList<String>();for(var option:schema.path("options"))options.add(option.path("text").asText());String correct=json.readTree(rs.getString("protected_key")).path("correctOptionId").asText();Integer answer=null;int n=0;for(var option:schema.path("options")){if(option.path("id").asText().equals(correct))answer=n;n++;}
                v.content=new Content(rs.getString("prompt"),options,answer,rs.getString("micro_skill_id"),rs.getString("micro_skill_name_snapshot"),rs.getString("difficulty"),null);
            }catch(Exception invalid){throw new Failure(409,"Legacy question content needs explicit repair");}
            q.versions.add(v);
        },bank.id);
        return bank;
    }
    private void project(QuestionBank bank) {
        for(var q:bank.questions) {
            int identityChanged=jdbc.update("INSERT INTO platform.question_bank_identity(question_id,question_bank_id,code,retired) VALUES (?,?,?,?) ON CONFLICT(question_id) DO UPDATE SET retired=EXCLUDED.retired WHERE question_bank_identity.question_bank_id=EXCLUDED.question_bank_id AND question_bank_identity.code=EXCLUDED.code",q.id,bank.id,q.code,q.retired);
            if(identityChanged!=1)throw new Failure(409,"Question identity changed; explicit reconciliation required");
            for(var v:q.versions)if("PUBLISHED".equals(v.state)) {
                var states=jdbc.queryForList("SELECT publication_state FROM platform.item_version WHERE item_version_id=? AND item_id=? AND question_bank_id=? AND version=?",String.class,v.id,q.id,bank.id,v.number);
                if(states.contains("PUBLISHED"))continue; // Existing immutable legacy definitions keep their original bytes/hash.
                var options=new ArrayList<Map<String,String>>();for(int i=0;i<4;i++)options.add(Map.of("id",String.valueOf((char)('A'+i)),"text",v.content.options().get(i)));
                String response=encode(Map.of("type","SINGLE_CHOICE","options",options));String key=encode(Map.of("correctOptionId",String.valueOf((char)('A'+v.content.correctAnswer()))));
                String hash=sha256(encode(List.of(bank.id,q.id,v.number,v.content.prompt(),response,key,v.content.skillId(),v.content.skillName(),v.content.difficulty())));
                if(states.contains("DRAFT")) {
                    int changed=jdbc.update("UPDATE platform.item_version SET prompt=?,response_schema=?::jsonb,protected_key=?::jsonb,content_hash=?,micro_skill_id=?,micro_skill_name_snapshot=?,difficulty=?,publication_state='PUBLISHED' WHERE item_version_id=? AND publication_state='DRAFT'",v.content.prompt(),response,key,hash,v.content.skillId(),v.content.skillName(),v.content.difficulty(),v.id);
                    if(changed!=1)throw new Failure(409,"Legacy draft changed during approval");
                    continue;
                }
                jdbc.update("""
                    INSERT INTO platform.item_version(item_version_id,item_id,version,question_bank_id,prompt,response_schema,protected_key,publication_state,content_hash,micro_skill_id,micro_skill_name_snapshot,difficulty)
                    VALUES (?,?,?,?,?,?::jsonb,?::jsonb,'PUBLISHED',?,?,?,?)
                    """,v.id,q.id,v.number,bank.id,v.content.prompt(),response,key,hash,v.content.skillId(),v.content.skillName(),v.content.difficulty());
            }
        }
        for(var notice:bank.notices)jdbc.update("INSERT INTO platform.question_bank_mail(notice_id,organization_id,recipient,title,body,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(notice_id) DO NOTHING",notice.id,bank.organization,notice.recipient,notice.title,notice.body,Timestamp.from(notice.createdAt));
    }
    private QuestionBank decode(String value) {try{return json.readValue(value,QuestionBank.class);}catch(Exception e){throw new Failure(503,"Question Bank storage is unavailable");}}
    private String encode(Object value) {try{return json.writeValueAsString(value);}catch(Exception e){throw new Failure(503,"Question Bank serialization failed");}}
    private String sha256(String value) {try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
}
