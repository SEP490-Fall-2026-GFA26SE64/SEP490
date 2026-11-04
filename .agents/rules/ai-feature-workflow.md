# Feature Workflow Compatibility Entry

The canonical process is the [feature-implementation skill](../skills/feature-implementation/SKILL.md). Load it and follow its seven ordered stages; do not maintain another lifecycle definition in this file. [AGENTS.md](../../AGENTS.md) supplies the binding project/design safeguards.

In VS Code, select [Feature Implementer](../../.github/agents/feature-implementer.agent.md) or invoke `/feature-implementation` with a requirement/function ID, name or description. The skill links to the project context map and the temporary working-contract template.

## Backend Architecture & Persistence Standards (Spring Data & ModelMapper)

When implementing or modifying backend features, adhere strictly to the following data layer and mapping standards:
- **Relational Persistence (PostgreSQL)**: Use **Spring Data JPA** for ORM entities (`@Entity`) and `Repository` interfaces (`JpaRepository`).
- **Graph Persistence (Neo4j)**: Use **Spring Data Neo4j** for Neo4j entities (`@Node`, `@Relationship`) and Cypher query execution (repository methods and `@Query`).
- **Entity & DTO Mapping**: Use **ModelMapper** to convert between Entity and DTO (`entity -> dto`) and vice versa, preserving clean layer boundaries and avoiding exposing persistence entities directly to API controllers.

## Workflow Rules & Approval Checklist

Read-only discovery must identify existing behavior and reusable code before proposing only the missing or incorrect delta. Ask one single-choice question at a time and save each answer in a temporary working contract in session storage, not in feature READMEs. Application code, tests, migrations, dependencies and runtime configuration must wait for explicit user approval of the presented implementation revision. Material changes require renewed approval; a stored flag alone is not authorization.

After implementation and required verification are complete, update the affected feature README with concise outcomes, actors, inputs, business rules and relevant limitations. Keep planning/approval material temporary, test cases/evidence in testing documents and architecture details in technical documents. Preserve working capabilities instead of reimplementing them.

This file is a compatibility reference reached through project instructions. It does not claim that a `trigger: always_on` property causes native VS Code discovery. The approval checkpoint is instruction-based, not a runtime security lock. Respect host Plan-mode/tool restrictions and never bypass them with another editing mechanism.
