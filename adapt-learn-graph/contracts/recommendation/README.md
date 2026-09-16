# Recommendation Contract

Reserved for approved JSON Schema documents and frozen request/response fixtures. This folder is shared by the Java computation adapter and Python tests; there is no accepted wire schema yet.

The architecture requires request identity, contract/algorithm versions, deterministic seed, input hash, catalog release, complete prerequisite subgraph, target requirements, profile/evidence status and progress snapshot. Results must echo identity/version/hash and contain eligible unique candidates, ordered future steps, reasons and explicit unresolved requirements.

Define canonical hashing, numeric precision, finite-number validation, UUID encoding, payload limits and error responses before implementing the subprocess. Java must validate returned IDs, eligibility, prerequisite ordering and versions before persisting a proposal. Unknown is not a zero mastery value. An error must not appear as an empty successful recommendation.