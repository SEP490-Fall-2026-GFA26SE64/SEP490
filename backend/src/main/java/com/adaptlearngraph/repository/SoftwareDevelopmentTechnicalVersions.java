package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.AdaptiveBlueprint.VersionPins;
import com.adaptlearngraph.utility.AdaptiveIrtPolicy;
import com.adaptlearngraph.config.SoftwareDevelopmentSeed;
import com.adaptlearngraph.constants.DevelopmentWorkspace;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

/** Activated only by DevelopmentTechnicalVersions wiring; exact SE tuple, never operational promotion. */
public final class SoftwareDevelopmentTechnicalVersions implements AdaptiveTechnicalVersionPort {
    private static final VersionPins PINS=new VersionPins(SoftwareDevelopmentSeed.id("model"),SoftwareDevelopmentSeed.id("mapping"),SoftwareDevelopmentSeed.id("parameters"));
    private final AdaptiveTechnicalVersionPort delegate;
    private final DevelopmentTechnicalVersionJpaRepository versions;
    private final String model,mapping;
    public SoftwareDevelopmentTechnicalVersions(DevelopmentTechnicalVersionJpaRepository versions,ObjectMapper json,AdaptiveTechnicalVersionPort delegate) {
        this.delegate=delegate;this.versions=versions;
        try {model=json.writeValueAsString(AdaptiveIrtPolicy.referenceModelV1());mapping=json.writeValueAsString(AdaptiveIrtPolicy.referenceMappingV1());}
        catch(java.io.IOException invalid){throw new IllegalStateException(invalid);}
    }
    public Optional<TechnicalVersions> findPromoted(UUID model,UUID mapping){return delegate.findPromoted(model,mapping);}
    public Optional<TechnicalVersions> findEffective(UUID org,UUID bank,UUID model,UUID mapping) {
        if(DevelopmentWorkspace.ORGANIZATION.equals(org) && SoftwareDevelopmentSeed.id("bank").equals(bank)
                && PINS.modelVersionId().equals(model) && PINS.masteryMappingVersionId().equals(mapping))return findPinned(PINS);
        return delegate.findEffective(org,bank,model,mapping);
    }
    public Optional<TechnicalVersions> findPinned(VersionPins pins) {
        if(!PINS.equals(pins))return delegate.findPinned(pins);
        return versions.softwareDevelopmentPinned(PINS.parameterSetId(),PINS.modelVersionId(),PINS.masteryMappingVersionId(),
                        SoftwareDevelopmentSeed.technicalHash(),DevelopmentWorkspace.id("ld"),model,mapping).stream()
                .map(found->new TechnicalVersions(PINS,model,mapping)).findFirst();
    }
    public List<ItemParameter> findParameters(VersionPins pins,Set<String> skills) {
        if(!PINS.equals(pins))return delegate.findParameters(pins,skills);
        if(skills.isEmpty() || findPinned(pins).isEmpty())return List.of();
        var items=versions.parameters(PINS.parameterSetId(),skills,SoftwareDevelopmentSeed.id("bank"),Set.of("DRAFT")).stream().map(row->{
                    var b=switch(row.difficulty()){case "EASY" -> -1;case "MEDIUM" -> 0;default -> 1;};
                    if(row.discriminationA().compareTo(new java.math.BigDecimal("1.5"))!=0
                            || row.difficultyB().compareTo(java.math.BigDecimal.valueOf(b))!=0
                            || row.guessingC().compareTo(new java.math.BigDecimal("0.25"))!=0)throw new IllegalStateException("SE parameter drift");
                    return new ItemParameter(row.itemVersionId(),row.microSkillId(),row.discriminationA(),row.difficultyB(),row.guessingC());
                }).toList();
        return List.copyOf(items);
    }
}