# Using explicit data quality rules

Content version 1.0. Local authored introduction awaiting expert review.

## Explanation

Profiling describes what data contains; a quality rule states what is acceptable. Keep these separate so an unusual value is not automatically labelled wrong. Make rule failures inspectable and trace them to a processing stage. Test the transformation itself as well as the final dataset. Access tests should demonstrate both an allowed action and a denied action.

## Worked example

A quantity field has values 1, 2 and -1. A profile reports the minimum as -1. Whether that is a defect depends on whether returns are allowed. Write the business rule first, then create a fixture containing a normal order, a permitted return and an invalid record. Keep the expected classification alongside the test.

This is an illustrative teaching scenario, not a measured learner result.

## Check your understanding

Why is a profile not a quality specification?

Answer: A profile reports observations; a specification determines which observations violate an agreed rule.

## Official learning resources

- [PostgreSQL tutorial](https://www.postgresql.org/docs/current/tutorial.html)
- [pytest getting started](https://docs.pytest.org/en/stable/getting-started.html)

These links supplement the local lesson. They do not imply endorsement of this course. Resource selection reviewed 12 October 2026.
