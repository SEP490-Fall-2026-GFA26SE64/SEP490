# Making service boundaries explicit

Content version 1.0. Local authored introduction awaiting expert review.

## Explanation

An interface contract specifies input meaning, output meaning and failure behaviour. Validate inputs at the server boundary even if a browser already checks them. Authorization decides whether this caller may perform this operation on this resource. Related updates should commit together when partial completion would violate a business rule.

## Worked example

Transferring an item between two inventories must not remove it from the source without adding it to the destination. Execute the paired change within an appropriate transaction and demonstrate rollback after a forced failure. Separately test that a caller cannot transfer stock belonging to another account.

This is an illustrative teaching scenario, not a measured learner result.

## Check your understanding

Why is a valid request not necessarily an authorized request?

Answer: It can have correct syntax and values while the caller lacks permission for the resource.

## Official learning resources

- [MDN Fetch guide](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)

These links supplement the local lesson. They do not imply endorsement of this course. Resource selection reviewed 12 October 2026.
