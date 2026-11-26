# Prerequisite review table

Direction: dependent skill/knowledge → prerequisite skill/knowledge. Local proposed learning order, not automatic initial gap expansion. All rows need expert review.

| ID | Dependent | Prerequisite | Rationale |
|---|---|---|---|
| RQP-001 | User interaction design / FOUNDATION | Verifiable software requirements / FOUNDATION | Interface states require an understood user task. |
| RQP-002 | Accessible web interaction / FOUNDATION | Semantic HTML structure / FOUNDATION | Accessible controls depend on native element meanings. |
| RQP-003 | Accessible web interaction / INTERMEDIATE | Semantic HTML structure / FOUNDATION | Focus and naming decisions require semantic control knowledge. |
| RQP-004 | Responsive interface layout / FOUNDATION | Semantic HTML structure / FOUNDATION | Layout changes must preserve document structure. |
| RQP-005 | Responsive interface layout / INTERMEDIATE | Semantic HTML structure / FOUNDATION | Responsive composition requires meaningful source order. |
| RQP-006 | Application API contracts / FOUNDATION | Executable business logic / FOUNDATION | Request processing examples assume basic executable logic. |
| RQP-007 | Application API contracts / INTERMEDIATE | Verifiable software requirements / FOUNDATION | API behavior must reflect stated requirements. |
| RQP-008 | Component integration / FOUNDATION | Application API contracts / FOUNDATION | Integration interpretation requires an interface contract. |
| RQP-009 | Component integration / INTERMEDIATE | Application API contracts / INTERMEDIATE | Independent coordination requires explicit failure contracts. |
| RQP-010 | Asynchronous browser requests / FOUNDATION | Executable business logic / FOUNDATION | Request callbacks assume basic control-flow understanding. |
| RQP-011 | Asynchronous browser requests / INTERMEDIATE | Application API contracts / FOUNDATION | Client failures must distinguish response contract meanings. |
| RQP-012 | Application input validation / FOUNDATION | Executable business logic / FOUNDATION | Validation examples rely on predicates and branches. |
| RQP-013 | Resource authorization / FOUNDATION | Executable business logic / FOUNDATION | Permission decisions require conditional logic. |
| RQP-014 | Resource authorization / INTERMEDIATE | Application API contracts / FOUNDATION | Protected operations need a defined request boundary. |
| RQP-015 | Atomic data updates / FOUNDATION | Relational data queries / FOUNDATION | Atomic updates assume knowledge of data manipulation. |
| RQP-016 | Atomic data updates / INTERMEDIATE | Relational data queries / INTERMEDIATE | Concurrent update scenarios require independent query construction. |
| RQP-017 | Systematic defect diagnosis / FOUNDATION | Executable business logic / FOUNDATION | Diagnosis requires interpreting the failing program. |
| RQP-018 | Automated unit verification / FOUNDATION | Executable business logic / FOUNDATION | Unit assertions require understanding program outputs. |
| RQP-019 | Code review decisions / INTERMEDIATE | Executable business logic / INTERMEDIATE | Review of implementation depends on independent code comprehension. |
| RQP-020 | Behavior-preserving restructuring / INTERMEDIATE | Automated unit verification / INTERMEDIATE | Restructuring relies on regression checks around collaborators. |
| RQP-021 | Continuous integration workflows / FOUNDATION | Version-controlled collaboration / FOUNDATION | Pipeline triggers refer to identifiable source changes. |
| RQP-022 | Continuous integration workflows / INTERMEDIATE | Automated unit verification / FOUNDATION | Build verification needs interpretable automated test results. |
| RQP-023 | Controlled application release / INTERMEDIATE | Version-controlled collaboration / FOUNDATION | A repeatable release requires an identifiable revision. |
| RQP-024 | Application API contracts / ADVANCED | Verifiable software requirements / INTERMEDIATE | Compatibility decisions depend on explicit workflow constraints. |
| RQP-025 | Component integration / ADVANCED | Application API contracts / INTERMEDIATE | Recovery across services requires stable failure contracts. |
| RQP-026 | Asynchronous browser requests / ADVANCED | Application API contracts / INTERMEDIATE | Client coordination must respect repeat-request behavior. |
| RQP-027 | Resource authorization / ADVANCED | Application API contracts / INTERMEDIATE | Distributed permission checks need explicit operation contracts. |
| RQP-028 | Atomic data updates / ADVANCED | Relational data queries / INTERMEDIATE | Isolation analysis depends on understanding concurrent queries. |
| RQP-029 | Behavior-preserving restructuring / ADVANCED | Automated unit verification / INTERMEDIATE | Legacy restructuring requires independent regression-test design. |
| RQP-030 | Continuous integration workflows / ADVANCED | Version-controlled collaboration / INTERMEDIATE | Pipeline isolation depends on branch and change provenance. |
| RQP-031 | Controlled application release / ADVANCED | Version-controlled collaboration / INTERMEDIATE | Coexisting releases require reliable revision management. |
