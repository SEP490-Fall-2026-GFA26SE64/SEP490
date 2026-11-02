package com.adaptlearngraph.repository;

import java.util.Objects;

/** Spring Data repositories behind the explicit local/development seed runners (never used by runtime flows). */
public record DevelopmentSeedRepositories(DevelopmentSeedJpaRepository identities, TechnicalVersionSeedJpaRepository technical,
        IrtItemParameterJpaRepository itemParameters, WorkspaceBaselineResourceJpaRepository resources,
        OfficialQuestionBankImportJpaRepository imports, QuestionBankJpaRepository banks, ItemVersionJpaRepository items,
        PostgresAdvisoryLocks locks) {

    public DevelopmentSeedRepositories {
        Objects.requireNonNull(identities); Objects.requireNonNull(technical); Objects.requireNonNull(itemParameters);
        Objects.requireNonNull(resources); Objects.requireNonNull(imports); Objects.requireNonNull(banks);
        Objects.requireNonNull(items); Objects.requireNonNull(locks);
    }

    /** Bean lookup, e.g. {@code BeanFactory::getBean}. */
    public interface Lookup {
        <T> T bean(Class<T> type);
    }

    public static DevelopmentSeedRepositories from(Lookup beans) {
        return new DevelopmentSeedRepositories(beans.bean(DevelopmentSeedJpaRepository.class), beans.bean(TechnicalVersionSeedJpaRepository.class),
                beans.bean(IrtItemParameterJpaRepository.class), beans.bean(WorkspaceBaselineResourceJpaRepository.class),
                beans.bean(OfficialQuestionBankImportJpaRepository.class), beans.bean(QuestionBankJpaRepository.class),
                beans.bean(ItemVersionJpaRepository.class), beans.bean(PostgresAdvisoryLocks.class));
    }
}
