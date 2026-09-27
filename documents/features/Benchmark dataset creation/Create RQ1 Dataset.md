# Create RQ1 Dataset

**Function ID:** REQ-033-F01  
**Actor:** Platform Administrator  
**Status:** Pending clarification  
**Feature:** [Benchmark Dataset Creation](README.md)

## Description

Create the recommendation-relevance dataset. The registration specifies 500 synthetic profiles and an expert-annotated reference set of five relevant modules for 50 sample profiles.

**Input:** Synthetic profile configuration, graph/module data, and independently curated expert reference labels.  
**Outcome:** An RQ1 dataset suitable for comparing graph recommendations with Content-Based Filtering.

## Open Decisions

- Generation versus import/edit controls, profile distributions, and seed/version management.
- Who supplies annotations, annotation agreement, and reference-set validation.
- Holdout/tuning separation, configurable sample sizes, and exact Hit Rate@5 definition.

## Acceptance Baseline

Reference labels are distinguishable from algorithm output and synthetic profiles are isolated from operational employees.