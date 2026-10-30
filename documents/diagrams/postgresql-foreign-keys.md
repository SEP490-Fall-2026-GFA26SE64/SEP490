# PostgreSQL foreign-key inventory

Generated from the same read-only V26 catalog. Each constraint, including composite keys, is listed. No data rows captured.

| Referencing table | Constraint | Definition |
| --- | --- | --- |
| `account` | `account_organization_id_fkey` | `FOREIGN KEY (organization_id) REFERENCES platform.organization(organization_id)` |
| `account` | `account_unit_id_fkey` | `FOREIGN KEY (unit_id) REFERENCES platform.organizational_unit(unit_id)` |
| `account` | `account_unit_org_fk` | `FOREIGN KEY (unit_id, organization_id) REFERENCES platform.organizational_unit(unit_id, organization_id)` |
| `account_role` | `account_role_account_id_fkey` | `FOREIGN KEY (account_id) REFERENCES platform.account(account_id)` |
| `account_role` | `account_role_role_code_fkey` | `FOREIGN KEY (role_code) REFERENCES platform.application_role(role_code)` |
| `activity_requirement` | `activity_requirement_activity_id_module_ref_id_manifest_ha_fkey` | `FOREIGN KEY (activity_id, module_ref_id, manifest_hash) REFERENCES platform.learning_activity(activity_id, module_ref_id, required_assessment_set_hash)` |
| `activity_requirement` | `activity_requirement_module_ref_id_assessment_version_id_r_fkey` | `FOREIGN KEY (module_ref_id, assessment_version_id, required, manifest_hash) REFERENCES platform.module_assessment_binding(module_ref_id, assessment_version_id, required, manifest_hash)` |
| `analytics_snapshot` | `analytics_snapshot_cohort_snapshot_id_fkey` | `FOREIGN KEY (cohort_snapshot_id) REFERENCES platform.cohort_snapshot(cohort_snapshot_id)` |
| `assessment_assignment` | `assessment_assignment_activity_id_assessment_version_id_fkey` | `FOREIGN KEY (activity_id, assessment_version_id) REFERENCES platform.activity_requirement(activity_id, assessment_version_id)` |
| `assessment_assignment` | `assessment_assignment_activity_id_learner_id_fkey` | `FOREIGN KEY (activity_id, learner_id) REFERENCES platform.learning_activity(activity_id, learner_id)` |
| `assessment_assignment` | `assessment_assignment_assessment_version_id_purpose_fkey` | `FOREIGN KEY (assessment_version_id, purpose) REFERENCES platform.assessment_version(assessment_version_id, purpose)` |
| `assessment_assignment` | `assessment_assignment_learner_id_fkey` | `FOREIGN KEY (learner_id) REFERENCES platform.learner_state(learner_id)` |
| `assessment_attempt` | `assessment_attempt_assignment_id_learner_id_assessment_ver_fkey` | `FOREIGN KEY (assignment_id, learner_id, assessment_version_id, activity_context) REFERENCES platform.assessment_assignment(assignment_id, learner_id, assessment_version_id, activity_context)` |
| `assessment_availability` | `assessment_availability_assessment_version_id_fkey` | `FOREIGN KEY (assessment_version_id) REFERENCES platform.assessment_version(assessment_version_id)` |
| `assessment_availability` | `assessment_availability_decided_by_fkey` | `FOREIGN KEY (decided_by) REFERENCES platform.account(account_id)` |
| `assessment_item` | `assessment_item_assessment_version_id_fkey` | `FOREIGN KEY (assessment_version_id) REFERENCES platform.assessment_version(assessment_version_id)` |
| `assessment_item` | `assessment_item_item_version_id_fkey` | `FOREIGN KEY (item_version_id) REFERENCES platform.item_version(item_version_id)` |
| `assessment_result` | `assessment_result_attempt_id_learner_id_assessment_version_fkey` | `FOREIGN KEY (attempt_id, learner_id, assessment_version_id, activity_context) REFERENCES platform.assessment_attempt(attempt_id, learner_id, assessment_version_id, activity_context)` |
| `assessment_version` | `assessment_version_blueprint_fk` | `FOREIGN KEY (blueprint_id, blueprint_version) REFERENCES platform.baseline_blueprint_version(blueprint_id, version)` |
| `assessment_version` | `assessment_version_created_by_fkey` | `FOREIGN KEY (created_by) REFERENCES platform.account(account_id)` |
| `assessment_version` | `assessment_version_reviewed_by_fkey` | `FOREIGN KEY (reviewed_by) REFERENCES platform.account(account_id)` |
| `audit_event` | `audit_event_actor_id_fkey` | `FOREIGN KEY (actor_id) REFERENCES platform.account(account_id)` |
| `baseline_adaptive_attempt` | `baseline_adaptive_attempt_blueprint_id_blueprint_version_t_fkey` | `FOREIGN KEY (blueprint_id, blueprint_version, target_role_id) REFERENCES platform.baseline_adaptive_blueprint_role(blueprint_id, blueprint_version, role_id)` |
| `baseline_adaptive_attempt` | `baseline_adaptive_attempt_learner_id_fkey` | `FOREIGN KEY (learner_id) REFERENCES platform.learner_state(learner_id)` |
| `baseline_adaptive_attempt` | `baseline_adaptive_attempt_learner_id_organization_id_fkey` | `FOREIGN KEY (learner_id, organization_id) REFERENCES platform.account(account_id, organization_id)` |
| `baseline_adaptive_attempt` | `baseline_adaptive_attempt_organization_id_occupation_id_bl_fkey` | `FOREIGN KEY (organization_id, occupation_id, blueprint_id, blueprint_version) REFERENCES platform.baseline_adaptive_blueprint_version(organization_id, occupation_id, blueprint_id, version)` |
| `baseline_adaptive_attempt` | `baseline_adaptive_attempt_replaces_attempt_id_organization_fkey` | `FOREIGN KEY (replaces_attempt_id, organization_id, learner_id, occupation_id) REFERENCES platform.baseline_adaptive_attempt(attempt_id, organization_id, learner_id, occupation_id)` |
| `baseline_adaptive_blueprint_role` | `baseline_adaptive_blueprint_r_blueprint_id_blueprint_versi_fkey` | `FOREIGN KEY (blueprint_id, blueprint_version) REFERENCES platform.baseline_adaptive_blueprint_version(blueprint_id, version)` |
| `baseline_adaptive_blueprint_skill` | `baseline_adaptive_blueprint_s_blueprint_id_blueprint_versi_fkey` | `FOREIGN KEY (blueprint_id, blueprint_version, role_id) REFERENCES platform.baseline_adaptive_blueprint_role(blueprint_id, blueprint_version, role_id)` |
| `baseline_adaptive_blueprint_version` | `baseline_adaptive_blueprint_v_blueprint_id_organization_id_fkey` | `FOREIGN KEY (blueprint_id, organization_id, occupation_id) REFERENCES platform.baseline_blueprint(blueprint_id, organization_id, occupation_id)` |
| `baseline_adaptive_blueprint_version` | `baseline_adaptive_blueprint_v_parameter_set_id_model_versi_fkey` | `FOREIGN KEY (parameter_set_id, model_version_id) REFERENCES platform.irt_parameter_set(parameter_set_id, model_version_id)` |
| `baseline_adaptive_blueprint_version` | `baseline_adaptive_blueprint_ver_created_by_organization_id_fkey` | `FOREIGN KEY (created_by, organization_id) REFERENCES platform.account(account_id, organization_id)` |
| `baseline_adaptive_blueprint_version` | `baseline_adaptive_blueprint_ver_mastery_mapping_version_id_fkey` | `FOREIGN KEY (mastery_mapping_version_id) REFERENCES platform.mastery_mapping_version(mastery_mapping_version_id)` |
| `baseline_adaptive_blueprint_version` | `baseline_adaptive_blueprint_version_model_version_id_fkey` | `FOREIGN KEY (model_version_id) REFERENCES platform.model_version(model_version_id)` |
| `baseline_adaptive_blueprint_working_revision` | `baseline_adaptive_blueprint_w_blueprint_id_organization_id_fkey` | `FOREIGN KEY (blueprint_id, organization_id, occupation_id) REFERENCES platform.baseline_blueprint(blueprint_id, organization_id, occupation_id)` |
| `baseline_adaptive_blueprint_working_revision` | `baseline_adaptive_blueprint_wor_created_by_organization_id_fkey` | `FOREIGN KEY (created_by, organization_id) REFERENCES platform.account(account_id, organization_id)` |
| `baseline_adaptive_blueprint_working_revision` | `baseline_adaptive_blueprint_wor_updated_by_organization_id_fkey` | `FOREIGN KEY (updated_by, organization_id) REFERENCES platform.account(account_id, organization_id)` |
| `baseline_answer_reveal_audit` | `baseline_answer_reveal_audit_actor_id_fkey` | `FOREIGN KEY (actor_id) REFERENCES platform.account(account_id)` |
| `baseline_answer_reveal_audit` | `baseline_answer_reveal_audit_assessment_version_id_fkey` | `FOREIGN KEY (assessment_version_id) REFERENCES platform.assessment_version(assessment_version_id)` |
| `baseline_answer_reveal_audit` | `baseline_answer_reveal_audit_organization_id_fkey` | `FOREIGN KEY (organization_id) REFERENCES platform.organization(organization_id)` |
| `baseline_assessment_series` | `baseline_assessment_series_active_assessment_version_id_fkey` | `FOREIGN KEY (active_assessment_version_id) REFERENCES platform.assessment_version(assessment_version_id)` |
| `baseline_assessment_series` | `baseline_assessment_series_blueprint_id_organization_id_oc_fkey` | `FOREIGN KEY (blueprint_id, organization_id, occupation_id) REFERENCES platform.baseline_blueprint(blueprint_id, organization_id, occupation_id)` |
| `baseline_assessment_series` | `baseline_assessment_series_blueprint_id_pending_blueprint__fkey` | `FOREIGN KEY (blueprint_id, pending_blueprint_version) REFERENCES platform.baseline_blueprint_version(blueprint_id, version)` |
| `baseline_assessment_series` | `baseline_assessment_series_open_assessment_version_id_fkey` | `FOREIGN KEY (open_assessment_version_id) REFERENCES platform.assessment_version(assessment_version_id)` |
| `baseline_assessment_series` | `baseline_assessment_series_organization_id_fkey` | `FOREIGN KEY (organization_id) REFERENCES platform.organization(organization_id)` |
| `baseline_assessment_series` | `baseline_assessment_series_working_revision_fk` | `FOREIGN KEY (working_revision_id) REFERENCES platform.baseline_blueprint_working_revision(working_revision_id)` |
| `baseline_assessment_transition` | `baseline_assessment_transitio_active_assessment_version_id_fkey` | `FOREIGN KEY (active_assessment_version_id) REFERENCES platform.assessment_version(assessment_version_id)` |
| `baseline_assessment_transition` | `baseline_assessment_transitio_organization_id_occupation_i_fkey` | `FOREIGN KEY (organization_id, occupation_id) REFERENCES platform.baseline_assessment_series(organization_id, occupation_id)` |
| `baseline_assessment_transition` | `baseline_assessment_transitio_pending_blueprint_id_pending_fkey` | `FOREIGN KEY (pending_blueprint_id, pending_blueprint_version) REFERENCES platform.baseline_blueprint_version(blueprint_id, version)` |
| `baseline_assessment_transition` | `baseline_assessment_transitio_previous_active_assessment_v_fkey` | `FOREIGN KEY (previous_active_assessment_version_id) REFERENCES platform.assessment_version(assessment_version_id)` |
| `baseline_assessment_transition` | `baseline_assessment_transitio_previous_open_assessment_ver_fkey` | `FOREIGN KEY (previous_open_assessment_version_id) REFERENCES platform.assessment_version(assessment_version_id)` |
| `baseline_assessment_transition` | `baseline_assessment_transitio_previous_pending_blueprint_i_fkey` | `FOREIGN KEY (previous_pending_blueprint_id, previous_pending_blueprint_version) REFERENCES platform.baseline_blueprint_version(blueprint_id, version)` |
| `baseline_assessment_transition` | `baseline_assessment_transitio_previous_working_revision_id_fkey` | `FOREIGN KEY (previous_working_revision_id) REFERENCES platform.baseline_blueprint_working_revision(working_revision_id)` |
| `baseline_assessment_transition` | `baseline_assessment_transition_actor_id_fkey` | `FOREIGN KEY (actor_id) REFERENCES platform.account(account_id)` |
| `baseline_assessment_transition` | `baseline_assessment_transition_open_assessment_version_id_fkey` | `FOREIGN KEY (open_assessment_version_id) REFERENCES platform.assessment_version(assessment_version_id)` |
| `baseline_assessment_transition` | `baseline_assessment_transition_working_revision_id_fkey` | `FOREIGN KEY (working_revision_id) REFERENCES platform.baseline_blueprint_working_revision(working_revision_id)` |
| `baseline_attempt_command` | `baseline_attempt_command_attempt_id_organization_id_actor__fkey` | `FOREIGN KEY (attempt_id, organization_id, actor_id, occupation_id) REFERENCES platform.baseline_adaptive_attempt(attempt_id, organization_id, learner_id, occupation_id)` |
| `baseline_attempt_item` | `baseline_attempt_item_attempt_id_organization_id_item_vers_fkey` | `FOREIGN KEY (attempt_id, organization_id, item_version_id, micro_skill_id) REFERENCES platform.baseline_attempt_pool_item(attempt_id, organization_id, item_version_id, micro_skill_id)` |
| `baseline_attempt_pool_item` | `baseline_attempt_pool_item_attempt_id_organization_id_micr_fkey` | `FOREIGN KEY (attempt_id, organization_id, micro_skill_id) REFERENCES platform.baseline_attempt_skill_state(attempt_id, organization_id, micro_skill_id)` |
| `baseline_attempt_pool_item` | `baseline_attempt_pool_item_attempt_id_parameter_set_id_fkey` | `FOREIGN KEY (attempt_id, parameter_set_id) REFERENCES platform.baseline_adaptive_attempt(attempt_id, parameter_set_id)` |
| `baseline_attempt_pool_item` | `baseline_attempt_pool_item_parameter_set_id_item_version_i_fkey` | `FOREIGN KEY (parameter_set_id, item_version_id, micro_skill_id) REFERENCES platform.irt_item_parameter(parameter_set_id, item_version_id, micro_skill_id)` |
| `baseline_attempt_response` | `baseline_attempt_response_attempt_id_organization_id_posit_fkey` | `FOREIGN KEY (attempt_id, organization_id, "position") REFERENCES platform.baseline_attempt_item(attempt_id, organization_id, "position")` |
| `baseline_attempt_result` | `baseline_attempt_result_attempt_id_organization_id_fkey` | `FOREIGN KEY (attempt_id, organization_id) REFERENCES platform.baseline_adaptive_attempt(attempt_id, organization_id)` |
| `baseline_attempt_result` | `baseline_attempt_result_mastery_event_id_fkey` | `FOREIGN KEY (mastery_event_id) REFERENCES platform.outbox_event(event_id)` |
| `baseline_attempt_skill_result` | `baseline_attempt_skill_result_attempt_id_organization_id_m_fkey` | `FOREIGN KEY (attempt_id, organization_id, micro_skill_id) REFERENCES platform.baseline_attempt_skill_state(attempt_id, organization_id, micro_skill_id)` |
| `baseline_attempt_skill_result` | `baseline_attempt_skill_result_mastery_mapping_version_id_fkey` | `FOREIGN KEY (mastery_mapping_version_id) REFERENCES platform.mastery_mapping_version(mastery_mapping_version_id)` |
| `baseline_attempt_skill_state` | `baseline_attempt_skill_state_attempt_id_organization_id_fkey` | `FOREIGN KEY (attempt_id, organization_id) REFERENCES platform.baseline_adaptive_attempt(attempt_id, organization_id)` |
| `baseline_blueprint` | `baseline_blueprint_created_by_fkey` | `FOREIGN KEY (created_by) REFERENCES platform.account(account_id)` |
| `baseline_blueprint` | `baseline_blueprint_organization_id_fkey` | `FOREIGN KEY (organization_id) REFERENCES platform.organization(organization_id)` |
| `baseline_blueprint_activation` | `baseline_blueprint_activation_activated_by_organization_id_fkey` | `FOREIGN KEY (activated_by, organization_id) REFERENCES platform.account(account_id, organization_id)` |
| `baseline_blueprint_activation` | `baseline_blueprint_activation_blueprint_id_organization_id_fkey` | `FOREIGN KEY (blueprint_id, organization_id, occupation_id) REFERENCES platform.baseline_blueprint(blueprint_id, organization_id, occupation_id)` |
| `baseline_blueprint_activation` | `baseline_blueprint_activation_organization_id_occupation_i_fkey` | `FOREIGN KEY (organization_id, occupation_id, blueprint_id, blueprint_version) REFERENCES platform.baseline_adaptive_blueprint_version(organization_id, occupation_id, blueprint_id, version)` |
| `baseline_blueprint_activation_event` | `baseline_blueprint_activatio_blueprint_id_organization_id_fkey1` | `FOREIGN KEY (blueprint_id, organization_id, occupation_id) REFERENCES platform.baseline_blueprint(blueprint_id, organization_id, occupation_id)` |
| `baseline_blueprint_activation_event` | `baseline_blueprint_activatio_organization_id_occupation_i_fkey1` | `FOREIGN KEY (organization_id, occupation_id) REFERENCES platform.baseline_blueprint_activation(organization_id, occupation_id)` |
| `baseline_blueprint_activation_event` | `baseline_blueprint_activatio_organization_id_occupation_i_fkey2` | `FOREIGN KEY (organization_id, occupation_id, blueprint_id, blueprint_version) REFERENCES platform.baseline_adaptive_blueprint_version(organization_id, occupation_id, blueprint_id, version)` |
| `baseline_blueprint_activation_event` | `baseline_blueprint_activation_eve_actor_id_organization_id_fkey` | `FOREIGN KEY (actor_id, organization_id) REFERENCES platform.account(account_id, organization_id)` |
| `baseline_blueprint_command` | `baseline_blueprint_command_actor_id_organization_id_fkey` | `FOREIGN KEY (actor_id, organization_id) REFERENCES platform.account(account_id, organization_id)` |
| `baseline_blueprint_command` | `baseline_blueprint_command_blueprint_id_organization_id_oc_fkey` | `FOREIGN KEY (blueprint_id, organization_id, occupation_id) REFERENCES platform.baseline_blueprint(blueprint_id, organization_id, occupation_id)` |
| `baseline_blueprint_role` | `baseline_blueprint_role_blueprint_id_blueprint_version_fkey` | `FOREIGN KEY (blueprint_id, blueprint_version) REFERENCES platform.baseline_blueprint_version(blueprint_id, version)` |
| `baseline_blueprint_skill` | `baseline_blueprint_skill_blueprint_id_blueprint_version_ro_fkey` | `FOREIGN KEY (blueprint_id, blueprint_version, role_id) REFERENCES platform.baseline_blueprint_role(blueprint_id, blueprint_version, role_id)` |
| `baseline_blueprint_version` | `baseline_blueprint_version_created_by_fkey` | `FOREIGN KEY (created_by) REFERENCES platform.account(account_id)` |
| `baseline_blueprint_version` | `baseline_blueprint_version_identity_fk` | `FOREIGN KEY (blueprint_id) REFERENCES platform.baseline_blueprint(blueprint_id)` |
| `baseline_blueprint_version_registry` | `baseline_blueprint_version_registry_blueprint_id_fkey` | `FOREIGN KEY (blueprint_id) REFERENCES platform.baseline_blueprint(blueprint_id)` |
| `baseline_blueprint_working_registry` | `baseline_blueprint_working_registry_blueprint_id_fkey` | `FOREIGN KEY (blueprint_id) REFERENCES platform.baseline_blueprint(blueprint_id)` |
| `baseline_blueprint_working_revision` | `baseline_blueprint_working_re_organization_id_occupation_i_fkey` | `FOREIGN KEY (organization_id, occupation_id) REFERENCES platform.baseline_assessment_series(organization_id, occupation_id)` |
| `baseline_blueprint_working_revision` | `baseline_blueprint_working_revis_blueprint_id_base_version_fkey` | `FOREIGN KEY (blueprint_id, base_version) REFERENCES platform.baseline_blueprint_version(blueprint_id, version)` |
| `baseline_blueprint_working_revision` | `baseline_blueprint_working_revision_created_by_fkey` | `FOREIGN KEY (created_by) REFERENCES platform.account(account_id)` |
| `baseline_blueprint_working_revision` | `baseline_blueprint_working_revision_updated_by_fkey` | `FOREIGN KEY (updated_by) REFERENCES platform.account(account_id)` |
| `baseline_management_command` | `baseline_management_command_actor_id_fkey` | `FOREIGN KEY (actor_id) REFERENCES platform.account(account_id)` |
| `baseline_management_command` | `baseline_management_command_organization_id_occupation_id_fkey` | `FOREIGN KEY (organization_id, occupation_id) REFERENCES platform.baseline_assessment_series(organization_id, occupation_id)` |
| `baseline_mastery_evidence` | `baseline_mastery_evidence_attempt_id_organization_id_learn_fkey` | `FOREIGN KEY (attempt_id, organization_id, learner_id, occupation_id) REFERENCES platform.baseline_adaptive_attempt(attempt_id, organization_id, learner_id, occupation_id)` |
| `baseline_mastery_evidence` | `baseline_mastery_evidence_attempt_id_organization_id_maste_fkey` | `FOREIGN KEY (attempt_id, organization_id, mastery_event_id) REFERENCES platform.baseline_attempt_result(attempt_id, organization_id, mastery_event_id)` |
| `baseline_mastery_evidence` | `baseline_mastery_evidence_attempt_id_organization_id_micro_fkey` | `FOREIGN KEY (attempt_id, organization_id, micro_skill_id) REFERENCES platform.baseline_attempt_skill_result(attempt_id, organization_id, micro_skill_id)` |
| `baseline_mastery_evidence` | `baseline_mastery_evidence_mastery_mapping_version_id_fkey` | `FOREIGN KEY (mastery_mapping_version_id) REFERENCES platform.mastery_mapping_version(mastery_mapping_version_id)` |
| `baseline_mastery_evidence` | `baseline_mastery_evidence_model_version_id_fkey` | `FOREIGN KEY (model_version_id) REFERENCES platform.model_version(model_version_id)` |
| `baseline_mastery_evidence` | `baseline_mastery_evidence_parameter_set_id_fkey` | `FOREIGN KEY (parameter_set_id) REFERENCES platform.irt_parameter_set(parameter_set_id)` |
| `catalog_reference` | `catalog_reference_release_id_fkey` | `FOREIGN KEY (release_id) REFERENCES platform.catalog_release(release_id)` |
| `cohort_member` | `cohort_member_after_profile_revision_id_learner_id_fkey` | `FOREIGN KEY (after_profile_revision_id, learner_id) REFERENCES platform.profile_revision(profile_revision_id, learner_id)` |
| `cohort_member` | `cohort_member_before_profile_revision_id_learner_id_fkey` | `FOREIGN KEY (before_profile_revision_id, learner_id) REFERENCES platform.profile_revision(profile_revision_id, learner_id)` |
| `cohort_member` | `cohort_member_cohort_snapshot_id_fkey` | `FOREIGN KEY (cohort_snapshot_id) REFERENCES platform.cohort_snapshot(cohort_snapshot_id)` |
| `cohort_member` | `cohort_member_learner_id_fkey` | `FOREIGN KEY (learner_id) REFERENCES platform.learner_state(learner_id)` |
| `cohort_snapshot` | `cohort_snapshot_created_by_fkey` | `FOREIGN KEY (created_by) REFERENCES platform.account(account_id)` |
| `cohort_snapshot` | `cohort_snapshot_role_ref_id_role_kind_fkey` | `FOREIGN KEY (role_ref_id, role_kind) REFERENCES platform.catalog_reference(catalog_ref_id, kind)` |
| `completion_pass` | `completion_pass_activity_id_assessment_version_id_fkey` | `FOREIGN KEY (activity_id, assessment_version_id) REFERENCES platform.activity_requirement(activity_id, assessment_version_id)` |
| `completion_pass` | `completion_pass_activity_id_learner_id_fkey` | `FOREIGN KEY (activity_id, learner_id) REFERENCES platform.module_completion(activity_id, learner_id)` |
| `completion_pass` | `completion_pass_attempt_id_learner_id_activity_id_assessme_fkey` | `FOREIGN KEY (attempt_id, learner_id, activity_id, assessment_version_id, passed) REFERENCES platform.assessment_result(attempt_id, learner_id, activity_id, assessment_version_id, passed)` |
| `employee_occupation_profile` | `employee_occupation_profile_attempt_id_organization_id_lea_fkey` | `FOREIGN KEY (attempt_id, organization_id, learner_id, occupation_id) REFERENCES platform.baseline_adaptive_attempt(attempt_id, organization_id, learner_id, occupation_id)` |
| `employee_occupation_profile` | `employee_occupation_profile_blueprint_id_blueprint_version_fkey` | `FOREIGN KEY (blueprint_id, blueprint_version) REFERENCES platform.baseline_adaptive_blueprint_version(blueprint_id, version)` |
| `employee_role_selection` | `employee_role_selection_learner_id_fkey` | `FOREIGN KEY (learner_id) REFERENCES platform.learner_state(learner_id)` |
| `employee_role_selection_request` | `employee_role_selection_request_selection_id_fkey` | `FOREIGN KEY (selection_id) REFERENCES platform.employee_role_selection(selection_id)` |
| `evaluation_artifact` | `evaluation_artifact_evaluation_run_id_fkey` | `FOREIGN KEY (evaluation_run_id) REFERENCES platform.evaluation_run(evaluation_run_id)` |
| `evaluation_run` | `evaluation_run_catalog_release_id_fkey` | `FOREIGN KEY (catalog_release_id) REFERENCES platform.catalog_release(release_id)` |
| `evaluation_run` | `evaluation_run_created_by_fkey` | `FOREIGN KEY (created_by) REFERENCES platform.account(account_id)` |
| `evaluation_run` | `evaluation_run_model_version_id_fkey` | `FOREIGN KEY (model_version_id) REFERENCES platform.model_version(model_version_id)` |
| `evaluation_run` | `evaluation_run_recommendation_version_id_fkey` | `FOREIGN KEY (recommendation_version_id) REFERENCES platform.recommendation_version(recommendation_version_id)` |
| `evidence_application` | `evidence_application_observation_id_learner_id_fkey` | `FOREIGN KEY (observation_id, learner_id) REFERENCES platform.evidence_observation(observation_id, learner_id)` |
| `evidence_application` | `evidence_application_profile_revision_id_learner_id_proces_fkey` | `FOREIGN KEY (profile_revision_id, learner_id, processing_stream_id) REFERENCES platform.profile_revision(profile_revision_id, learner_id, processing_stream_id)` |
| `evidence_observation` | `evidence_observation_attempt_id_item_position_item_version_fkey` | `FOREIGN KEY (attempt_id, item_position, item_version_id) REFERENCES platform.item_response(attempt_id, item_position, item_version_id)` |
| `evidence_observation` | `evidence_observation_attempt_id_learner_id_fkey` | `FOREIGN KEY (attempt_id, learner_id) REFERENCES platform.assessment_attempt(attempt_id, learner_id)` |
| `evidence_observation` | `evidence_observation_mapping_version_id_item_version_id_sk_fkey` | `FOREIGN KEY (mapping_version_id, item_version_id, skill_ref_id, weight) REFERENCES platform.item_skill_mapping(mapping_version_id, item_version_id, skill_ref_id, evidence_weight)` |
| `evidence_policy_version` | `evidence_policy_version_approved_by_fkey` | `FOREIGN KEY (approved_by) REFERENCES platform.account(account_id)` |
| `irt_calibration_run` | `irt_calibration_run_model_version_id_fkey` | `FOREIGN KEY (model_version_id) REFERENCES platform.model_version(model_version_id)` |
| `irt_calibration_run` | `irt_calibration_run_output_parameter_set_id_model_version__fkey` | `FOREIGN KEY (output_parameter_set_id, model_version_id) REFERENCES platform.irt_parameter_set(parameter_set_id, model_version_id)` |
| `irt_effective_parameter_selection` | `irt_effective_parameter_selec_parameter_set_id_model_versi_fkey` | `FOREIGN KEY (parameter_set_id, model_version_id) REFERENCES platform.irt_parameter_set(parameter_set_id, model_version_id)` |
| `irt_effective_parameter_selection` | `irt_effective_parameter_select_selected_by_organization_id_fkey` | `FOREIGN KEY (selected_by, organization_id) REFERENCES platform.account(account_id, organization_id)` |
| `irt_effective_parameter_selection` | `irt_effective_parameter_selection_model_version_id_fkey` | `FOREIGN KEY (model_version_id) REFERENCES platform.model_version(model_version_id)` |
| `irt_effective_parameter_selection` | `irt_effective_parameter_selection_organization_id_fkey` | `FOREIGN KEY (organization_id) REFERENCES platform.organization(organization_id)` |
| `irt_effective_parameter_selection` | `irt_effective_parameter_selection_question_bank_id_fkey` | `FOREIGN KEY (question_bank_id) REFERENCES platform.question_bank(question_bank_id)` |
| `irt_item_parameter` | `irt_item_parameter_item_version_id_micro_skill_id_fkey` | `FOREIGN KEY (item_version_id, micro_skill_id) REFERENCES platform.item_version(item_version_id, micro_skill_id)` |
| `irt_item_parameter` | `irt_item_parameter_parameter_set_id_fkey` | `FOREIGN KEY (parameter_set_id) REFERENCES platform.irt_parameter_set(parameter_set_id)` |
| `irt_parameter_promotion_command` | `irt_parameter_promotion_comma_expected_parameter_set_id_mo_fkey` | `FOREIGN KEY (expected_parameter_set_id, model_version_id) REFERENCES platform.irt_parameter_set(parameter_set_id, model_version_id)` |
| `irt_parameter_promotion_command` | `irt_parameter_promotion_comma_organization_id_question_ban_fkey` | `FOREIGN KEY (organization_id, question_bank_id, model_version_id) REFERENCES platform.irt_effective_parameter_selection(organization_id, question_bank_id, model_version_id)` |
| `irt_parameter_promotion_command` | `irt_parameter_promotion_comma_parameter_set_id_model_versi_fkey` | `FOREIGN KEY (parameter_set_id, model_version_id) REFERENCES platform.irt_parameter_set(parameter_set_id, model_version_id)` |
| `irt_parameter_promotion_command` | `irt_parameter_promotion_command_actor_id_organization_id_fkey` | `FOREIGN KEY (actor_id, organization_id) REFERENCES platform.account(account_id, organization_id)` |
| `irt_parameter_set` | `irt_parameter_set_activated_by_fkey` | `FOREIGN KEY (activated_by) REFERENCES platform.account(account_id)` |
| `irt_parameter_set` | `irt_parameter_set_model_version_id_fkey` | `FOREIGN KEY (model_version_id) REFERENCES platform.model_version(model_version_id)` |
| `item_response` | `item_response_assessment_version_id_item_position_item_ver_fkey` | `FOREIGN KEY (assessment_version_id, item_position, item_version_id) REFERENCES platform.assessment_item(assessment_version_id, item_position, item_version_id)` |
| `item_response` | `item_response_attempt_id_assessment_version_id_fkey` | `FOREIGN KEY (attempt_id, assessment_version_id) REFERENCES platform.assessment_attempt(attempt_id, assessment_version_id)` |
| `item_skill_mapping` | `item_skill_mapping_item_version_id_fkey` | `FOREIGN KEY (item_version_id) REFERENCES platform.item_version(item_version_id)` |
| `item_skill_mapping` | `item_skill_mapping_skill_ref_id_skill_kind_fkey` | `FOREIGN KEY (skill_ref_id, skill_kind) REFERENCES platform.catalog_reference(catalog_ref_id, kind)` |
| `item_version` | `item_version_question_bank_id_fkey` | `FOREIGN KEY (question_bank_id) REFERENCES platform.question_bank(question_bank_id)` |
| `learner_state` | `learner_state_learner_id_fkey` | `FOREIGN KEY (learner_id) REFERENCES platform.account(account_id)` |
| `learning_activity` | `learning_activity_learner_id_fkey` | `FOREIGN KEY (learner_id) REFERENCES platform.learner_state(learner_id)` |
| `learning_activity` | `learning_activity_module_ref_id_module_kind_fkey` | `FOREIGN KEY (module_ref_id, module_kind) REFERENCES platform.catalog_reference(catalog_ref_id, kind)` |
| `manager_scope` | `manager_scope_manager_id_fkey` | `FOREIGN KEY (manager_id) REFERENCES platform.account(account_id)` |
| `manager_scope` | `manager_scope_unit_id_fkey` | `FOREIGN KEY (unit_id) REFERENCES platform.organizational_unit(unit_id)` |
| `mastery_estimate` | `mastery_estimate_profile_revision_id_fkey` | `FOREIGN KEY (profile_revision_id) REFERENCES platform.profile_revision(profile_revision_id)` |
| `mastery_estimate` | `mastery_estimate_skill_ref_id_skill_kind_fkey` | `FOREIGN KEY (skill_ref_id, skill_kind) REFERENCES platform.catalog_reference(catalog_ref_id, kind)` |
| `model_version` | `model_version_approved_by_fkey` | `FOREIGN KEY (approved_by) REFERENCES platform.account(account_id)` |
| `module_assessment_binding` | `module_assessment_binding_assessment_version_id_assessment_fkey` | `FOREIGN KEY (assessment_version_id, assessment_purpose) REFERENCES platform.assessment_version(assessment_version_id, purpose)` |
| `module_assessment_binding` | `module_assessment_binding_module_ref_id_module_kind_fkey` | `FOREIGN KEY (module_ref_id, module_kind) REFERENCES platform.catalog_reference(catalog_ref_id, kind)` |
| `module_completion` | `module_completion_activity_id_learner_id_fkey` | `FOREIGN KEY (activity_id, learner_id) REFERENCES platform.learning_activity(activity_id, learner_id)` |
| `module_completion` | `module_completion_progress_revision_id_learner_id_fkey` | `FOREIGN KEY (progress_revision_id, learner_id) REFERENCES platform.progress_revision(progress_revision_id, learner_id)` |
| `organizational_unit` | `organizational_unit_organization_id_fkey` | `FOREIGN KEY (organization_id) REFERENCES platform.organization(organization_id)` |
| `organizational_unit` | `organizational_unit_parent_unit_id_fkey` | `FOREIGN KEY (parent_unit_id) REFERENCES platform.organizational_unit(unit_id)` |
| `pathway_approval` | `pathway_approval_administrator_id_fkey` | `FOREIGN KEY (administrator_id) REFERENCES platform.account(account_id)` |
| `pathway_approval` | `pathway_approval_pathway_revision_id_approved_hash_fkey` | `FOREIGN KEY (pathway_revision_id, approved_hash) REFERENCES platform.pathway_revision(pathway_revision_id, content_hash)` |
| `pathway_revision` | `pathway_revision_recommendation_run_id_learner_id_selectio_fkey` | `FOREIGN KEY (recommendation_run_id, learner_id, selection_id) REFERENCES platform.recommendation_run(recommendation_run_id, learner_id, selection_id)` |
| `pathway_step` | `pathway_step_activity_id_learner_id_fkey` | `FOREIGN KEY (activity_id, learner_id) REFERENCES platform.learning_activity(activity_id, learner_id)` |
| `pathway_step` | `pathway_step_pathway_revision_id_learner_id_fkey` | `FOREIGN KEY (pathway_revision_id, learner_id) REFERENCES platform.pathway_revision(pathway_revision_id, learner_id)` |
| `processing_job` | `processing_job_event_id_fkey` | `FOREIGN KEY (event_id) REFERENCES platform.outbox_event(event_id)` |
| `processing_job` | `processing_job_learner_id_fkey` | `FOREIGN KEY (learner_id) REFERENCES platform.learner_state(learner_id)` |
| `processing_job` | `processing_job_predecessor_job_id_fkey` | `FOREIGN KEY (predecessor_job_id) REFERENCES platform.processing_job(job_id)` |
| `processing_stream` | `processing_stream_learner_id_fkey` | `FOREIGN KEY (learner_id) REFERENCES platform.learner_state(learner_id)` |
| `processing_stream` | `processing_stream_model_version_id_fkey` | `FOREIGN KEY (model_version_id) REFERENCES platform.model_version(model_version_id)` |
| `processing_stream` | `processing_stream_policy_version_id_fkey` | `FOREIGN KEY (policy_version_id) REFERENCES platform.evidence_policy_version(policy_version_id)` |
| `profile_revision` | `profile_revision_processing_stream_id_learner_id_model_ver_fkey` | `FOREIGN KEY (processing_stream_id, learner_id, model_version_id, policy_version_id) REFERENCES platform.processing_stream(processing_stream_id, learner_id, model_version_id, policy_version_id)` |
| `progress_revision` | `progress_revision_learner_id_fkey` | `FOREIGN KEY (learner_id) REFERENCES platform.learner_state(learner_id)` |
| `publication_request` | `publication_request_actor_id_fkey` | `FOREIGN KEY (actor_id) REFERENCES platform.account(account_id)` |
| `publication_request` | `publication_request_pathway_revision_id_fkey` | `FOREIGN KEY (pathway_revision_id) REFERENCES platform.pathway_revision(pathway_revision_id)` |
| `question_bank` | `question_bank_created_by_fkey` | `FOREIGN KEY (created_by) REFERENCES platform.account(account_id)` |
| `recommendation_candidate` | `recommendation_candidate_module_ref_id_module_kind_fkey` | `FOREIGN KEY (module_ref_id, module_kind) REFERENCES platform.catalog_reference(catalog_ref_id, kind)` |
| `recommendation_candidate` | `recommendation_candidate_recommendation_run_id_fkey` | `FOREIGN KEY (recommendation_run_id) REFERENCES platform.recommendation_run(recommendation_run_id)` |
| `recommendation_run` | `recommendation_run_catalog_release_id_fkey` | `FOREIGN KEY (catalog_release_id) REFERENCES platform.catalog_release(release_id)` |
| `recommendation_run` | `recommendation_run_model_version_id_fkey` | `FOREIGN KEY (model_version_id) REFERENCES platform.model_version(model_version_id)` |
| `recommendation_run` | `recommendation_run_policy_version_id_fkey` | `FOREIGN KEY (policy_version_id) REFERENCES platform.evidence_policy_version(policy_version_id)` |
| `recommendation_run` | `recommendation_run_profile_revision_id_learner_id_fkey` | `FOREIGN KEY (profile_revision_id, learner_id) REFERENCES platform.profile_revision(profile_revision_id, learner_id)` |
| `recommendation_run` | `recommendation_run_profile_revision_id_model_version_id_po_fkey` | `FOREIGN KEY (profile_revision_id, model_version_id, policy_version_id) REFERENCES platform.profile_revision(profile_revision_id, model_version_id, policy_version_id)` |
| `recommendation_run` | `recommendation_run_progress_revision_id_learner_id_fkey` | `FOREIGN KEY (progress_revision_id, learner_id) REFERENCES platform.progress_revision(progress_revision_id, learner_id)` |
| `recommendation_run` | `recommendation_run_recommendation_version_id_fkey` | `FOREIGN KEY (recommendation_version_id) REFERENCES platform.recommendation_version(recommendation_version_id)` |
| `recommendation_run` | `recommendation_run_selection_id_learner_id_fkey` | `FOREIGN KEY (selection_id, learner_id) REFERENCES platform.target_selection(selection_id, learner_id)` |
| `recommendation_version` | `recommendation_version_approved_by_fkey` | `FOREIGN KEY (approved_by) REFERENCES platform.account(account_id)` |
| `roi_scenario` | `roi_scenario_cohort_snapshot_id_fkey` | `FOREIGN KEY (cohort_snapshot_id) REFERENCES platform.cohort_snapshot(cohort_snapshot_id)` |
| `roi_scenario` | `roi_scenario_owner_id_fkey` | `FOREIGN KEY (owner_id) REFERENCES platform.account(account_id)` |
| `session` | `session_account_id_fkey` | `FOREIGN KEY (account_id) REFERENCES platform.account(account_id)` |
| `target_selection` | `target_selection_learner_id_fkey` | `FOREIGN KEY (learner_id) REFERENCES platform.learner_state(learner_id)` |
| `target_selection` | `target_selection_role_ref_id_role_kind_fkey` | `FOREIGN KEY (role_ref_id, role_kind) REFERENCES platform.catalog_reference(catalog_ref_id, kind)` |
| `target_selection_request` | `target_selection_request_actor_id_fkey` | `FOREIGN KEY (actor_id) REFERENCES platform.account(account_id)` |
| `target_selection_request` | `target_selection_request_result_selection_id_actor_id_fkey` | `FOREIGN KEY (result_selection_id, actor_id) REFERENCES platform.target_selection(selection_id, learner_id)` |
