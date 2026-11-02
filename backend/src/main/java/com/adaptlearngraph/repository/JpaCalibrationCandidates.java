package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.Calibration;
import com.adaptlearngraph.entities.CalibrationAdmission;
import com.adaptlearngraph.entities.IrtItemParameterEntity;
import com.adaptlearngraph.entities.IrtParameterSetEntity;
import com.adaptlearngraph.helper.CalibrationJson;
import com.adaptlearngraph.entities.Calibration.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Called only inside the store's scoped transaction; V18 owns sealing and immutable history. */
public final class JpaCalibrationCandidates {
    record Diagnostics(Origin origin,String algorithmHash,String modelConfigurationHash,ItemFit fit) {}
    private final IrtTechnicalVersionJpaRepository sets;
    private final IrtItemParameterJpaRepository items;
    private final CalibrationJson json;
    JpaCalibrationCandidates(IrtTechnicalVersionJpaRepository sets,IrtItemParameterJpaRepository items,CalibrationJson json) {
        this.sets=sets; this.items=items; this.json=json;
    }
    UUID insert(Envelope envelope,Result result) {
        CalibrationAdmission.validate(envelope,result,json.policyFor(envelope.request().algorithmHash()));
        UUID id=UUID.randomUUID(); String hash=json.hash(Map.of("envelope",envelope,"result",result));
        sets.insert(new IrtParameterSetEntity(id,envelope.request().scope().modelId(),"CALIBRATED","BUILDING",hash,null,null,null));
        items.insertAll(result.items().stream().map(item->new IrtItemParameterEntity(id,item.pin().itemVersionId(),item.pin().skillId(),
                BigDecimal.valueOf(item.a()),BigDecimal.valueOf(item.b()),BigDecimal.valueOf(item.c()),
                json.write(new Diagnostics(result.origin(),result.algorithmHash(),envelope.request().modelConfigurationHash(),item)))).toList());
        sets.seal(id);
        return id;
    }
    Candidate load(Scope scope,UUID id) {
        return sets.calibratedCandidate(id,scope.modelId(),scope.organizationId().toString(),scope.bankId().toString()).stream().map(row->{
            var envelope=json.read((String) row[6],Envelope.class);
            var stored=json.read(json.tree((String) row[7]).path("result").toString(),Result.class);
            List<ItemFit> fits=items.inBank(id,scope.bankId()).stream().map(item->{
                var diagnostics=json.read(item.fitDiagnostics(),Diagnostics.class); var fit=diagnostics.fit();
                Calibration.require(diagnostics.origin()==stored.origin() && diagnostics.algorithmHash().equals(stored.algorithmHash())
                        && diagnostics.modelConfigurationHash().equals(envelope.request().modelConfigurationHash())
                        && fit.pin().itemVersionId().equals(item.itemVersionId())
                        && fit.pin().skillId().equals(item.microSkillId())
                        && BigDecimal.valueOf(fit.a()).compareTo(item.discriminationA())==0
                        && BigDecimal.valueOf(fit.b()).compareTo(item.difficultyB())==0
                        && BigDecimal.valueOf(fit.c()).compareTo(item.guessingC())==0);
                return fit;
            }).toList();
            // Ordered content is part of the parameter hash; neither sparse coverage nor reordered content is substituted.
            var actual=new Result(stored.origin(),stored.algorithm(),stored.algorithmHash(),stored.datasetHash(),stored.generatingHash(),stored.seed(),fits,stored.skills(),stored.objectiveEvaluations());
            CalibrationAdmission.validate(envelope,actual,json.policyFor(envelope.request().algorithmHash()));
            String parameterHash=(String) row[2];
            Calibration.require(json.hash(Map.of("envelope",envelope,"result",actual)).equals(parameterHash));
            return new Candidate(id,scope.modelId(),(String) row[0],(String) row[1],parameterHash,actual,envelope,
                    AdaptiveAttemptRows.instant(row[3]),(UUID) row[4],AdaptiveAttemptRows.instant(row[5]));
        }).toList().stream().findFirst().orElseThrow(()->new Failure(Code.NOT_FOUND));
    }
}
