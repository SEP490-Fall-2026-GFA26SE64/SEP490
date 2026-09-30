package com.adaptlearngraph.catalog.application;

import com.adaptlearngraph.catalog.application.port.in.CreateTargetRoleCommand;
import com.adaptlearngraph.catalog.application.port.in.CreateTargetRoleUseCase;
import com.adaptlearngraph.catalog.application.port.in.ManageTargetRoleUseCase;
import com.adaptlearngraph.catalog.application.port.in.TargetRoleFilter;
import com.adaptlearngraph.catalog.application.port.in.UpdateTargetRoleCommand;
import com.adaptlearngraph.catalog.application.port.in.ViewTargetRolesUseCase;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleRepository;
import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.TargetRole;
import com.adaptlearngraph.catalog.domain.TargetRoleId;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

public class TargetRoleService implements CreateTargetRoleUseCase, ViewTargetRolesUseCase, ManageTargetRoleUseCase {
    private final TargetRoleRepository targetRoleRepository;

    public TargetRoleService(TargetRoleRepository targetRoleRepository) {
        this.targetRoleRepository = Objects.requireNonNull(targetRoleRepository, "targetRoleRepository cannot be null");
    }

    @Override
    public TargetRole createTargetRole(CreateTargetRoleCommand command) {
        Objects.requireNonNull(command, "command cannot be null");
        String normalizedCode = command.code() != null ? command.code().trim().toUpperCase() : "";
        if (targetRoleRepository.existsByOrganizationIdAndCode(command.organizationId(), normalizedCode)) {
            throw new DuplicateTargetRoleException(command.organizationId(), normalizedCode);
        }

        TargetRole targetRole = TargetRole.createNew(
                command.organizationId(),
                command.code(),
                command.name(),
                command.domainCode(),
                command.familyCode(),
                command.track(),
                command.assignedExpertId(),
                command.description());

        return targetRoleRepository.save(targetRole);
    }

    @Override
    public List<TargetRole> listTargetRoles(String organizationId, TargetRoleFilter filter) {
        Objects.requireNonNull(organizationId, "organizationId cannot be null");
        TargetRoleFilter safeFilter = filter != null ? filter : TargetRoleFilter.empty();
        return targetRoleRepository.findByOrganizationId(organizationId, safeFilter);
    }

    @Override
    public Optional<TargetRole> getTargetRole(String organizationId, TargetRoleId roleId) {
        Objects.requireNonNull(organizationId, "organizationId cannot be null");
        Objects.requireNonNull(roleId, "roleId cannot be null");
        return targetRoleRepository.findById(organizationId, roleId);
    }

    @Override
    public Optional<TargetRole> updateTargetRole(UpdateTargetRoleCommand command) {
        Objects.requireNonNull(command, "command cannot be null");
        Optional<TargetRole> existingOpt = targetRoleRepository.findById(command.organizationId(), command.roleId());
        if (existingOpt.isEmpty()) {
            return Optional.empty();
        }

        TargetRole existing = existingOpt.get();
        TargetRole updated = existing.updateDetails(
                command.name(),
                command.domainCode(),
                command.familyCode(),
                command.track(),
                command.assignedExpertId(),
                command.description());

        return Optional.of(targetRoleRepository.save(updated));
    }

    @Override
    public boolean deleteTargetRole(String organizationId, TargetRoleId roleId) {
        Objects.requireNonNull(organizationId, "organizationId cannot be null");
        Objects.requireNonNull(roleId, "roleId cannot be null");
        Optional<TargetRole> existingOpt = targetRoleRepository.findById(organizationId, roleId);
        if (existingOpt.isEmpty()) {
            return false;
        }

        // L&D Managers have the privilege to delete target roles (both DRAFT and PUBLISHED/ACTIVE)
        targetRoleRepository.deleteById(organizationId, roleId);
        return true;
    }
}

