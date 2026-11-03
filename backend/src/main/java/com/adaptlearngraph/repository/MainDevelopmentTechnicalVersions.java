package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.AdaptiveBlueprint.VersionPins;
import com.adaptlearngraph.utility.AdaptiveIrtPolicy;
import com.adaptlearngraph.config.MainDevelopmentBankSeed;
import com.adaptlearngraph.config.SoftwareDevelopmentSeed;
import com.adaptlearngraph.constants.LocalDemoIdentity;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

/** Exact main-seed projections, activated only by the explicit development gate. */
public final class MainDevelopmentTechnicalVersions implements AdaptiveTechnicalVersionPort {
    private record Seed(String occupation,VersionPins pins,String hash,String artifact,Map<UUID,ItemParameter> items){}
    private final AdaptiveTechnicalVersionPort delegate;private final DevelopmentTechnicalVersionJpaRepository versions;
    private final List<Seed> seeds;private final String model,mapping;
    public MainDevelopmentTechnicalVersions(DevelopmentTechnicalVersionJpaRepository versions,ObjectMapper json,AdaptiveTechnicalVersionPort delegate){
        this.delegate=delegate;this.versions=versions;
        try{model=json.writeValueAsString(AdaptiveIrtPolicy.referenceModelV1());mapping=json.writeValueAsString(AdaptiveIrtPolicy.referenceMappingV1());}
        catch(java.io.IOException invalid){throw new IllegalStateException(invalid);}
        seeds=List.of(seed(LocalDemoIdentity.OCC,new VersionPins(MainDevelopmentBankSeed.securityId("model-v1"),MainDevelopmentBankSeed.securityId("mapping-v1"),MainDevelopmentBankSeed.securityId("fitted-v1")),MainDevelopmentBankSeed.securityTechnicalHash(),"development:TechNova:Security:SYNTHETIC:"+MainDevelopmentBankSeed.projectionHash(LocalDemoIdentity.OCC)),
                seed(SoftwareDevelopmentSeed.OCCUPATION,new VersionPins(MainDevelopmentBankSeed.seId("model"),MainDevelopmentBankSeed.seId("mapping"),MainDevelopmentBankSeed.seId("parameters")),MainDevelopmentBankSeed.seTechnicalHash(),"development:SE:DECLARED_SYNTHETIC"));
    }
    private Seed seed(String occupation,VersionPins pins,String hash,String artifact){
        return new Seed(occupation,pins,hash,artifact,MainDevelopmentBankSeed.parameters(occupation).stream().collect(java.util.stream.Collectors.toUnmodifiableMap(ItemParameter::itemVersionId,p->p)));
    }
    public Optional<TechnicalVersions> findPromoted(UUID model,UUID mapping){return delegate.findPromoted(model,mapping);}
    public Optional<TechnicalVersions> findEffective(UUID org,UUID bank,UUID model,UUID mapping){
        if(MainDevelopmentBankSeed.ORGANIZATION.equals(org))for(var seed:seeds)
            if(MainDevelopmentBankSeed.bank(seed.occupation()).equals(bank) && seed.pins().modelVersionId().equals(model) && seed.pins().masteryMappingVersionId().equals(mapping))return findPinned(seed.pins());
        return delegate.findEffective(org,bank,model,mapping);
    }
    public Optional<TechnicalVersions> findPinned(VersionPins pins){
        var own=seeds.stream().filter(s->s.pins().equals(pins)).findFirst();if(own.isEmpty())return delegate.findPinned(pins);var s=own.get();
        return versions.mainDevelopmentPinned(MainDevelopmentBankSeed.ORGANIZATION,MainDevelopmentBankSeed.bank(s.occupation()),
                        s.pins().parameterSetId(),s.pins().modelVersionId(),s.pins().masteryMappingVersionId(),s.hash(),
                        MainDevelopmentBankSeed.id("ld"),model,mapping,s.artifact()).stream()
                .map(found->new TechnicalVersions(pins,model,mapping)).findFirst();
    }
    public List<ItemParameter> findParameters(VersionPins pins,Set<String> skills){
        var own=seeds.stream().filter(s->s.pins().equals(pins)).findFirst();if(own.isEmpty())return delegate.findParameters(pins,skills);
        if(skills.isEmpty() || findPinned(pins).isEmpty())return List.of();var s=own.get();
        return versions.parameters(s.pins().parameterSetId(),skills,MainDevelopmentBankSeed.bank(s.occupation()),Set.of("DRAFT")).stream().map(row->{
            var expected=s.items().get(row.itemVersionId());
            if(expected==null || !expected.microSkillId().equals(row.microSkillId())
                    || expected.a().compareTo(row.discriminationA())!=0 || expected.b().compareTo(row.difficultyB())!=0
                    || expected.c().compareTo(row.guessingC())!=0)throw new IllegalStateException("Main seed parameter drift");
            return expected;
        }).toList();
    }
}