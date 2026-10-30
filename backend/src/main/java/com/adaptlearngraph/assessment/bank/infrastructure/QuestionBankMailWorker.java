package com.adaptlearngraph.assessment.bank.infrastructure;

import com.adaptlearngraph.shared.infrastructure.mail.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionTemplate;

/** Fenced at-least-once delivery, independent of the committed authoring command. */
public final class QuestionBankMailWorker {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final TransactionalMailSender mail;
    private final String publicUrl;
    public QuestionBankMailWorker(JdbcTemplate jdbc,TransactionTemplate tx,TransactionalMailSender mail,String publicUrl){this.jdbc=jdbc;this.tx=tx;this.mail=mail;this.publicUrl=publicUrl.replaceAll("/+$","");}
    private record Job(UUID id,UUID lease,String email,String title,String body,int attempts,String role){}
    @Scheduled(fixedDelayString="${question-bank.mail-delay-ms:5000}")
    public void deliver(){
        Job job=tx.execute(status->{
            var jobs=jdbc.query("""
                SELECT n.notice_id,a.identifier,n.title,n.body,n.attempts,r.role_code
                FROM platform.question_bank_mail n JOIN platform.account a ON a.account_id=n.recipient AND a.organization_id=n.organization_id
                JOIN platform.organization_membership m ON m.account_id=a.account_id AND m.organization_id=n.organization_id
                JOIN platform.organization_membership_role r USING(membership_id)
                WHERE a.active AND m.active AND r.role_code IN ('DOMAIN_EXPERT','LD_MANAGER')
                AND ((n.status IN ('PENDING','RETRY') AND n.next_attempt<=now()) OR (n.status='RUNNING' AND n.lease_until<now()))
                ORDER BY n.created_at LIMIT 1 FOR UPDATE OF n SKIP LOCKED
                """,(rs,i)->new Job(rs.getObject(1,UUID.class),UUID.randomUUID(),rs.getString(2),rs.getString(3),rs.getString(4),rs.getInt(5)+1,rs.getString(6)));
            if(jobs.isEmpty())return null;var j=jobs.getFirst();jdbc.update("UPDATE platform.question_bank_mail SET status='RUNNING',attempts=attempts+1,lease_owner=?,lease_until=now()+interval '120 seconds' WHERE notice_id=?",j.lease,j.id);return j;
        });
        if(job==null)return;
        String state="SENT",error=null;
        try{if(job.attempts>5)throw new IllegalStateException("Retries exhausted");mail.send(job.email,TransactionalEmail.render(job.title,job.body,null,Map.of(),"Open Question Bank",publicUrl+("LD_MANAGER".equals(job.role)?"/ld-manager/question-bank":"/expert/assessment-bank"),"Sign in to review details. No answer key is included in this notification."),"X-Question-Bank-Notice",job.id);}
        catch(Exception e){state=job.attempts<5?"RETRY":"FAILED";error="EMAIL_UNAVAILABLE";}
        String result=state,code=error;
        tx.executeWithoutResult(status->jdbc.update("UPDATE platform.question_bank_mail SET status=?,error_code=?,next_attempt=now()+interval '30 seconds',lease_owner=NULL,lease_until=NULL WHERE notice_id=? AND lease_owner=? AND status='RUNNING'",result,code,job.id,job.lease));
    }
}
