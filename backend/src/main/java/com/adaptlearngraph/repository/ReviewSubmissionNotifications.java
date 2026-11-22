package com.adaptlearngraph.repository;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Same-transaction, in-app-only notices. Rapid submissions share one notice per author and content type. */
public final class ReviewSubmissionNotifications {
 private final JdbcTemplate db;
 private final OrganizationMembershipJpaRepository memberships;
 public ReviewSubmissionNotifications(JdbcTemplate db,OrganizationMembershipJpaRepository memberships){this.db=db;this.memberships=memberships;}
 public void submitted(String organization,String actor,String type,int count){
  if(count<1)return;
  if(!TransactionSynchronizationManager.isActualTransactionActive())throw new IllegalStateException("Submission notice requires the content transaction");
  String route,noun,vi;
  switch(type){
   case "MODULES" -> {route="/ld-manager/modules?status=SUBMITTED";noun="modules";vi="module";}
   case "QUESTIONS" -> {route="/ld-manager/question-bank?status=SUBMITTED";noun="questions";vi="câu hỏi";}
   case "CERTIFICATES" -> {route="/ld-manager/certificates?status=SUBMITTED";noun="certificates";vi="chứng chỉ";}
   default -> throw new IllegalArgumentException("Unknown review submission type");
  }
  var org=UUID.fromString(organization);
  String kind="REVIEW_"+type+"_SUBMITTED";
  String key=db.queryForObject("SELECT 'REVIEW-SUBMIT:'||?||':'||?||':'||floor(extract(epoch from clock_timestamp())/120)::bigint",String.class,actor,type);
  for(var manager:memberships.staff(org,"LD_MANAGER"))db.update("""
   INSERT INTO platform.learning_notification(id,organization_id,recipient_id,event_key,kind,title,body,deep_link)
   VALUES(?,?,?,?,?,'Content awaiting review / Nội dung chờ duyệt',?,?)
   ON CONFLICT(recipient_id,event_key) DO UPDATE SET
    body=(split_part(platform.learning_notification.body,' ',1)::int+?)::text||?, read_at=NULL
   WHERE platform.learning_notification.organization_id=EXCLUDED.organization_id AND platform.learning_notification.kind=EXCLUDED.kind
   """,UUID.randomUUID(),organization,manager.accountId().toString(),key,kind,count+" "+noun+" awaiting review / "+vi+" chờ duyệt.",route,count," "+noun+" awaiting review / "+vi+" chờ duyệt.");
 }
}
