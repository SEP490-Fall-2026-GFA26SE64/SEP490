# Making automated checks reliable

Content version 1.0. Local authored introduction awaiting expert review.

## Explanation

An automated test needs controlled setup, an action and an assertion tied to expected behaviour. Investigate failures before masking them with retries. A test that passes only after a retry may expose timing, shared state or an application problem. A workload measurement needs a defined environment and input rate to be interpretable.

## Worked example

Two tests share one account balance. One changes the balance and the other assumes the original value, so order affects the result. Give each test controlled data or reset the state explicitly. Repeated runs help investigate the cause; adding retries alone does not remove the shared-state dependency.

This is an illustrative teaching scenario, not a measured learner result.

## Check your understanding

Does passing on retry establish that the test is reliable?

Answer: No. It is evidence of inconsistent outcomes that still require investigation.

## Official learning resources

- [Playwright writing tests](https://playwright.dev/docs/writing-tests)
- [Playwright retries](https://playwright.dev/docs/test-retries)

These links supplement the local lesson. They do not imply endorsement of this course. Resource selection reviewed 12 October 2026.
