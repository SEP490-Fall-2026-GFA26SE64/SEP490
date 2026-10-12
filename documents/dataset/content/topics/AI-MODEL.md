# Separating model selection from final evaluation

Content version 1.0. Local authored introduction awaiting expert review.

## Explanation

A baseline establishes a comparison before additional complexity is introduced. Use a defined validation procedure to compare candidate models and settings. Keep final test evidence separate from iterative choices. A score should be accompanied by error patterns and the cost of the relevant mistake, rather than treated as the only selection criterion.

## Worked example

Imagine a defect detector where missing a defect is expensive. Compare candidates on the same partitions and inspect missed-defect examples. Selecting a model after repeatedly checking the final test set turns that set into selection evidence. Reserve final evaluation until the choice is fixed.

This is an illustrative teaching scenario, not a measured learner result.

## Check your understanding

Why must competing models share a valid evaluation procedure?

Answer: Otherwise differences may reflect the data split or leakage rather than model quality.

## Official learning resources

- [scikit-learn getting started](https://scikit-learn.org/stable/getting_started.html)
- [scikit-learn cross-validation](https://scikit-learn.org/stable/modules/cross_validation.html)
- [scikit-learn parameter search](https://scikit-learn.org/stable/modules/grid_search.html)

These links supplement the local lesson. They do not imply endorsement of this course. Resource selection reviewed 12 October 2026.
