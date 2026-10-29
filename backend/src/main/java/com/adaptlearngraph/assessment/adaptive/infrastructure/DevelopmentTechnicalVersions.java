package com.adaptlearngraph.assessment.adaptive.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveTechnicalVersionPort;
import com.adaptlearngraph.assessment.adaptive.demo.LocalDemoIdentity;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.VersionPins;
import com.adaptlearngraph.shared.infrastructure.DevelopmentWorkspace;
import java.util.*;

/** Exact synthetic development tuple only; all other scopes retain the real operational lookup. */
final class DevelopmentTechnicalVersions implements AdaptiveTechnicalVersionPort {
    private final AdaptiveTechnicalVersionPort delegate;
    private final VersionPins pins=new VersionPins(LocalDemoIdentity.id("model-v1"),LocalDemoIdentity.id("mapping-v1"),LocalDemoIdentity.id("fitted-v1"));
    DevelopmentTechnicalVersions(AdaptiveTechnicalVersionPort delegate) { this.delegate=delegate; }
    public Optional<TechnicalVersions> findPromoted(UUID model,UUID mapping) { return delegate.findPromoted(model,mapping); }
    public Optional<TechnicalVersions> findEffective(UUID org,UUID bank,UUID model,UUID mapping) {
        if(DevelopmentWorkspace.ORGANIZATION.equals(org) && LocalDemoIdentity.BANK.equals(bank)
                && pins.modelVersionId().equals(model) && pins.masteryMappingVersionId().equals(mapping)) return delegate.findPinned(pins);
        return delegate.findEffective(org,bank,model,mapping);
    }
    public Optional<TechnicalVersions> findPinned(VersionPins value) { return delegate.findPinned(value); }
    public List<ItemParameter> findParameters(VersionPins value,Set<String> skills) { return delegate.findParameters(value,skills); }
}
