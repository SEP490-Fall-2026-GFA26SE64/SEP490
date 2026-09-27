# Export Organizational Report

**Function ID:** REQ-027-F01  
**Actor:** Organization Administrator  
**Status:** Pending clarification  
**Feature:** [Report Export](README.md)

## Description

Export learning, skill, and role statistics for the administrator's organization using the same data-access restrictions as on-screen reporting.

**Input:** Report type, reporting scope, and chosen supported format.  
**Outcome:** A downloadable report containing authorized data.

## Open Decisions

- CSV, XLSX, PDF, or multiple formats; required fields and branding.
- Current filters versus complete dataset; inclusion of employee-level details.
- Large-export processing, limits, download expiry, and empty-report behavior.

## Acceptance Baseline

Exporting cannot bypass organization isolation or expose fields that the administrator is not allowed to view.