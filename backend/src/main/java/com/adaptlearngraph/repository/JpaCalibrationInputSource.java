package com.adaptlearngraph.repository;

import com.adaptlearngraph.helper.CalibrationJson;
import com.adaptlearngraph.repository.CalibrationPorts.*;
import com.adaptlearngraph.entities.domain.Calibration;
import com.adaptlearngraph.entities.domain.Calibration.*;
import com.adaptlearngraph.utility.AdaptiveIrtPolicy.Model;
import java.util.HashSet;
import java.util.UUID;

/** Real PG model/content preflight and commit-time pin locks, behind authorized source ports. Never creates missing model/actors. */
public final class JpaCalibrationInputSource implements InputSource {
    private final IrtCalibrationPinJpaRepository pins;
    private final BankSource content;
    private final DatasetSource datasets;
    private final CalibrationJson json;
    public JpaCalibrationInputSource(IrtCalibrationPinJpaRepository pins,OfficialCalibrationBankSource content,DatasetSource datasets,CalibrationJson json) {
        this(pins,(grant,expected)->content.load(),datasets,json);
    }
    public JpaCalibrationInputSource(IrtCalibrationPinJpaRepository pins,BankSource content,DatasetSource datasets,CalibrationJson json){
        this.pins=pins;this.content=content;this.datasets=datasets;this.json=json;
    }
    @Override public Input load(Grant grant,Request request) {
        Bank bank=content.load(grant,request.source()); Calibration.require(bank.source().equals(request.source()) && bank.source().bankId().equals(grant.scope().bankId()));
        ModelPin model=verify(grant,request,bank);
        Dataset data=datasets.load(grant,request.datasetRef(),request.datasetHash());
        Calibration.require(json.hash(data).equals(request.datasetHash()));
        return new Input(bank,data,request.datasetHash(),request.modelConfigurationHash(),request.modelParameterHash(),model);
    }
    @Override public void revalidate(Grant grant,Request request,Input input) {
        Calibration.require(content.load(grant,request.source()).source().equals(request.source()));
        Calibration.require(verify(grant,request,input.bank()).equals(input.modelPin()));
        Calibration.require(json.hash(datasets.load(grant,request.datasetRef(),request.datasetHash())).equals(input.datasetHash()));
    }
    private ModelPin verify(Grant grant,Request request,Bank bank) {
        if (!grant.scope().equals(request.scope())) throw new Failure(Code.FORBIDDEN);
        try {
            var scope=request.scope();
            if (pins.activeBankOwner(scope.bankId(),scope.organizationId()).size()!=1) throw new Failure(Code.FORBIDDEN);
            var models=pins.model(scope.modelId()).stream().map(row->{
                if (!"IRT_3PL".equals(row[0])) throw new Failure(Code.NOT_READY);
                String configuration=(String) row[1]; String parameterHash=(String) row[2];
                Model model=json.read(configuration,Model.class);
                Calibration.require(json.hash(json.tree(configuration)).equals(request.modelConfigurationHash()) && parameterHash.equals(request.modelParameterHash()));
                Calibration.require(model.maxC()>=.25);
                if(!json.policyFor(request.algorithmHash()).generic())Calibration.require(model.minA()<=.25 && model.maxA()>=3 && model.maxAbsB()>=3);
                return new ModelPin(scope.modelId(),(String) row[0],(String) row[3],parameterHash,
                        request.modelConfigurationHash(),(String) row[4],(UUID) row[5],AdaptiveAttemptRows.instant(row[6]));
            }).toList();
            if (models.size()!=1) throw new Failure(Code.NOT_READY);
            var byId=bank.pins().stream().collect(java.util.stream.Collectors.toMap(ItemPin::itemVersionId,p->p));
            var seen=new HashSet<UUID>();
            for (Object[] row:pins.bankItemContents(scope.bankId())) {
                UUID id=(UUID) row[0]; ItemPin pin=byId.get(id);
                Calibration.require(pin!=null && seen.add(id) && pin.skillId().equals(row[1])
                        && pin.contentHash().equals(row[2]) && pin.contentHash().equals(json.hash(json.tree((String) row[3]))));
            }
            Calibration.require(seen.equals(byId.keySet()));
            return models.getFirst();
        } catch (org.springframework.dao.DataAccessException | org.springframework.transaction.TransactionException unavailable) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
        }
    }
}
