param([string]$ComposeOverride)

$ErrorActionPreference = 'Stop'

$composeFile = Join-Path $PSScriptRoot '..\..\compose.dev.yml'
$sql = @'
SELECT json_build_object(
    'columns', (
        SELECT json_agg(json_build_object(
            'table', t.relname, 'name', a.attname,
            'type', format_type(a.atttypid, a.atttypmod),
            'required', a.attnotnull,
            'pk', EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = t.oid
                AND c.contype = 'p' AND a.attnum = ANY(c.conkey)),
            'fk', EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = t.oid
                AND c.contype = 'f' AND a.attnum = ANY(c.conkey))
        ) ORDER BY t.relname, a.attnum)
        FROM pg_class t
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a ON a.attrelid = t.oid
        WHERE n.nspname = 'platform' AND t.relkind = 'r'
            AND a.attnum > 0 AND NOT a.attisdropped
    ),
    'links', (
        SELECT json_agg(json_build_object('parent', edges.parent, 'child', edges.child)
            ORDER BY edges.parent, edges.child)
        FROM (
            SELECT DISTINCT parent.relname AS parent, child.relname AS child
            FROM pg_constraint c
            JOIN pg_class child ON child.oid = c.conrelid
            JOIN pg_class parent ON parent.oid = c.confrelid
            JOIN pg_namespace n ON n.oid = child.relnamespace
            WHERE n.nspname = 'platform' AND c.contype = 'f'
        ) edges
    )
)::text
'@

$composeArguments = @('compose', '-f', $composeFile)
if ($ComposeOverride) { $composeArguments += @('-f', $ComposeOverride) }
$json = & docker @composeArguments exec -T postgres psql -X -qAt -U adapt_learn_graph -d adapt_learn_graph -c $sql
if ($LASTEXITCODE -ne 0) {
    throw 'Cannot read the migrated development PostgreSQL schema.'
}
$catalog = ($json -join '') | ConvertFrom-Json

$groups = @(
    @{
        Name = 'Identity, catalog and processing'
        File = 'postgresql.puml'
        Tables = @('organization', 'organizational_unit', 'account', 'application_role',
            'account_role', 'manager_scope', 'session', 'organization_registration',
            'registration_email_verification', 'account_totp', 'account_recovery_code',
            'registration_rate_limit', 'registration_session', 'registration_session_attributes',
            'learner_state', 'catalog_guard',
            'catalog_release', 'catalog_reference', 'target_selection', 'target_selection_request', 'outbox_event',
            'processing_job', 'processing_receipt', 'audit_event')
    },
    @{
        Name = 'Subscriptions, payments and workspace membership'
        File = 'postgresql-subscription.puml'
        Tables = @('subscription_plan', 'subscription_plan_version', 'subscription_intent',
            'payment_order', 'payment_observation', 'payment_application', 'subscription',
            'subscription_period', 'organization_workspace', 'department_reference',
            'occupation_department_reference', 'organization_membership', 'organization_membership_role',
            'platform_administrator', 'workspace_account_profile', 'workspace_activation')
    },
    @{
        Name = 'Assessment and learning'
        File = 'postgresql-assessment.puml'
        Tables = @('evidence_policy_version', 'model_version', 'question_bank', 'item_version',
            'assessment_version', 'assessment_availability', 'assessment_item',
            'item_skill_mapping', 'module_assessment_binding', 'learning_activity',
            'activity_requirement', 'assessment_assignment', 'assessment_attempt',
            'item_response', 'assessment_result', 'evidence_observation',
            'processing_stream', 'profile_revision', 'mastery_estimate',
            'evidence_application', 'progress_revision', 'module_completion',
            'completion_pass', 'mastery_mapping_version', 'workspace_baseline_resource',
            'baseline_adaptive_attempt', 'baseline_adaptive_blueprint_role', 'baseline_adaptive_blueprint_skill',
            'baseline_adaptive_blueprint_version', 'baseline_adaptive_blueprint_working_revision',
            'baseline_answer_reveal_audit', 'baseline_assessment_series', 'baseline_assessment_transition',
            'baseline_attempt_command', 'baseline_attempt_item', 'baseline_attempt_pool_item',
            'baseline_attempt_response', 'baseline_attempt_result', 'baseline_attempt_skill_result',
            'baseline_attempt_skill_state', 'baseline_blueprint', 'baseline_blueprint_activation',
            'baseline_blueprint_activation_event', 'baseline_blueprint_command', 'baseline_blueprint_role',
            'baseline_blueprint_skill', 'baseline_blueprint_version', 'baseline_blueprint_version_registry',
            'baseline_blueprint_working_registry', 'baseline_blueprint_working_revision', 'baseline_management_command',
            'baseline_mastery_evidence', 'employee_occupation_profile', 'employee_role_selection',
            'employee_role_selection_request', 'irt_calibration_run', 'irt_effective_parameter_selection',
            'irt_item_parameter', 'irt_parameter_promotion_command', 'irt_parameter_set')
    },
    @{
        Name = 'Recommendation, analytics and evaluation'
        File = 'postgresql-pathway.puml'
        Tables = @('recommendation_version', 'recommendation_run', 'recommendation_candidate',
            'pathway_revision', 'pathway_step', 'pathway_approval', 'publication_request',
            'cohort_snapshot', 'cohort_member', 'analytics_snapshot', 'roi_scenario',
            'evaluation_run', 'evaluation_artifact')
    }
)

$groupedTables = @($groups | ForEach-Object { $_.Tables })
$actualTables = @($catalog.columns | Select-Object -ExpandProperty table -Unique)
if ($groupedTables.Count -ne $actualTables.Count -or
    (Compare-Object $groupedTables $actualTables)) {
    throw 'Diagram table groups do not match the migrated PostgreSQL tables.'
}

foreach ($group in $groups) {
    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add('@startuml')
    $lines.Add('!pragma layout smetana')
    $lines.Add('top to bottom direction')
    $lines.Add('skinparam shadowing false')
    $lines.Add("title PostgreSQL - $($group.Name)")

    foreach ($table in $group.Tables) {
        $lines.Add("class $table {")
        foreach ($column in @($catalog.columns | Where-Object { $_.table -eq $table })) {
            $nullable = if ($column.required) { '' } else { '?' }
            $keys = @()
            if ($column.pk) { $keys += 'PK' }
            if ($column.fk) { $keys += 'FK' }
            $suffix = if ($keys.Count) { ' [' + ($keys -join ', ') + ']' } else { '' }
            $lines.Add("    $($column.name)$nullable : $($column.type)$suffix")
        }
        $lines.Add('}')
    }

    foreach ($link in $catalog.links) {
        if ($group.Tables -contains $link.parent -and $group.Tables -contains $link.child) {
            $lines.Add("$($link.parent) --> $($link.child)")
        }
    }
    $lines.Add('@enduml')
    [System.IO.File]::WriteAllLines((Join-Path $PSScriptRoot $group.File), $lines,
        [System.Text.UTF8Encoding]::new($false))
    Write-Output "$($group.File): $($group.Tables.Count) tables"
}
