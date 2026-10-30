package com.adaptlearngraph.assessment.adaptive.calibration.infrastructure;

import com.adaptlearngraph.assessment.adaptive.calibration.application.CalibrationPorts.Grant;
import com.adaptlearngraph.assessment.adaptive.calibration.application.PromotionPorts.*;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.*;
import java.sql.Timestamp;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Requires forward V23 and trusted owner services. Candidate, pointer, original receipt and audit commit together. */
public final class JdbcParameterPromotionStore implements Store {
    private final JdbcCalibrationStore runs;
    private final NamedParameterJdbcTemplate jdbc;
    private final CalibrationJson json;
    public JdbcParameterPromotionStore(JdbcCalibrationStore runs,NamedParameterJdbcTemplate jdbc,CalibrationJson json) {
        this.runs=runs; this.jdbc=jdbc; this.json=json;
    }
    @Override public <T> T transaction(Scope scope,Supplier<T> work) { return runs.transaction(scope,work); }
    @Override public Optional<Receipt> receipt(Grant grant,String key) {
        runs.require(grant.scope());
        return jdbc.query("""
                SELECT * FROM platform.irt_parameter_promotion_command WHERE organization_id=:org AND actor_id=:actor AND idempotency_key=:key
                """,Map.of("org",grant.scope().organizationId(),"actor",grant.actorId(),"key",key),(rs,row)->new Receipt(rs.getString("request_hash"),
                    new Selection(new Scope(rs.getObject("organization_id",UUID.class),rs.getObject("question_bank_id",UUID.class),rs.getObject("model_version_id",UUID.class)),
                            rs.getLong("selection_revision"),rs.getObject("parameter_set_id",UUID.class),rs.getString("parameter_hash"),
                            rs.getObject("actor_id",UUID.class),rs.getTimestamp("occurred_at").toInstant()))).stream().findFirst();
    }
    @Override public Optional<Selection> effective(Scope scope) {
        runs.require(scope);
        return jdbc.query("""
                SELECT e.*,p.parameter_hash FROM platform.irt_effective_parameter_selection e
                JOIN platform.irt_parameter_set p USING(parameter_set_id,model_version_id)
                WHERE e.organization_id=:org AND e.question_bank_id=:bank AND e.model_version_id=:model FOR UPDATE OF e
                """,key(scope),(rs,row)->new Selection(scope,rs.getLong("selection_revision"),rs.getObject("parameter_set_id",UUID.class),
                    rs.getString("parameter_hash"),rs.getObject("selected_by",UUID.class),rs.getTimestamp("selected_at").toInstant())).stream().findFirst();
    }
    @Override public Candidate candidate(Scope scope,UUID id) { return runs.candidate(scope,id); }
    @Override public void validatePins(Command command,Candidate candidate) {
        runs.require(command.scope());
        var key=key(command.scope());
        var models=jdbc.query("""
                SELECT * FROM platform.model_version
                WHERE model_version_id=:model AND algorithm='IRT_3PL' FOR SHARE
                """,key,(rs,row)->{
            if (rs.getObject("approved_by")==null || rs.getTimestamp("approved_at")==null) throw new Failure(Code.NOT_READY);
            Calibration.require(json.hash(json.tree(rs.getString("configuration"))).equals(command.modelConfigurationHash())
                    && rs.getString("parameter_hash").equals(command.modelParameterHash()));
            Calibration.require(new ModelPin(command.scope().modelId(),rs.getString("algorithm"),rs.getString("version"),rs.getString("parameter_hash"),
                    command.modelConfigurationHash(),rs.getString("artifact_ref"),rs.getObject("approved_by",UUID.class),
                    rs.getTimestamp("approved_at").toInstant()).equals(candidate.envelope().modelPin())); return true;
        });
        if (models.size()!=1) throw new Failure(Code.NOT_READY);
        var owner=jdbc.query("""
                SELECT b.question_bank_id FROM platform.question_bank b JOIN platform.account a ON a.account_id=b.created_by
                JOIN platform.organization o ON o.organization_id=a.organization_id
                WHERE b.question_bank_id=:bank AND a.organization_id=:org AND a.active AND o.status='ACTIVE' FOR SHARE OF b,a,o
                """,key,(rs,row)->true);
        if (owner.size()!=1) throw new Failure(Code.FORBIDDEN);
        var pins=candidate.envelope().itemPins().stream().collect(java.util.stream.Collectors.toMap(ItemPin::itemVersionId,p->p));
        var seen=new java.util.HashSet<UUID>();
        jdbc.query("""
                SELECT i.item_version_id,i.micro_skill_id,i.content_hash,
                  jsonb_build_object('itemVersionId',i.item_version_id,'itemId',i.item_id,'version',i.version,
                    'microSkillId',i.micro_skill_id,'microSkillName',i.micro_skill_name_snapshot,'difficulty',i.difficulty,
                    'prompt',i.prompt,'responseSchema',i.response_schema,'protectedKey',i.protected_key,
                    'publicationState',i.publication_state,'questionBankId',i.question_bank_id)::text AS content
                FROM platform.item_version i WHERE i.item_version_id IN (:items) AND i.question_bank_id=:bank FOR SHARE OF i
                """,key.addValue("items",pins.keySet()),rs->{
            UUID id=rs.getObject("item_version_id",UUID.class); ItemPin pin=pins.get(id);
            Calibration.require(pin!=null && seen.add(id) && pin.skillId().equals(rs.getString("micro_skill_id"))
                    && pin.contentHash().equals(rs.getString("content_hash")) && pin.contentHash().equals(json.hash(json.tree(rs.getString("content")))));
        });
        Calibration.require(seen.equals(pins.keySet()));
    }
    @Override public Selection promote(Grant grant,Command command,Candidate candidate,String requestHash) {
        runs.require(command.scope());
        var now=jdbc.queryForObject("SELECT clock_timestamp()",Map.of(),(rs,row)->rs.getTimestamp(1).toInstant());
        long revision=Math.addExact(command.expectedRevision(),1);
        var key=key(command.scope()).addValue("candidate",candidate.id()).addValue("actor",grant.actorId()).addValue("time",Timestamp.from(now))
                .addValue("revision",revision).addValue("expected",command.expectedRevision()).addValue("previous",command.expectedParameterSetId());
        int promoted=jdbc.update("""
                UPDATE platform.irt_parameter_set SET status='PROMOTED',activated_by=:actor,activated_at=:time
                WHERE parameter_set_id=:candidate AND model_version_id=:model AND status='CANDIDATE'
                """,key);
        if (promoted!=1) throw new Failure(Code.CONFLICT);
        if (command.expectedRevision()==0) {
            jdbc.update("""
                    INSERT INTO platform.irt_effective_parameter_selection(organization_id,question_bank_id,model_version_id,parameter_set_id,selection_revision,selected_by,selected_at)
                    VALUES (:org,:bank,:model,:candidate,1,:actor,:time)
                    """,key);
        } else if (jdbc.update("""
                UPDATE platform.irt_effective_parameter_selection SET parameter_set_id=:candidate,selection_revision=:revision,selected_by=:actor,selected_at=:time
                WHERE organization_id=:org AND question_bank_id=:bank AND model_version_id=:model
                  AND selection_revision=:expected AND parameter_set_id=:previous
                """,key)!=1) throw new Failure(Code.CONFLICT);
        jdbc.update("""
                INSERT INTO platform.irt_parameter_promotion_command(organization_id,actor_id,idempotency_key,question_bank_id,model_version_id,
                    request_hash,parameter_set_id,parameter_hash,expected_revision,expected_parameter_set_id,selection_revision,reason,occurred_at)
                VALUES (:org,:actor,:commandKey,:bank,:model,:requestHash,:candidate,:parameterHash,:expected,:previous,:revision,:reason,:time)
                """,key.addValue("commandKey",command.idempotencyKey()).addValue("requestHash",requestHash).addValue("parameterHash",candidate.parameterHash()).addValue("reason",command.reason()));
        jdbc.update("""
                INSERT INTO platform.audit_event(audit_event_id,actor_id,service_name,action,resource_id,resource_revision,occurred_at,outcome,correlation_id)
                VALUES (:event,:actor,'assessment','IRT_PARAMETER_PROMOTED',:candidate,:resourceRevision,:time,'SUCCEEDED',:event)
                """,key.addValue("event",UUID.randomUUID()).addValue("resourceRevision",Long.toString(revision)));
        return new Selection(command.scope(),revision,candidate.id(),candidate.parameterHash(),grant.actorId(),now);
    }
    private MapSqlParameterSource key(Scope scope) {
        return new MapSqlParameterSource("org",scope.organizationId()).addValue("bank",scope.bankId()).addValue("model",scope.modelId());
    }
}
