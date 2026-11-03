# TECH — Persistence refactor: unit, architecture and mapping evidence

Date: 2026-11-03. Scope: persistence/DTO refactor (no product REQ). Commands ran from `backend` with the Maven wrapper; results are included in the full runs listed in the [integration evidence](../integration/TECH-orm-persistence-refactor-20261103.md).

## Architecture rules (`LayeredArchitectureTest`, 9 rules, Passed)

| Rule | Purpose |
| --- | --- |
| `domainModelIsPersistenceFree` / `domainPackageIsPersistenceFree` | Only `@Entity`/`@Embeddable`/`@MappedSuperclass` classes use JPA/Hibernate; `entities.domain` depends on no persistence or Spring Data API |
| `graphMappingsUseOnlySdnMappingMetadata` | `@Node` read models use only SDN mapping/converter packages |
| Controller boundary | `apis`/`endpoints`/`advice` do not depend on `entities..` or `repository..` |
| Controller signatures | No non-private controller method accepts or returns an `@Entity`/`@Node`/`entities` type |
| Existing layer rules | Unchanged |

## Repository surface (`RepositoryTenantSurfaceTest`, Passed)

Organization-owned JPA and SDN repositories extend only Spring Data `Repository` (+ `InsertOnlyRepository`), so no unscoped `findById`/`findAll`/`save`/`delete` is inherited.

## ModelMapper TypeMaps (Passed)

All tests build the mapper with `ModelMapperFactory.create(...)` (STRICT, `skipNull=false`, record module, `validate()`), assert every DTO value, the DTO component names and the serialized JSON.

| Test | Sensitive data proven absent |
| --- | --- |
| `RegistrationMappingsTest` | Encrypted TOTP secret, password/hash, tokens, session ids (manual secret and recovery codes are still returned once, as before) |
| `SubscriptionMappingsTest` | Payment signature/checksum/key fields, plan `createdBy` |
| `CatalogMappingsTest` | Other organizations' data; target-role response keeps exactly its previous fields |
| `BaselineAuthoringMappingsTest` | Creator, idempotency keys, request hashes, generation seed, reviewer, assessment answer keys |
| `IrtAdministrationMappingsTest` | Worker token, lease expiry and run envelope (fitted a/b/c stay visible to administrators as before) |
| `QuestionBankMappingsTest` | Bank organization (correct answer/explanation stay visible to staff as before) |
| `ModuleAuthoringMappingsTest`, `AssessmentPolicyMappingsTest`, `InitialPathwayMappingsTest` | Server-managed fields and stored request hashes |
| `ApplicationMappingsTest` | All 16 registrars load and validate together |

ModelMapper cannot instantiate records without converters and `validate()` sees no setters on record destinations, so these value assertions are the effective guard.

## Controller tests

Existing WebMvc tests now load the real application services and mappings while mocking the underlying use cases, so every original JSON assertion still runs. Added controller tests (`AdaptiveAttemptControllerTest`, `AssessmentPolicyControllerTest`, `IrtAdministrationControllerTest`, `LearningContentControllerTest`, `ModuleAuthoringControllerTest`, `QuestionBankControllerTest`, `WorkspaceBaselineResourceControllerTest`) prove translated store exceptions keep the same status and error code.

Known intentional change: `PUT .../upload-settings` ignores client-supplied `changedBy`/`changedAt` (mass-assignment guard); the settings row still records the trusted actor.
