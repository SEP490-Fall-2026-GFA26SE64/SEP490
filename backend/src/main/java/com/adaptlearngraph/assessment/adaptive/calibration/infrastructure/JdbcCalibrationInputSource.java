package com.adaptlearngraph.assessment.adaptive.calibration.infrastructure;

import com.adaptlearngraph.assessment.adaptive.calibration.application.CalibrationPorts.*;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.*;
import com.adaptlearngraph.assessment.adaptive.psychometrics.AdaptiveIrtPolicy.Model;
import com.adaptlearngraph.assessment.infrastructure.OfficialCalibrationBankSource;
import java.util.HashSet;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Real PG model/content preflight and commit-time pin locks, behind authorized source ports. Never creates missing model/actors. */
public final class JdbcCalibrationInputSource implements InputSource {
    private final NamedParameterJdbcTemplate jdbc;
    private final OfficialCalibrationBankSource content;
    private final DatasetSource datasets;
    private final CalibrationJson json;
    public JdbcCalibrationInputSource(NamedParameterJdbcTemplate jdbc,OfficialCalibrationBankSource content,DatasetSource datasets,CalibrationJson json) {
        this.jdbc=jdbc; this.content=content; this.datasets=datasets; this.json=json;
    }
    @Override public Input load(Grant grant,Request request) {
        Bank bank=content.load(); Calibration.require(bank.source().equals(request.source()));
        ModelPin model=verify(grant,request,bank);
        Dataset data=datasets.load(grant,request.datasetRef(),request.datasetHash());
        Calibration.require(json.hash(data).equals(request.datasetHash()));
        return new Input(bank,data,request.datasetHash(),request.modelConfigurationHash(),request.modelParameterHash(),model);
    }
    @Override public void revalidate(Grant grant,Request request,Input input) {
        Calibration.require(content.load().source().equals(request.source()));
        Calibration.require(verify(grant,request,input.bank()).equals(input.modelPin()));
        Calibration.require(json.hash(datasets.load(grant,request.datasetRef(),request.datasetHash())).equals(input.datasetHash()));
    }
    private ModelPin verify(Grant grant,Request request,Bank bank) {
        if (!grant.scope().equals(request.scope())) throw new Failure(Code.FORBIDDEN);
        try {
            var key=Map.of("bank",request.scope().bankId(),"org",request.scope().organizationId(),"model",request.scope().modelId());
            var owners=jdbc.query("""
                    SELECT b.question_bank_id FROM platform.question_bank b JOIN platform.account a ON a.account_id=b.created_by
                    JOIN platform.organization o ON o.organization_id=a.organization_id
                    WHERE b.question_bank_id=:bank AND a.organization_id=:org AND a.active AND o.status='ACTIVE' FOR SHARE OF b,a,o
                    """,key,(rs,row)->rs.getObject(1,UUID.class));
            if (owners.size()!=1) throw new Failure(Code.FORBIDDEN);
            var models=jdbc.query("""
                    SELECT * FROM platform.model_version WHERE model_version_id=:model FOR SHARE
                    """,key,(rs,row)->{
                if (!"IRT_3PL".equals(rs.getString("algorithm"))) throw new Failure(Code.NOT_READY);
                Model model=json.read(rs.getString("configuration"),Model.class);
                Calibration.require(json.hash(json.tree(rs.getString("configuration"))).equals(request.modelConfigurationHash()) && rs.getString("parameter_hash").equals(request.modelParameterHash()));
                Calibration.require(model.minA()<=.25 && model.maxA()>=3 && model.maxAbsB()>=3 && model.maxC()>=.25);
                return new ModelPin(request.scope().modelId(),rs.getString("algorithm"),rs.getString("version"),rs.getString("parameter_hash"),
                        request.modelConfigurationHash(),rs.getString("artifact_ref"),rs.getObject("approved_by",UUID.class),
                        rs.getTimestamp("approved_at")==null?null:rs.getTimestamp("approved_at").toInstant());
            });
            if (models.size()!=1) throw new Failure(Code.NOT_READY);
            var pins=bank.pins().stream().collect(java.util.stream.Collectors.toMap(ItemPin::itemVersionId,p->p));
            var seen=new HashSet<UUID>();
            jdbc.query("""
                    SELECT i.item_version_id,i.micro_skill_id,i.content_hash,
                      jsonb_build_object('itemVersionId',i.item_version_id,'itemId',i.item_id,'version',i.version,
                        'microSkillId',i.micro_skill_id,'microSkillName',i.micro_skill_name_snapshot,'difficulty',i.difficulty,
                        'prompt',i.prompt,'responseSchema',i.response_schema,'protectedKey',i.protected_key,
                        'publicationState',i.publication_state,'questionBankId',i.question_bank_id)::text AS content
                    FROM platform.item_version i WHERE i.question_bank_id=:bank ORDER BY i.item_version_id FOR SHARE OF i
                    """,key,rs->{
                UUID id=rs.getObject("item_version_id",UUID.class); ItemPin pin=pins.get(id);
                Calibration.require(pin!=null && seen.add(id) && pin.skillId().equals(rs.getString("micro_skill_id"))
                        && pin.contentHash().equals(rs.getString("content_hash")) && pin.contentHash().equals(json.hash(json.tree(rs.getString("content")))));
            });
            Calibration.require(seen.equals(pins.keySet()));
            return models.getFirst();
        } catch (org.springframework.dao.DataAccessException unavailable) { throw new Failure(Code.DEPENDENCY_UNAVAILABLE); }
    }
}
