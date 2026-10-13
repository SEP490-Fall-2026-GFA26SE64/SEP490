# Protecting the evaluation boundary

Content version 1.0. Local authored introduction awaiting expert review.

## Explanation

Define the prediction target and the information available at prediction time before constructing features. Separate training from evaluation before learning transformations. A random split is inappropriate when related records would cross the boundary or future information could enter training. Class frequencies help identify whether a summary metric hides poor minority-class performance.

## Worked example

For a next-month demand task, a feature calculated from the entire future month would not exist at prediction time. Remove that information and use a chronological split consistent with the intended deployment. Fit imputation or scaling only on training observations, then apply the learned transformation to held-out observations.

This is an illustrative teaching scenario, not a measured learner result.

## Check your understanding

Does fitting a scaler on the full dataset preserve the evaluation boundary?

Answer: No. Evaluation observations would influence the learned transformation.

## Official learning resources

- [scikit-learn common pitfalls](https://scikit-learn.org/stable/common_pitfalls.html)
- [scikit-learn cross-validation](https://scikit-learn.org/stable/modules/cross_validation.html)

These links supplement the local lesson. They do not imply endorsement of this course. Resource selection reviewed 12 October 2026.
