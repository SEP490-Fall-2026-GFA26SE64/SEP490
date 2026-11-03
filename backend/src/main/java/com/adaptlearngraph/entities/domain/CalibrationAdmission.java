package com.adaptlearngraph.entities.domain;

import com.adaptlearngraph.entities.domain.Calibration.*;
import java.util.HashSet;
import java.util.stream.Collectors;

/** Candidate-wide admission is repeated at seal and promotion, never inferred from source=CALIBRATED. */
public final class CalibrationAdmission {
    private CalibrationAdmission() {}
    public static void validate(Envelope envelope,Result result,CalibrationPolicy policy) {
        policy.validatePins(envelope.itemPins());
        Calibration.require(envelope.formatVersion()==(policy.generic()?2:1));
        Calibration.require(result.origin()==envelope.origin() && result.algorithm().equals(policy.algorithm())
                && result.algorithmHash().equals(envelope.request().algorithmHash())
                && result.datasetHash().equals(envelope.request().datasetHash()) && result.generatingHash().equals(envelope.generatingHash())
                && java.util.Objects.equals(result.seed(),envelope.seed()) && result.items().size()==envelope.itemPins().size()
                && result.objectiveEvaluations()>0 && result.objectiveEvaluations()<=policy.maximumEvaluations());
        var pins=new HashSet<>(envelope.itemPins());
        Calibration.require(pins.size()==envelope.itemPins().size() && new HashSet<>(result.items().stream().map(ItemFit::pin).toList()).equals(pins));
        Calibration.require(result.items().stream().map(ItemFit::pin).toList().equals(envelope.itemPins()));
        var skills=new HashSet<String>();
        for (SkillFit skill:result.skills()) {
            Calibration.require(skills.add(skill.skillId()) && skill.converged() && skill.iterations()>=policy.stableIterations()
                    && skill.iterations()<=policy.maxEmIterations() && skill.subjects()>=policy.minimumSubjects()
                    && skill.subjects()<=policy.maximumSubjects() && skill.relativeChange()<=policy.relativeTolerance()
                    && skill.parameterChange()<=policy.parameterTolerance());
        }
        Calibration.require(skills.equals(pins.stream().map(ItemPin::skillId).collect(Collectors.toSet())));
        for (ItemFit item:result.items()) {
            Calibration.require((policy.generic()?Double.isFinite(item.a()) && item.a()>0 && Double.isFinite(item.b())
                    : item.a()>policy.minA()+policy.boundaryTolerance() && item.a()<policy.maxA()-policy.boundaryTolerance()
                      && item.b()>policy.minB()+policy.boundaryTolerance() && item.b()<policy.maxB()-policy.boundaryTolerance())
                    && item.c()==policy.fixedC() && !item.cEstimated() && item.observations()>=policy.minimumSubjects()
                    && item.observations()<=policy.maximumSubjects() && item.correct()>=policy.minimumCorrectAndWrong()
                    && item.observations()-item.correct()>=policy.minimumCorrectAndWrong()
                    && "UNAVAILABLE_NOT_VALIDATED".equals(item.uncertainty()));
        }
    }
}
