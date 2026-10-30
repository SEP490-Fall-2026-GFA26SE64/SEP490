package com.adaptlearngraph.assessment.adaptive.calibration.domain;

import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.*;
import java.util.HashSet;
import java.util.stream.Collectors;

/** Candidate-wide admission is repeated at seal and promotion, never inferred from source=CALIBRATED. */
public final class CalibrationAdmission {
    private CalibrationAdmission() {}
    public static void validate(Envelope envelope,Result result,CalibrationPolicy policy) {
        Calibration.require(result.origin()==envelope.origin() && result.algorithm().equals(policy.algorithm())
                && result.algorithmHash().equals(envelope.request().algorithmHash())
                && result.datasetHash().equals(envelope.request().datasetHash()) && result.generatingHash().equals(envelope.generatingHash())
                && java.util.Objects.equals(result.seed(),envelope.seed()) && result.items().size()==135 && result.skills().size()==15
                && result.objectiveEvaluations()>0 && result.objectiveEvaluations()<=policy.maximumEvaluations());
        var pins=new HashSet<>(envelope.itemPins());
        Calibration.require(pins.size()==135 && new HashSet<>(result.items().stream().map(ItemFit::pin).toList()).equals(pins));
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
            Calibration.require(item.a()>policy.minA()+policy.boundaryTolerance() && item.a()<policy.maxA()-policy.boundaryTolerance()
                    && item.b()>policy.minB()+policy.boundaryTolerance() && item.b()<policy.maxB()-policy.boundaryTolerance()
                    && item.c()==policy.fixedC() && !item.cEstimated() && item.observations()>=policy.minimumSubjects()
                    && item.observations()<=policy.maximumSubjects() && item.correct()>=policy.minimumCorrectAndWrong()
                    && item.observations()-item.correct()>=policy.minimumCorrectAndWrong()
                    && "UNAVAILABLE_NOT_VALIDATED".equals(item.uncertainty()));
        }
    }
}
