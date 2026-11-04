package com.adaptlearngraph.repository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Discovery/ownership only; neither publication nor usable assessment resources are implied. */
public interface WorkspaceBaselineJobPositionPort {
    record JobPosition(String id,String name,boolean owned) {}
    List<JobPosition> list(UUID organization,Set<String> explicitlyGrantedSharedIds);
}
