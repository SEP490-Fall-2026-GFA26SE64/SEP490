package com.adaptlearngraph.repository;

import com.adaptlearngraph.helper.AdaptiveBlueprintJson;
import com.adaptlearngraph.entities.AdaptiveBlueprint.*;
import com.adaptlearngraph.utility.AdaptiveIrtPolicy.Model;
import com.adaptlearngraph.utility.Irt3pl;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.dao.DataAccessException;

/** TMP-REQ002-03/05/07: read-only local integration, pending the owner's tenant/release/item-availability contract. */
public final class JpaAdaptiveBlueprintEligibilityAdapter implements AdaptiveBlueprintEligibilityPort {
    @ConfigurationProperties("assessment.baseline.adaptive.eligibility")
    public record Properties(boolean enabled, UUID organizationId, Set<String> occupationIds, UUID questionBankId,
                             UUID modelVersionId, UUID masteryMappingVersionId) {
        public Properties { if (occupationIds != null) occupationIds = Set.copyOf(occupationIds); }
    }

    private final boolean demoDraft;
    private final ItemVersionJpaRepository itemVersions;
    private final AdaptiveBaselineCatalogPort catalog;
    private final AdaptiveTechnicalVersionPort technical;
    private final AdaptiveBlueprintJson json;
    private final ObjectMapper policies;
    private final Properties settings;

    public JpaAdaptiveBlueprintEligibilityAdapter(ItemVersionJpaRepository items, AdaptiveBaselineCatalogPort catalog, AdaptiveTechnicalVersionPort technical, ObjectMapper mapper, Properties settings) { this(items, catalog, technical, mapper, settings, false); }

    public JpaAdaptiveBlueprintEligibilityAdapter(ItemVersionJpaRepository items, AdaptiveBaselineCatalogPort catalog, AdaptiveTechnicalVersionPort technical, ObjectMapper mapper, Properties settings, boolean demoDraft) {
        this.demoDraft = demoDraft;
        this.itemVersions = Objects.requireNonNull(items);
        this.catalog = Objects.requireNonNull(catalog);
        this.technical = Objects.requireNonNull(technical);
        this.json = new AdaptiveBlueprintJson(mapper);
        this.policies = mapper.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
                DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES, DeserializationFeature.FAIL_ON_NULL_CREATOR_PROPERTIES,
                DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES, DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                .enable(com.fasterxml.jackson.core.JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
                .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT);
        this.policies.setConfig(this.policies.getDeserializationConfig().without(MapperFeature.ALLOW_COERCION_OF_SCALARS));
        this.settings = Objects.requireNonNull(settings);
        Objects.requireNonNull(settings.organizationId(), "Explicit local organization required");
        Objects.requireNonNull(settings.questionBankId(), "Explicit local question bank required");
        Objects.requireNonNull(settings.modelVersionId(), "Explicit model version required");
        Objects.requireNonNull(settings.masteryMappingVersionId(), "Explicit mapping version required");
        if (settings.occupationIds() == null || settings.occupationIds().isEmpty()
                || settings.occupationIds().stream().anyMatch(id -> id == null || id.isBlank() || !id.equals(id.strip()))) {
            throw new IllegalArgumentException("Explicit canonical Occupation allowlist required");
        }
    }

    @Override public Optional<Snapshot> resolve(Scope scope) { return resolve(scope, Optional.empty()); }

    @Override public Optional<Snapshot> resolvePinned(Scope scope, VersionPins pins) {
        return resolve(scope, Optional.of(Objects.requireNonNull(pins)));
    }

