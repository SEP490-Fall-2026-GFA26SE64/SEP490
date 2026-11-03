package com.adaptlearngraph.repository;

import com.adaptlearngraph.dtos.TargetRoleFilter;
import com.adaptlearngraph.entities.domain.TargetRole;
import com.adaptlearngraph.entities.domain.TargetRoleId;

import java.util.List;
import java.util.Optional;

public interface TargetRoleRepository {
    boolean existsByOrganizationIdAndCode(String organizationId, String code);

    default boolean existsByOrganizationIdAndCodeAndVersion(String organizationId, String code, String version) {
        return existsByOrganizationIdAndCode(organizationId, code);
    }

    TargetRole save(TargetRole targetRole);

    List<TargetRole> findByOrganizationId(String organizationId, TargetRoleFilter filter);

    Optional<TargetRole> findById(String organizationId, TargetRoleId id);

    Optional<TargetRole> findByCode(String organizationId, String code);

    void deleteById(String organizationId, TargetRoleId id);
}

