# RIASEC Assessment

**Requirement:** REQ-047  
**Actor:** Employee  
**Status:** Implemented (UI & In-Page Assessment Flow)  
**Source:** [System Overview](../../adapt_learn_graph_system_overview.md)

## REQ-047-F01: Complete RIASEC Assessment

**Description:** Complete the configured 18-item interest assessment used with baseline evidence for AI-assisted target-role guidance. Runs natively within the assessment interface (`/employee/assessment`) alongside baseline diagnostics.
**Input:** Authorized Employee and 18 Likert-scale responses across Holland dimensions (Realistic, Investigative, Artistic, Social, Enterprising, Conventional).
**Outcome:** Recorded vocational orientation vectors and calculated 3-letter Holland Code (e.g. `ICR`) available for target-role matching and upskilling guidance.
**Policy:** Assessment is single-attempt and retakes are locked permanently upon calibration to preserve consistent profile calibration.
**URL:** `http://localhost:8088/employee/assessment` (Baseline tab).

**Acceptance:**
- Given an eligible Employee, navigating to `/employee/assessment?tab=baseline` provides the RIASEC assessment launcher.
- The RIASEC quiz taking view uses the exact same two-column layout as module assessments (`QUIZ NAVIGATION` numbered grid 1..18, live 15-minute countdown timer, question card with dimension badges and Likert choices A..E).
- Submitting the assessment persists the Holland code and vector breakdown, locks retakes permanently, and provides an in-page full report modal dialog.
- The standalone RIASEC sidebar tab is removed in favor of unified assessment management under `/employee/assessment`.