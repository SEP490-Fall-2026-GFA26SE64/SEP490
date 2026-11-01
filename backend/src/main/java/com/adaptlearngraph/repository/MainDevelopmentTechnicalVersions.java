package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AdaptiveBlueprint.VersionPins;
import com.adaptlearngraph.utility.AdaptiveIrtPolicy;
import com.adaptlearngraph.config.MainDevelopmentBankSeed;
import com.adaptlearngraph.config.SoftwareDevelopmentSeed;
import com.adaptlearngraph.constants.LocalDemoIdentity;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import javax.sql.DataSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Exact main-seed projections, activated only by the explicit development gate. */
public final class MainDevelopmentTechnicalVersions implements AdaptiveTechnicalVersionPort {
    private record Seed(String occupation,VersionPins pins,String hash,String artifact,Map<UUID,ItemParameter> items){}
    private final AdaptiveTechnicalVersionPort delegate;private final NamedParameterJdbcTemplate jdbc;
    private final List<Seed> seeds;private final String model,mapping;
    public MainDevelopmentTechnicalVersions(DataSource source,ObjectMapper json,AdaptiveTechnicalVersionPort delegate){
        this.delegate=delegate;jdbc=new NamedParameterJdbcTemplate(source);
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
    private Map<String,Object> key(Seed s){return Map.of("org",MainDevelopmentBankSeed.ORGANIZATION,"bank",MainDevelopmentBankSeed.bank(s.occupation()),
            "model",s.pins().modelVersionId(),"mapping",s.pins().masteryMappingVersionId(),"set",s.pins().parameterSetId(),"hash",s.hash(),
            "actor",MainDevelopmentBankSeed.id("ld"),"modelConfig",model,"mappingConfig",mapping,"artifact",s.artifact());}
    public Optional<TechnicalVersions> findPinned(VersionPins pins){
        var own=seeds.stream().filter(s->s.pins().equals(pins)).findFirst();if(own.isEmpty())return delegate.findPinned(pins);var s=own.get();
        return jdbc.query("""
                SELECT 1 FROM platform.irt_parameter_set p JOIN platform.model_version m USING(model_version_id)
                JOIN platform.mastery_mapping_version v ON v.mastery_mapping_version_id=:mapping
                WHERE p.parameter_set_id=:set AND p.model_version_id=:model AND p.source='SEEDED' AND p.status='PROMOTED' AND p.parameter_hash=:hash
                  AND p.activated_by=:actor AND p.activated_at IS NOT NULL AND m.algorithm='IRT_3PL'
                  AND m.parameter_hash=:hash AND m.configuration=CAST(:modelConfig AS jsonb) AND m.artifact_ref=:artifact
                  AND m.approved_by IS NULL AND m.approved_at IS NULL AND v.mapping_type='LOGISTIC_CONSERVATIVE_V1'
                  AND v.configuration=CAST(:mappingConfig AS jsonb)
                  AND EXISTS(SELECT 1 FROM platform.question_bank b JOIN platform.account a ON a.account_id=b.created_by
                    WHERE b.question_bank_id=:bank AND a.organization_id=:org AND a.active)
                """,key(s),(rs,n)->new TechnicalVersions(pins,model,mapping)).stream().findFirst();
    }
    public List<ItemParameter> findParameters(VersionPins pins,Set<String> skills){
        var own=seeds.stream().filter(s->s.pins().equals(pins)).findFirst();if(own.isEmpty())return delegate.findParameters(pins,skills);
        if(skills.isEmpty() || findPinned(pins).isEmpty())return List.of();var s=own.get();var p=new HashMap<>(key(s));p.put("skills",skills);
        return jdbc.query("""
                SELECT i.* FROM platform.irt_item_parameter i JOIN platform.item_version v USING(item_version_id,micro_skill_id)
                WHERE i.parameter_set_id=:set AND i.micro_skill_id IN(:skills) AND v.question_bank_id=:bank AND v.publication_state='DRAFT'
                ORDER BY i.micro_skill_id,i.item_version_id
                """,p,(rs,n)->{
            var expected=s.items().get(rs.getObject("item_version_id",UUID.class));
            if(expected==null || !expected.microSkillId().equals(rs.getString("micro_skill_id"))
                    || expected.a().compareTo(rs.getBigDecimal("discrimination_a"))!=0 || expected.b().compareTo(rs.getBigDecimal("difficulty_b"))!=0
                    || expected.c().compareTo(rs.getBigDecimal("guessing_c"))!=0)throw new IllegalStateException("Main seed parameter drift");
            return expected;
        });
    }
}
