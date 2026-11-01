package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AdaptiveBlueprint.VersionPins;
import com.adaptlearngraph.constants.LocalDemoIdentity;
import com.adaptlearngraph.config.SoftwareDevelopmentSeed;
import com.adaptlearngraph.config.WorkspaceCatalogFixture;
import com.adaptlearngraph.config.WorkspaceCatalogFixture.Bank;
import java.util.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Declared synthetic copies owned by each test tenant. The operational resolver is never relaxed. */
public final class WorkspaceFixtureTechnicalVersions implements AdaptiveTechnicalVersionPort {
    private final AdaptiveTechnicalVersionPort delegate;
    private final NamedParameterJdbcTemplate jdbc;
    private final Map<VersionPins,Bank> banks;
    public WorkspaceFixtureTechnicalVersions(NamedParameterJdbcTemplate jdbc,WorkspaceCatalogFixture fixture,AdaptiveTechnicalVersionPort delegate) {
        this.jdbc=jdbc;this.delegate=delegate;var banks=new HashMap<VersionPins,Bank>();
        fixture.banks().forEach(bank->banks.put(pins(bank),bank));this.banks=Map.copyOf(banks);
    }
    private static VersionPins pins(Bank bank){return new VersionPins(bank.modelId(),bank.mappingId(),bank.parameterSetId());}
    private static VersionPins original(Bank bank) {
        return SoftwareDevelopmentSeed.OCCUPATION.equals(bank.occupationId())
                ?new VersionPins(SoftwareDevelopmentSeed.id("model"),SoftwareDevelopmentSeed.id("mapping"),SoftwareDevelopmentSeed.id("parameters"))
                :new VersionPins(LocalDemoIdentity.id("model-v1"),LocalDemoIdentity.id("mapping-v1"),LocalDemoIdentity.id("fitted-v1"));
    }
    static String hash(Bank bank) {
        try{return HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(
                ("WORKSPACE_PLATFORM_SYNTHETIC:"+bank.organizationId()+":"+bank.occupationId()).getBytes(java.nio.charset.StandardCharsets.UTF_8)));}
        catch(java.security.NoSuchAlgorithmException impossible){throw new IllegalStateException(impossible);}
    }
    @Override public Optional<TechnicalVersions> findPromoted(UUID model,UUID mapping) {
        if(banks.keySet().stream().anyMatch(p->p.modelVersionId().equals(model)))return Optional.empty();
        return delegate.findPromoted(model,mapping);
    }
    @Override public Optional<TechnicalVersions> findEffective(UUID org,UUID bank,UUID model,UUID mapping) {
        var match=banks.entrySet().stream().filter(e->e.getValue().organizationId().equals(org) && e.getValue().bankId().equals(bank)
                && e.getKey().modelVersionId().equals(model) && e.getKey().masteryMappingVersionId().equals(mapping)).findFirst();
        return match.isPresent()?findPinned(match.get().getKey()):delegate.findEffective(org,bank,model,mapping);
    }
    @Override public Optional<TechnicalVersions> findPinned(VersionPins pins) {
        var bank=banks.get(pins);if(bank==null)return delegate.findPinned(pins);
        var source=delegate.findPinned(original(bank));if(source.isEmpty())return Optional.empty();
        var key=new HashMap<String,Object>();key.put("org",bank.organizationId());key.put("bank",bank.bankId());key.put("ld",bank.ldId());
        key.put("model",bank.modelId());key.put("mapping",bank.mappingId());key.put("parameters",bank.parameterSetId());key.put("hash",hash(bank));
        key.put("version","WORKSPACE_PLATFORM_SYNTHETIC:"+bank.modelId());key.put("artifact","development:platform:"+bank.modelId());
        key.put("modelConfig",source.get().modelConfigurationJson());key.put("mappingConfig",source.get().mappingConfigurationJson());
        return jdbc.query("""
                SELECT 1 FROM platform.irt_parameter_set p
                JOIN platform.model_version m USING(model_version_id)
                JOIN platform.mastery_mapping_version v ON v.mastery_mapping_version_id=:mapping
                JOIN platform.question_bank b ON b.question_bank_id=:bank
                JOIN platform.account owner ON owner.account_id=b.created_by AND owner.organization_id=:org
                JOIN platform.organization_membership membership ON membership.account_id=:ld AND membership.organization_id=:org AND membership.active
                JOIN platform.organization_membership_role role USING(membership_id)
                WHERE p.parameter_set_id=:parameters AND p.model_version_id=:model AND p.source='SEEDED' AND p.status='PROMOTED'
                  AND p.parameter_hash=:hash AND p.activated_by=:ld AND p.activated_at IS NOT NULL
                  AND owner.active AND role.role_code='LD_MANAGER' AND b.created_by=:ld
                  AND m.algorithm='IRT_3PL' AND m.version=:version AND m.parameter_hash=:hash
                  AND m.configuration=CAST(:modelConfig AS jsonb) AND m.artifact_ref=:artifact
                  AND m.approved_by IS NULL AND m.approved_at IS NULL
                  AND v.mapping_type='LOGISTIC_CONSERVATIVE_V1' AND v.configuration=CAST(:mappingConfig AS jsonb)
                """,key,(rs,n)->new TechnicalVersions(pins,source.get().modelConfigurationJson(),source.get().mappingConfigurationJson())).stream().findFirst();
    }
    @Override public List<ItemParameter> findParameters(VersionPins pins,Set<String> skills) {
        var bank=banks.get(pins);if(bank==null)return delegate.findParameters(pins,skills);
        if(skills.isEmpty() || findPinned(pins).isEmpty())return List.of();
        var expected=new HashMap<UUID,ItemParameter>();var originals=delegate.findParameters(original(bank),skills);
        var hashes=new HashMap<UUID,String>();
        if(originals.isEmpty())return List.of();
        jdbc.query("SELECT item_version_id,content_hash FROM platform.item_version WHERE item_version_id IN (:ids)",
                Map.of("ids",originals.stream().map(ItemParameter::itemVersionId).toList()),rs->{
                    hashes.put(WorkspaceCatalogFixture.identity(bank.organizationId(),"item-version:"+rs.getObject(1,UUID.class)),rs.getString(2));
                });
        originals.forEach(p->{var id=WorkspaceCatalogFixture.identity(bank.organizationId(),"item-version:"+p.itemVersionId());
            expected.put(id,new ItemParameter(id,p.microSkillId(),p.a(),p.b(),p.c()));});
        var actual=jdbc.query("""
                SELECT i.item_version_id,i.micro_skill_id,i.discrimination_a,i.difficulty_b,i.guessing_c,v.content_hash
                FROM platform.irt_item_parameter i JOIN platform.item_version v USING(item_version_id)
                WHERE i.parameter_set_id=:parameters AND i.micro_skill_id IN (:skills) AND v.question_bank_id=:bank
                  AND v.micro_skill_id=i.micro_skill_id AND v.publication_state IN ('DRAFT','PUBLISHED')
                ORDER BY i.micro_skill_id,i.item_version_id
                """,Map.of("parameters",pins.parameterSetId(),"skills",skills,"bank",bank.bankId()),(rs,n)-> {
                    var value=new ItemParameter(rs.getObject(1,UUID.class),rs.getString(2),rs.getBigDecimal(3),rs.getBigDecimal(4),rs.getBigDecimal(5));
                    var original=expected.get(value.itemVersionId());
                    if(original==null || !original.microSkillId().equals(value.microSkillId()) || original.a().compareTo(value.a())!=0
                            || original.b().compareTo(value.b())!=0 || original.c().compareTo(value.c())!=0
                            || !Objects.equals(hashes.get(value.itemVersionId()),rs.getString(6)))throw new IllegalStateException("Workspace synthetic parameter/content drift");
                    return value;
                });
        if(!expected.keySet().equals(actual.stream().map(ItemParameter::itemVersionId).collect(java.util.stream.Collectors.toSet())))
            throw new IllegalStateException("Workspace synthetic parameter coverage drift");
        return List.copyOf(actual);
    }
}
