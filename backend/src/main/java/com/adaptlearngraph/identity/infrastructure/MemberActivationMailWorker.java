package com.adaptlearngraph.identity.infrastructure;

import com.adaptlearngraph.identity.application.port.out.RegistrationSecrets;
import com.adaptlearngraph.identity.domain.RegistrationFailure;
import jakarta.mail.MessagingException;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.UUID;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionTemplate;

public final class MemberActivationMailWorker {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final RegistrationSecrets secrets;
    private final RegistrationMailDelivery mail;
    private final Clock clock;
    private final String publicUrl;
    public MemberActivationMailWorker(JdbcTemplate jdbc,TransactionTemplate transactions,RegistrationSecrets secrets,RegistrationMailDelivery mail,Clock clock,String publicUrl) {
        this.jdbc=jdbc;this.transactions=transactions;this.secrets=secrets;this.mail=mail;this.clock=clock;this.publicUrl=publicUrl.replaceAll("/+$","");
    }
    @Scheduled(fixedDelayString="${registration.mail-worker.delay-ms:1000}")
    public void deliver() {
        var job=transactions.execute(tx->{
            var now=Timestamp.from(clock.instant());
            var jobs=jdbc.query("""
                    SELECT j.job_id,j.event_id,j.attempts,e.aggregate_id,e.source_revision,e.payload->>'encryptedToken',a.email,
                      a.generation=e.source_revision AND a.consumed_at IS NULL AND a.expires_at>? AS eligible
                    FROM platform.processing_job j JOIN platform.outbox_event e USING(event_id)
                    JOIN platform.workspace_activation a ON a.activation_id=e.aggregate_id
                    WHERE j.handler='MEMBER_ACTIVATION_EMAIL' AND
                      ((j.status IN ('PENDING','RETRY') AND j.next_retry_at<=?) OR (j.status='RUNNING' AND j.lease_expires_at<=?))
                    ORDER BY j.created_at LIMIT 1 FOR UPDATE OF j SKIP LOCKED
                    """,(rs,i)->new Job(rs.getObject(1,UUID.class),rs.getObject(2,UUID.class),rs.getInt(3)+1,
                    rs.getObject(4,UUID.class),rs.getLong(5),rs.getString(6),rs.getString(7),rs.getBoolean(8),UUID.randomUUID().toString()),now,now,now);
            if(jobs.isEmpty()) return null;
            var value=jobs.getFirst();
            jdbc.update("UPDATE platform.processing_job SET status='RUNNING',attempts=attempts+1,lease_owner=?,lease_expires_at=? WHERE job_id=?",
                    value.lease(),Timestamp.from(clock.instant().plusSeconds(120)),value.id());
            return value;
        });
        if(job==null) return;
        boolean sent=false; String failure=null;
        if(!job.eligible()) failure="SUPERSEDED_OR_EXPIRED";
        else if(job.attempt()>5) failure="DELIVERY_RETRIES_EXHAUSTED";
        else {
            try {
                String token=secrets.decrypt(job.encrypted(),"activation:"+job.activation()+":"+job.generation());
                mail.sendActivation(job.email(),publicUrl+"/activate#token="+token,job.event());
                sent=true;
            } catch(MailException | MessagingException | RegistrationFailure exception) {
                LoggerFactory.getLogger(getClass()).warn("Member activation delivery failed for job {} ({})",job.id(),exception.getClass().getSimpleName());
                failure="SMTP_UNAVAILABLE";
            }
        }
        String status=sent?"SUCCEEDED":"SMTP_UNAVAILABLE".equals(failure) && job.attempt()<5?"RETRY":"FAILED";
        jdbc.update("""
                UPDATE platform.processing_job SET status=?,failure_code=?,next_retry_at=?,lease_owner=NULL,lease_expires_at=NULL
                WHERE job_id=? AND lease_owner=? AND status='RUNNING'
                """,status,failure,Timestamp.from(clock.instant().plusSeconds(30L*job.attempt())),job.id(),job.lease());
    }
    private record Job(UUID id,UUID event,int attempt,UUID activation,long generation,String encrypted,String email,boolean eligible,String lease) {
        @Override public String toString() { return "ActivationMailJob[redacted]"; }
    }
}
