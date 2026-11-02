package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AdaptiveBlueprint.VersionPins;
import com.adaptlearngraph.services.AdaptiveBlueprintUseCase.Code;
import com.adaptlearngraph.services.AdaptiveBlueprintUseCase.Failure;
import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Global system-owned technical data, not tenant catalog authorization or an eligibility adapter. */
public final class JpaAdaptiveTechnicalVersionStore implements AdaptiveTechnicalVersionPort {
    private final IrtTechnicalVersionJpaRepository versions;

    public JpaAdaptiveTechnicalVersionStore(IrtTechnicalVersionJpaRepository versions) {
        this.versions = Objects.requireNonNull(versions, "versions");
    }

    @Override
    @Deprecated
    public Optional<TechnicalVersions> findPromoted(UUID modelVersionId, UUID mappingVersionId) {
        return first(() -> versions.promoted(modelVersionId, mappingVersionId));
    }

    @Override
    public Optional<TechnicalVersions> findEffective(UUID organizationId, UUID bankId, UUID modelVersionId, UUID mappingVersionId) {
        boolean locked = TransactionSynchronizationManager.isActualTransactionActive();
        return first(() -> locked ? versions.effectiveShared(organizationId, bankId, modelVersionId, mappingVersionId)
                : versions.effective(organizationId, bankId, modelVersionId, mappingVersionId));
    }

    @Override
    public Optional<TechnicalVersions> findPinned(VersionPins pins) {
        return first(() -> versions.pinned(pins.modelVersionId(), pins.masteryMappingVersionId(), pins.parameterSetId()));
    }

    @Override
    public List<ItemParameter> findParameters(VersionPins pins, Set<String> microSkillIds) {
        Objects.requireNonNull(pins, "pins");
        Set<String> skills = Set.copyOf(microSkillIds);
        if (skills.isEmpty()) return List.of();
        return read(() -> versions.parameters(pins.modelVersionId(), pins.masteryMappingVersionId(), pins.parameterSetId(), skills)
                .stream().map(row -> new ItemParameter((UUID) row[0], (String) row[1], (BigDecimal) row[2], (BigDecimal) row[3],
                        (BigDecimal) row[4])).toList());
    }

    private Optional<TechnicalVersions> first(Supplier<List<Object[]>> query) {
        return read(() -> query.get().stream().findFirst().map(row -> new TechnicalVersions(
                new VersionPins((UUID) row[1], (UUID) row[2], (UUID) row[0]), (String) row[3], (String) row[4])));
    }

    private static <T> T read(Supplier<T> operation) {
        try {
            return operation.get();
        } catch (DataAccessException cause) {
            Failure failure = new Failure(Code.DEPENDENCY_UNAVAILABLE, "Technical versions are unavailable", List.of());
            failure.initCause(cause);
            throw failure;
        }
    }
}