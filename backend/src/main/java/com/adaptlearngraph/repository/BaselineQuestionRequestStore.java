package com.adaptlearngraph.repository;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;

/** Tenant-scoped request persistence; question content and publication stay with Question Bank. */
public final class BaselineQuestionRequestStore {
    public record Row(UUID id,UUID organization,String roleId,String roleName,String skillId,String skillName,String level,String skillVersion,
            UUID recipient,UUID requester,int total,int mandatory,java.time.Instant createdAt,int linkedQuestions) {}
    private final JdbcTemplate jdbc;
    public BaselineQuestionRequestStore(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public List<Row> list(UUID org) {
        return jdbc.query("""
            SELECT r.*,(SELECT count(*) FROM platform.baseline_question_request_item i WHERE i.request_id=r.id) AS linked
            FROM platform.baseline_question_request r WHERE r.organization_id=? ORDER BY r.updated_at DESC,r.id LIMIT 1001
            """,(r,n)->new Row(r.getObject("id",UUID.class),org,r.getString("role_id"),r.getString("role_name"),r.getString("skill_id"),r.getString("skill_name"),
                    r.getString("knowledge_level"),r.getString("skill_version"),r.getObject("recipient_id",UUID.class),r.getObject("requested_by",UUID.class),
                    r.getInt("required_total"),r.getInt("required_mandatory"),r.getTimestamp("created_at").toInstant(),r.getInt("linked")),org);
    }
    public void upsert(Row r) {
        jdbc.update("""
            INSERT INTO platform.baseline_question_request(id,organization_id,role_id,role_name,skill_id,skill_name,knowledge_level,skill_version,recipient_id,requested_by,required_total,required_mandatory)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(organization_id,role_id,skill_id,knowledge_level,skill_version)
            DO UPDATE SET required_total=GREATEST(baseline_question_request.required_total-baseline_question_request.required_mandatory,EXCLUDED.required_total-EXCLUDED.required_mandatory)
                    +GREATEST(baseline_question_request.required_mandatory,EXCLUDED.required_mandatory),
                required_mandatory=GREATEST(baseline_question_request.required_mandatory,EXCLUDED.required_mandatory),
                recipient_id=EXCLUDED.recipient_id,updated_at=clock_timestamp()
            """,r.id(),r.organization(),r.roleId(),r.roleName(),r.skillId(),r.skillName(),r.level(),r.skillVersion(),r.recipient(),r.requester(),r.total(),r.mandatory());
    }
    public void link(UUID org,UUID request,UUID question,UUID actor) {
        jdbc.update("""
            INSERT INTO platform.baseline_question_request_item(request_id,question_id,linked_by)
            SELECT id,?,? FROM platform.baseline_question_request WHERE id=? AND organization_id=? AND recipient_id=?
            ON CONFLICT DO NOTHING
            """,question,actor,request,org,actor);
    }
    public Optional<String> template(UUID org,UUID actor) {
        return jdbc.query("SELECT configuration::text FROM platform.skill_policy_bulk_template WHERE organization_id=? AND actor_id=?",(r,n)->r.getString(1),org,actor).stream().findFirst();
    }
    public void template(UUID org,UUID actor,String body) {
        jdbc.update("INSERT INTO platform.skill_policy_bulk_template(organization_id,actor_id,configuration) VALUES(?,?,CAST(? AS jsonb)) ON CONFLICT(organization_id,actor_id) DO UPDATE SET configuration=EXCLUDED.configuration,updated_at=clock_timestamp()",org,actor,body);
    }
}
