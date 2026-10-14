# Treating a pipeline as a sequence of contracts

Content version 1.0. Local authored introduction awaiting expert review.

## Explanation

Describe what each stage accepts and guarantees. Extraction acquires records, transformation applies explicit rules and loading persists agreed outputs. A mapping ties source meaning to target meaning. Orchestration handles dependencies and execution, while transformation code handles values. Plan what happens when a stage stops after partially writing output.

## Worked example

Suppose a run reads ten orders and fails after writing six. Repeating a blind append may produce sixteen records. Instead, identify records with stable keys and define replacement or upsert behaviour for the same input batch. Verify the final ten-record result after a retry; a successful process exit alone does not prove correctness.

This is an illustrative teaching scenario, not a measured learner result.

## Check your understanding

What makes the retry safe?

Answer: Repeated processing of the same logical input produces the intended final data rather than duplicates.

## Official learning resources

- [Airflow workflow tutorial](https://airflow.apache.org/docs/apache-airflow/stable/tutorial/fundamentals.html)

These links supplement the local lesson. They do not imply endorsement of this course. Resource selection reviewed 12 October 2026.
