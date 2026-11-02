package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AdaptiveBlueprint.VersionPins;
import com.adaptlearngraph.constants.LocalDemoIdentity;
import com.adaptlearngraph.config.SoftwareDevelopmentSeed;
import com.adaptlearngraph.config.WorkspaceCatalogFixture;
import com.adaptlearngraph.config.WorkspaceCatalogFixture.Bank;
import java.util.*;

/** Declared synthetic copies owned by each test tenant. The operational resolver is never relaxed. */
public final class WorkspaceFixtureTechnicalVersions implements AdaptiveTechnicalVersionPort {
    private final AdaptiveTechnicalVersionPort delegate;
    private final DevelopmentTechnicalVersionJpaRepository versions;
    private final Map<VersionPins,Bank> banks;
    public WorkspaceFixtureTechnicalVersions(DevelopmentTechnicalVersionJpaRepository versions,WorkspaceCatalogFixture fixture,AdaptiveTechnicalVersionPort delegate) {
        this.versions=versions;this.delegate=delegate;var banks=new HashMap<VersionPins,Bank>();
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
        return versions.fixturePinned(bank.organizationId(),bank.bankId(),bank.ldId(),bank.modelId(),bank.mappingId(),bank.parameterSetId(),hash(bank),
                        "WORKSPACE_PLATFORM_SYNTHETIC:"+bank.modelId(),"development:platform:"+bank.modelId(),
                        source.get().modelConfigurationJson(),source.get().mappingConfigurationJson()).stream()
                .map(found->new TechnicalVersions(pins,source.get().modelConfigurationJson(),source.get().mappingConfigurationJson())).findFirst();
    }
    @Override public List<ItemParameter> findParameters(VersionPins pins,Set<String> skills) {
        var bank=banks.get(pins);if(bank==null)return delegate.findParameters(pins,skills);
        if(skills.isEmpty() || findPinned(pins).isEmpty())return List.of();
        var expected=new HashMap<UUID,ItemParameter>();var originals=delegate.findParameters(original(bank),skills);
        var hashes=new HashMap<UUID,String>();
        if(originals.isEmpty())return List.of();
        versions.contentHashes(originals.stream().map(ItemParameter::itemVersionId).toList()).forEach(row->
                hashes.put(WorkspaceCatalogFixture.identity(bank.organizationId(),"item-version:"+row.itemVersionId()),row.contentHash()));
        originals.forEach(p->{var id=WorkspaceCatalogFixture.identity(bank.organizationId(),"item-version:"+p.itemVersionId());
            expected.put(id,new ItemParameter(id,p.microSkillId(),p.a(),p.b(),p.c()));});
        var actual=versions.parameters(pins.parameterSetId(),skills,bank.bankId(),Set.of("DRAFT","PUBLISHED")).stream().map(row-> {
                    var value=new ItemParameter(row.itemVersionId(),row.microSkillId(),row.discriminationA(),row.difficultyB(),row.guessingC());
                    var original=expected.get(value.itemVersionId());
                    if(original==null || !original.microSkillId().equals(value.microSkillId()) || original.a().compareTo(value.a())!=0
                            || original.b().compareTo(value.b())!=0 || original.c().compareTo(value.c())!=0
                            || !Objects.equals(hashes.get(value.itemVersionId()),row.contentHash()))throw new IllegalStateException("Workspace synthetic parameter/content drift");
                    return value;
                }).toList();
        if(!expected.keySet().equals(actual.stream().map(ItemParameter::itemVersionId).collect(java.util.stream.Collectors.toSet())))
            throw new IllegalStateException("Workspace synthetic parameter coverage drift");
        return List.copyOf(actual);
    }
}
