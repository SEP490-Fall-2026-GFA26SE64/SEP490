package com.adaptlearngraph.assessment.adaptive.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveTechnicalVersionPort;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.VersionPins;
import com.adaptlearngraph.assessment.adaptive.psychometrics.AdaptiveIrtPolicy;
import com.adaptlearngraph.assessment.infrastructure.SoftwareDevelopmentSeed;
import com.adaptlearngraph.shared.infrastructure.DevelopmentWorkspace;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import javax.sql.DataSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Activated only by DevelopmentTechnicalVersions wiring; exact SE tuple, never operational promotion. */
final class SoftwareDevelopmentTechnicalVersions implements AdaptiveTechnicalVersionPort {
    private static final VersionPins PINS=new VersionPins(SoftwareDevelopmentSeed.id("model"),SoftwareDevelopmentSeed.id("mapping"),SoftwareDevelopmentSeed.id("parameters"));
    private final AdaptiveTechnicalVersionPort delegate;
    private final NamedParameterJdbcTemplate jdbc;
    private final String model,mapping;
    SoftwareDevelopmentTechnicalVersions(DataSource source,ObjectMapper json,AdaptiveTechnicalVersionPort delegate) {
        this.delegate=delegate;this.jdbc=new NamedParameterJdbcTemplate(source);
        try {model=json.writeValueAsString(AdaptiveIrtPolicy.referenceModelV1());mapping=json.writeValueAsString(AdaptiveIrtPolicy.referenceMappingV1());}
        catch(java.io.IOException invalid){throw new IllegalStateException(invalid);}
    }
    private Map<String,Object> key() {return Map.of("set",PINS.parameterSetId(),"model",PINS.modelVersionId(),"mapping",PINS.masteryMappingVersionId(),
            "hash",SoftwareDevelopmentSeed.technicalHash(),"modelConfig",model,"mappingConfig",mapping,"fixtureActor",DevelopmentWorkspace.id("ld"));}
    public Optional<TechnicalVersions> findPromoted(UUID model,UUID mapping){return delegate.findPromoted(model,mapping);}
    public Optional<TechnicalVersions> findEffective(UUID org,UUID bank,UUID model,UUID mapping) {
        if(DevelopmentWorkspace.ORGANIZATION.equals(org) && SoftwareDevelopmentSeed.id("bank").equals(bank)
                && PINS.modelVersionId().equals(model) && PINS.masteryMappingVersionId().equals(mapping))return findPinned(PINS);
        return delegate.findEffective(org,bank,model,mapping);
    }
    public Optional<TechnicalVersions> findPinned(VersionPins pins) {
        if(!PINS.equals(pins))return delegate.findPinned(pins);
        return jdbc.query("""
                SELECT 1 FROM platform.irt_parameter_set p
                JOIN platform.model_version m USING(model_version_id)
                JOIN platform.mastery_mapping_version v ON v.mastery_mapping_version_id=:mapping
                WHERE p.parameter_set_id=:set AND p.model_version_id=:model AND p.source='SEEDED' AND p.status='PROMOTED'
                  AND p.parameter_hash=:hash AND p.activated_by=:fixtureActor AND p.activated_at IS NOT NULL
                  AND m.algorithm='IRT_3PL' AND m.version='WORKSPACE_SE_SYNTHETIC' AND m.parameter_hash=:hash
                  AND m.configuration=CAST(:modelConfig AS jsonb) AND m.approved_by IS NULL AND m.approved_at IS NULL
                  AND m.artifact_ref='development:SE:DECLARED_SYNTHETIC' AND v.mapping_type='LOGISTIC_CONSERVATIVE_V1'
                  AND v.configuration=CAST(:mappingConfig AS jsonb)
                """,key(),(rs,n)->new TechnicalVersions(PINS,model,mapping)).stream().findFirst();
    }
    public List<ItemParameter> findParameters(VersionPins pins,Set<String> skills) {
        if(!PINS.equals(pins))return delegate.findParameters(pins,skills);
        if(skills.isEmpty() || findPinned(pins).isEmpty())return List.of();
        var parameters=new HashMap<>(key());parameters.put("skills",skills);parameters.put("bank",SoftwareDevelopmentSeed.id("bank"));
        var items=jdbc.query("""
                SELECT i.item_version_id,i.micro_skill_id,i.discrimination_a,i.difficulty_b,i.guessing_c,v.difficulty,v.content_hash
                FROM platform.irt_item_parameter i JOIN platform.item_version v USING(item_version_id)
                WHERE i.parameter_set_id=:set AND i.micro_skill_id IN (:skills) AND v.question_bank_id=:bank
                  AND v.micro_skill_id=i.micro_skill_id AND v.publication_state='DRAFT'
                ORDER BY i.micro_skill_id,i.item_version_id
                """,parameters,(rs,n)->{
                    var b=switch(rs.getString(6)){case "EASY" -> -1;case "MEDIUM" -> 0;default -> 1;};
                    if(rs.getBigDecimal(3).compareTo(new java.math.BigDecimal("1.5"))!=0
                            || rs.getBigDecimal(4).compareTo(java.math.BigDecimal.valueOf(b))!=0
                            || rs.getBigDecimal(5).compareTo(new java.math.BigDecimal("0.25"))!=0)throw new IllegalStateException("SE parameter drift");
                    return new ItemParameter(rs.getObject(1,UUID.class),rs.getString(2),rs.getBigDecimal(3),rs.getBigDecimal(4),rs.getBigDecimal(5));
                });
        return List.copyOf(items);
    }
}
