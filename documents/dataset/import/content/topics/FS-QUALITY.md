# Building a repeatable change check

Content version 1.0. Local authored introduction awaiting expert review.

## Explanation

First reproduce the behaviour being changed. A focused test should distinguish the defect from the intended behaviour. Review the implementation against that purpose and run the relevant checks after modifying it. Continuous integration makes a defined check repeatable; it does not create a sound test oracle automatically.

## Worked example

A function incorrectly accepts a quantity of zero. Add a test specifying the expected rejection, observe the old failure and apply the change. Also retain a positive-quantity case so that rejecting every request is not mistaken for a fix. Run both in the automated workflow.

This is an illustrative teaching scenario, not a measured learner result.

## Check your understanding

Can a green build prove that the requirements were correct?

Answer: No. It shows that the configured checks passed; those checks still need review.

## Official learning resources

- [pytest getting started](https://docs.pytest.org/en/stable/getting-started.html)
- [GitHub Actions introduction](https://docs.github.com/en/actions/get-started/understand-github-actions)

These links supplement the local lesson. They do not imply endorsement of this course. Resource selection reviewed 12 October 2026.
