package com.adaptlearngraph.assessment.adaptive.application.port.out;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Discovery/ownership only; neither publication nor usable assessment resources are implied. */
public interface WorkspaceBaselineOccupationPort {
    record Occupation(String id,String name,boolean owned) {}
    List<Occupation> list(UUID organization,Set<String> explicitlyGrantedSharedIds);
}
