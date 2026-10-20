package com.adaptlearngraph.assessment.adaptive.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBaselineCatalogPort;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintEligibilityPort;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveTechnicalVersionPort;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.*;
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
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** TMP-REQ002-03/05/07: read-only local integration, pending the owner's tenant/release/item-availability contract. */
public final class JdbcAdaptiveBlueprintEligibilityAdapter implements AdaptiveBlueprintEligibilityPort {
    @ConfigurationProperties("assessment.baseline.adaptive.eligibility")
    public record Properties(boolean enabled, UUID organizationId, Set<String> occupationIds, UUID questionBankId,
                             UUID modelVersionId, UUID masteryMappingVersionId) {
        public Properties { if (occupationIds != null) occupationIds = Set.copyOf(occupationIds); }
    }

    // Latest identity first: a draft/remapped/incomplete successor never resurrects an older published version.
    // Protected data is inspected only inside PostgreSQL; no answer/key/text leaves this query.
    private static final String ITEMS = """
            WITH latest AS (
                SELECT DISTINCT ON (item.item_id) item.* FROM platform.item_version item
                WHERE EXISTS (SELECT 1 FROM platform.item_version original
                    WHERE original.item_id=item.item_id AND original.question_bank_id=:bank)
                ORDER BY item.item_id,item.version DESC,item.item_version_id
            )
            SELECT item.item_version_id,item.micro_skill_id,item.content_hash
            FROM latest item
            JOIN platform.question_bank bank ON bank.question_bank_id=item.question_bank_id
            JOIN platform.account owner ON owner.account_id=bank.created_by AND owner.organization_id=:organization
            CROSS JOIN LATERAL (
                SELECT count(*) AS total,count(DISTINCT option->>'id') AS distinct_ids,
                    bool_and(coalesce(jsonb_typeof(option->'id')='string' AND btrim(option->>'id')<>''
                        AND option->>'id'=btrim(option->>'id') AND jsonb_typeof(option->'text')='string'
                        AND btrim(option->>'text')<>'',false)) AS valid,
                    bool_or(option->>'id'=item.protected_key->>'correctOptionId') AS has_key
                FROM jsonb_array_elements(CASE WHEN jsonb_typeof(item.response_schema->'options')='array'
                    THEN item.response_schema->'options' ELSE '[]'::jsonb END) option
            ) options
            WHERE item.question_bank_id=:bank AND item.publication_state='PUBLISHED'
                AND item.micro_skill_id IN (:skills) AND btrim(item.prompt)<>''
                AND btrim(item.micro_skill_name_snapshot)<>'' AND item.difficulty IN ('EASY','MEDIUM','HARD')
                AND item.response_schema->>'type'='SINGLE_CHOICE'
                AND jsonb_typeof(item.protected_key->'correctOptionId')='string'
                AND options.total>=2 AND options.total=options.distinct_ids AND options.valid AND options.has_key
            ORDER BY item.item_version_id
            """;
    private final NamedParameterJdbcTemplate jdbc;
    private final AdaptiveBaselineCatalogPort catalog;
    private final AdaptiveTechnicalVersionPort technical;
    private final AdaptiveBlueprintJson json;
    private final Properties settings;

    public JdbcAdaptiveBlueprintEligibilityAdapter(NamedParameterJdbcTemplate jdbc, AdaptiveBaselineCatalogPort catalog,
            AdaptiveTechnicalVersionPort technical, ObjectMapper mapper, Properties settings) {
        this.jdbc = Objects.requireNonNull(jdbc);
        this.catalog = Objects.requireNonNull(catalog);
        this.technical = Objects.requireNonNull(technical);
        this.json = new AdaptiveBlueprintJson(mapper);
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
            var params = new MapSqlParameterSource("bank", settings.questionBankId()).addValue("organization", scope.organizationId());
            Boolean allowed = jdbc.queryForObject("""
                    SELECT EXISTS (SELECT 1 FROM platform.question_bank bank JOIN platform.account owner ON owner.account_id=bank.created_by
                    WHERE bank.question_bank_id=:bank AND owner.organization_id=:organization)
                    """, params, Boolean.class);
            if (!Boolean.TRUE.equals(allowed)) return Optional.empty();
            var versions = pins.isPresent() ? technical.findPinned(pins.get())
                    : technical.findPromoted(settings.modelVersionId(), settings.masteryMappingVersionId());
            var selected = versions.orElseThrow(() -> new DependencyUnavailable("Approved technical versions unavailable", null)).pins();
            Set<String> skills = snapshot.roles().values().stream().flatMap(role -> role.skills().keySet().stream()).collect(Collectors.toSet());
            var parameters = technical.findParameters(selected, skills).stream().collect(Collectors.toMap(
                    AdaptiveTechnicalVersionPort.ItemParameter::itemVersionId, AdaptiveTechnicalVersionPort.ItemParameter::microSkillId));
            List<Item> items = skills.isEmpty() ? List.of() : jdbc.query(ITEMS, params.addValue("skills", skills),
                    (rs, row) -> new Item(rs.getObject("item_version_id", UUID.class), rs.getString("micro_skill_id"), rs.getString("content_hash")));
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
            return Optional.of(new Snapshot(scope, snapshot.occupationName(), fingerprint, selected, roles));
        } catch (DataAccessException | com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase.Failure
                 | IllegalArgumentException | IllegalStateException failure) {
            throw new DependencyUnavailable("Assessment eligibility is unavailable or inconsistent", failure);
        }
    }

    private record Item(UUID id, String skill, String hash) {}
}
