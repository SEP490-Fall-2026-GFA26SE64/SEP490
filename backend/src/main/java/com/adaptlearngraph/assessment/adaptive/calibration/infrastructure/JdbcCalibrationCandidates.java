package com.adaptlearngraph.assessment.adaptive.calibration.infrastructure;

import com.adaptlearngraph.assessment.adaptive.calibration.domain.*;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Called only inside the store's scoped transaction; V18 owns sealing and immutable history. */
final class JdbcCalibrationCandidates {
    record Diagnostics(Origin origin,String algorithmHash,String modelConfigurationHash,ItemFit fit) {}
    private final NamedParameterJdbcTemplate jdbc;
    private final CalibrationJson json;
    JdbcCalibrationCandidates(NamedParameterJdbcTemplate jdbc,CalibrationJson json) { this.jdbc=jdbc; this.json=json; }
    UUID insert(Envelope envelope,Result result) {
        CalibrationAdmission.validate(envelope,result,CalibrationPolicy.syntheticV1());
        UUID id=UUID.randomUUID(); String hash=json.hash(Map.of("envelope",envelope,"result",result));
        jdbc.update("""
                INSERT INTO platform.irt_parameter_set(parameter_set_id,model_version_id,source,status,parameter_hash)
                VALUES (:id,:model,'CALIBRATED','BUILDING',:hash)
                """,new MapSqlParameterSource("id",id).addValue("model",envelope.request().scope().modelId()).addValue("hash",hash));
        var rows=result.items().stream().map(item->new MapSqlParameterSource("set",id).addValue("item",item.pin().itemVersionId())
                .addValue("skill",item.pin().skillId()).addValue("a",java.math.BigDecimal.valueOf(item.a()))
                .addValue("b",java.math.BigDecimal.valueOf(item.b())).addValue("c",java.math.BigDecimal.valueOf(item.c()))
                .addValue("diagnostics",json.write(new Diagnostics(result.origin(),result.algorithmHash(),envelope.request().modelConfigurationHash(),item))))
                .toArray(MapSqlParameterSource[]::new);
        jdbc.batchUpdate("""
                INSERT INTO platform.irt_item_parameter(parameter_set_id,item_version_id,micro_skill_id,discrimination_a,difficulty_b,guessing_c,fit_diagnostics)
                VALUES (:set,:item,:skill,:a,:b,:c,CAST(:diagnostics AS jsonb))
                """,rows);
        jdbc.update("UPDATE platform.irt_parameter_set SET status='CANDIDATE' WHERE parameter_set_id=:id AND status='BUILDING'",Map.of("id",id));
        return id;
    }
    Candidate load(Scope scope,UUID id) {
        var key=JdbcCalibrationStore.key(scope,null).addValue("id",id);
        return jdbc.query("""
                SELECT s.*,r.configuration,r.diagnostics FROM platform.irt_parameter_set s
                JOIN platform.irt_calibration_run r ON r.output_parameter_set_id=s.parameter_set_id AND r.model_version_id=s.model_version_id
                WHERE s.parameter_set_id=:id AND s.model_version_id=:model AND r.status='SUCCEEDED'
                  AND r.configuration->'request'->'scope'->>'organizationId'=:org
                  AND r.configuration->'request'->'scope'->>'bankId'=:bank
                FOR SHARE OF s,r
                """,key,(rs,row)->{
            var envelope=json.read(rs.getString("configuration"),Envelope.class);
            var stored=json.read(json.tree(rs.getString("diagnostics")).path("result").toString(),Result.class);
            List<ItemFit> items=jdbc.query("""
                    SELECT p.* FROM platform.irt_item_parameter p JOIN platform.item_version i USING(item_version_id,micro_skill_id)
                    WHERE p.parameter_set_id=:id AND i.question_bank_id=CAST(:bank AS uuid) ORDER BY p.micro_skill_id,p.item_version_id::text
                    """,key,(item,index)->{
                var diagnostics=json.read(item.getString("fit_diagnostics"),Diagnostics.class); var fit=diagnostics.fit();
                Calibration.require(diagnostics.origin()==stored.origin() && diagnostics.algorithmHash().equals(stored.algorithmHash())
                        && diagnostics.modelConfigurationHash().equals(envelope.request().modelConfigurationHash())
                        && fit.pin().itemVersionId().equals(item.getObject("item_version_id",UUID.class))
                        && fit.pin().skillId().equals(item.getString("micro_skill_id"))
                        && java.math.BigDecimal.valueOf(fit.a()).compareTo(item.getBigDecimal("discrimination_a"))==0
                        && java.math.BigDecimal.valueOf(fit.b()).compareTo(item.getBigDecimal("difficulty_b"))==0
                        && java.math.BigDecimal.valueOf(fit.c()).compareTo(item.getBigDecimal("guessing_c"))==0);
                return fit;
            });
            // Ordered content is part of the parameter hash; neither sparse coverage nor reordered content is substituted.
            var actual=new Result(stored.origin(),stored.algorithm(),stored.algorithmHash(),stored.datasetHash(),stored.generatingHash(),stored.seed(),items,stored.skills(),stored.objectiveEvaluations());
            CalibrationAdmission.validate(envelope,actual,CalibrationPolicy.syntheticV1());
            Calibration.require(json.hash(Map.of("envelope",envelope,"result",actual)).equals(rs.getString("parameter_hash")));
            return new Candidate(id,scope.modelId(),rs.getString("source"),rs.getString("status"),rs.getString("parameter_hash"),actual,envelope,
                    rs.getTimestamp("created_at").toInstant(),rs.getObject("activated_by",UUID.class),
                    rs.getTimestamp("activated_at")==null?null:rs.getTimestamp("activated_at").toInstant());
        }).stream().findFirst().orElseThrow(()->new Failure(Code.NOT_FOUND));
    }
}