    private Optional<Snapshot> resolve(Scope scope, Optional<VersionPins> pins) {
        if (!settings.organizationId().equals(scope.organizationId()) || !settings.occupationIds().contains(scope.occupationId())) {
            return Optional.empty();
        }
        try {
            var found = catalog.findAvailable(scope);
            if (found.isEmpty()) return Optional.empty();
            var snapshot = found.get();
            if (!scope.equals(snapshot.scope())) throw new IllegalStateException("Catalog scope mismatch");
            if (!itemVersions.bankOwnedBy(settings.questionBankId(), scope.organizationId())) return Optional.empty();
            var versions = pins.isPresent() ? technical.findPinned(pins.get())
                    : technical.findEffective(scope.organizationId(), settings.questionBankId(), settings.modelVersionId(), settings.masteryMappingVersionId());
            var technicalVersions = versions.orElseThrow(() -> new DependencyUnavailable("Approved technical versions unavailable", null));
            var selected = technicalVersions.pins();
            Model model = policies.readValue(technicalVersions.modelConfigurationJson(), Model.class);
            Set<String> skills = snapshot.roles().values().stream().flatMap(role -> role.skills().keySet().stream()).collect(Collectors.toSet());
            var parameterRows = technical.findParameters(selected, skills);
            var parameters = parameterRows.stream().collect(Collectors.toMap(
                    AdaptiveTechnicalVersionPort.ItemParameter::itemVersionId, AdaptiveTechnicalVersionPort.ItemParameter::microSkillId));
            List<Item> items = skills.isEmpty() ? List.of() : itemVersions.eligiblePool(scope.organizationId(), settings.questionBankId(),
                    skills, demoDraft).stream().map(row -> new Item((UUID) row[0], (String) row[1], (String) row[2])).toList();
            Set<UUID> published = items.stream().map(Item::id).collect(Collectors.toSet());
            parameterRows.stream().filter(item -> published.contains(item.itemVersionId())).forEach(item -> model.validate(
                    new Irt3pl.Item(item.itemVersionId(), item.microSkillId(), selected.parameterSetId(),
                            item.a().doubleValue(), item.b().doubleValue(), item.c().doubleValue())));
            var roles = new LinkedHashMap<String, RolePool>();
            snapshot.roles().forEach((id, role) -> {
                Set<UUID> covered = items.stream().filter(item -> role.skills().containsKey(item.skill()) && item.skill().equals(parameters.get(item.id())))
                        .map(Item::id).collect(Collectors.toSet());
                Set<UUID> missing = items.stream().filter(item -> role.skills().containsKey(item.skill()) && !covered.contains(item.id()))
                        .map(Item::id).collect(Collectors.toSet());
                roles.put(id, new RolePool(role, covered, missing));
            });
            var after = catalog.findAvailable(scope);
            if (after.isEmpty() || !scope.equals(after.get().scope()) || !snapshot.fingerprint().equals(after.get().fingerprint())) {
                throw new DependencyUnavailable("Catalog changed during eligibility resolution; retry", null);
            }
            // Parameter promotions alone must not stale a Blueprint whose exact pins are still usable.
            var manifest = new TreeSet<String>();
            items.forEach(item -> manifest.add(json.write(List.of(item.id(), item.skill(), item.hash()))));
            String fingerprint = AdaptiveBlueprintJson.hash("AB-ELIGIBILITY-V1:" + snapshot.fingerprint() + ":"
                    + scope.organizationId() + ":" + scope.occupationId() + ":" + settings.questionBankId() + ":" + json.write(manifest));
            var coverage = new Coverage(model.minimumPerSkill(), model.maxResponses(),
                    items.stream().collect(Collectors.toMap(Item::id, Item::skill)));
            return Optional.of(new Snapshot(scope, snapshot.occupationName(), fingerprint, selected, roles, coverage));
        } catch (DataAccessException | com.adaptlearngraph.services.AdaptiveBlueprintUseCase.Failure
                 | com.fasterxml.jackson.core.JsonProcessingException
                 | com.adaptlearngraph.utility.AdaptiveIrtPolicy.Failure
                 | IllegalArgumentException | IllegalStateException failure) {
            throw new DependencyUnavailable("Assessment eligibility is unavailable or inconsistent", failure);
        }
    }

    private record Item(UUID id, String skill, String hash) {}
}
