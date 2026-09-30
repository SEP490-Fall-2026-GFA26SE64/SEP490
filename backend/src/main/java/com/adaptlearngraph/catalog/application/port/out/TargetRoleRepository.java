package com.adaptlearngraph.catalog.application.port.out;

import com.adaptlearngraph.catalog.application.port.in.TargetRoleFilter;
import com.adaptlearngraph.catalog.domain.TargetRole;
import com.adaptlearngraph.catalog.domain.TargetRoleId;

import java.util.List;
import java.util.Optional;

public interface TargetRoleRepository {
    boolean existsByOrganizationIdAndCode(String organizationId, String code);

    TargetRole save(TargetRole targetRole);

    List<TargetRole> findByOrganizationId(String organizationId, TargetRoleFilter filter);

    Optional<TargetRole> findById(String organizationId, TargetRoleId id);

    Optional<TargetRole> findByCode(String organizationId, String code);

    void deleteById(String organizationId, TargetRoleId id);
}

