package com.adaptlearngraph.endpoints;

/** Base routes of every REST controller in {@code com.adaptlearngraph.apis}. */
public final class ApiEndpoints {
    public static final String API_V1 = "/api/v1";

    public static final String ADAPTIVE_ATTEMPT_ANSWER = API_V1 + "/employee/baseline-attempts/{attemptId}/answers";
    public static final String ADAPTIVE_ATTEMPT = API_V1 + "/employee/baseline-attempts";
    public static final String ADAPTIVE_ATTEMPT_RESULT = API_V1 + "/employee/baseline-attempts";
    public static final String ADAPTIVE_ATTEMPT_SUBMIT = API_V1 + "/employee/baseline-attempts/{attemptId}/submit";
    public static final String ADAPTIVE_BLUEPRINT = API_V1 + "/ld/adaptive-baseline-blueprints";
    public static final String ASSESSMENT_POLICY = API_V1 + "/ld/adaptive-baseline-policy";
    public static final String SCOPED_ASSESSMENT_POLICY = API_V1 + "/assessment-policies";
    public static final String BASELINE_ANSWER_REVIEW = API_V1 + "/ld/baseline-assessments";
    public static final String BASELINE_ASSESSMENT_MANAGEMENT = API_V1 + "/ld/baseline-assessments";
    public static final String BASELINE_BLUEPRINT = API_V1 + "/ld/baseline-blueprints";
    public static final String BASELINE_JOB_POSITION_CATALOG = API_V1 + "/ld/baseline-blueprint-catalog/job-positions";
    public static final String COMPETENCY = API_V1 + "/organizations/{organizationId}/competencies";
    public static final String CURRENT_ROLE_FLOW = API_V1 + "/employee";
    public static final String INITIAL_PATHWAY = API_V1;
    public static final String IRT_ADMINISTRATION = API_V1 + "/admin/irt/banks/{bankId}/models/{modelId}";
    public static final String LEARNING_CONTENT = API_V1 + "/module-management";
    public static final String LEARNING_MODULE = API_V1 + "/organizations/{organizationId}/modules";
    public static final String MICRO_SKILL = API_V1 + "/organizations/{organizationId}/micro-skills";
    public static final String MODULE_AUTHORING = API_V1 + "/module-management";
    public static final String ORGANIZATION_TARGET_ROLE = API_V1 + "/organizations/{organizationId}/target-roles";
    public static final String PLATFORM_CATALOG = API_V1 + "/platform-catalog";
    public static final String PREREQUISITE = API_V1 + "/organizations/{organizationId}/prerequisites";
    public static final String QUESTION_BANK = API_V1 + "/question-bank";
    public static final String REGISTRATION = API_V1 + "/registration";
    /** Guest-only closure preview; lives under the registration session scope so its CSRF token applies. */
    public static final String REGISTRATION_CATALOG_CLOSURE = REGISTRATION + "/catalog-closure";
    public static final String SYSTEM_STATUS = API_V1 + "/system";
    public static final String TARGET_ROLE = API_V1 + "/employee/target-roles";
    public static final String TARGET_ROLE_GRAPH = API_V1 + "/organizations/{organizationId}/target-roles/{roleId}/graph";
    public static final String TARGET_ROLE_SELECTION = API_V1 + "/employee/target-role-selection";
    public static final String WORKSPACE_AUTHENTICATION = API_V1 + "/workspace-auth";
    public static final String WORKSPACE_BASELINE_RESOURCE = API_V1 + "/ld/adaptive-baseline-resources/job-positions/{jobPositionId}";

    private ApiEndpoints() {
    }
}
