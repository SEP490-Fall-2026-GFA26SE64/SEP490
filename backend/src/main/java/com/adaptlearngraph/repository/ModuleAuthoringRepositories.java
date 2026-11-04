package com.adaptlearngraph.repository;

import java.util.Objects;

/** Spring Data repositories behind {@link JpaModuleAuthoringAdapter}. */
public record ModuleAuthoringRepositories(ModuleAuthoringJpaRepository documents, ModuleCatalogIntakeJpaRepository intakes,
        ModuleJobPositionGrantJpaRepository grants, ModuleGrantAuditJpaRepository grantAudit,
        ModuleAuthoringContentJpaRepository contents, ModuleLearningPinJpaRepository pins,
        ModuleAuthoringDirectoryJpaRepository directory, PostgresAdvisoryLocks locks) {

    public ModuleAuthoringRepositories {
        Objects.requireNonNull(documents); Objects.requireNonNull(intakes); Objects.requireNonNull(grants);
        Objects.requireNonNull(grantAudit); Objects.requireNonNull(contents); Objects.requireNonNull(pins);
        Objects.requireNonNull(directory); Objects.requireNonNull(locks);
    }

    public static ModuleAuthoringRepositories from(AdaptiveAttemptRepositories.Lookup beans, PostgresAdvisoryLocks locks) {
        return new ModuleAuthoringRepositories(beans.bean(ModuleAuthoringJpaRepository.class),
                beans.bean(ModuleCatalogIntakeJpaRepository.class), beans.bean(ModuleJobPositionGrantJpaRepository.class),
                beans.bean(ModuleGrantAuditJpaRepository.class), beans.bean(ModuleAuthoringContentJpaRepository.class),
                beans.bean(ModuleLearningPinJpaRepository.class), beans.bean(ModuleAuthoringDirectoryJpaRepository.class), locks);
    }
}
