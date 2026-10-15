# Selecting informative test cases

Content version 1.0. Local authored introduction awaiting expert review.

## Explanation

Start with the requirement and identify classes of inputs expected to behave alike. Ordered ranges also have boundaries where behaviour can change. Combine those cases with the likelihood and impact of failure to decide testing order. A test plan should say what is outside scope as well as what will be tested.

## Worked example

For an integer age field accepting 18 through 65, use valid and invalid classes. Boundary-focused cases include 17, 18, 19, 64, 65 and 66. The expected result comes from the stated requirement, not from whatever the current software happens to do.

This is an illustrative teaching scenario, not a measured learner result.

## Check your understanding

Why does boundary analysis depend on identifying the accepted range?

Answer: A boundary is meaningful only relative to the classes and rules that define expected behaviour.

## Official learning resources

- [ISTQB CTFL 4.0.1 syllabus](https://istqb.org/?download_id=3345&sdm_process_download=1)

These links supplement the local lesson. They do not imply endorsement of this course. Resource selection reviewed 12 October 2026.
