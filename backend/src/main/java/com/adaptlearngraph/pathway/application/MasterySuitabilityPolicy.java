package com.adaptlearngraph.pathway.application;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPlanningPorts.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import com.adaptlearngraph.recommendation.domain.InitialSuitability;

/** Application policy, independent of graph driver/persistence/other owners' DTOs. */
public final class MasterySuitabilityPolicy implements SuitabilityPolicy {
    @Override public Suitability evaluate(Scope scope,Binding binding,Need need,Provider provider) {
        if(!InitialSuitability.VERSION.equals(binding.versions().get("suitability")))throw new Failure(503,"SUITABILITY_VERSION_UNAVAILABLE",false);
        var preferred=InitialSuitability.preferred(need);int rank=InitialSuitability.rank(preferred,provider.difficultyLevel());
        String origin=need.mastery()==null?"UNKNOWN:"+need.unknownReason():"MASTERY:"+need.mastery().toPlainString();
        return new Suitability(provider.teachingFocus()!=TeachingFocus.INCIDENTAL,rank,true,InitialSuitability.VERSION,
                origin+";PREFERRED:"+preferred+";OFFERED:"+provider.difficultyLevel());
    }
}
