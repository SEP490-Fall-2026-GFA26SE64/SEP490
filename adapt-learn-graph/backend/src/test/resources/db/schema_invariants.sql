DO $$
DECLARE
    learner uuid := gen_random_uuid();
    other_learner uuid := gen_random_uuid();
    release uuid := gen_random_uuid();
    skill uuid := gen_random_uuid();
    module uuid := gen_random_uuid();
    bank uuid := gen_random_uuid();
    item uuid := gen_random_uuid();
    assessment uuid := gen_random_uuid();
    activity uuid := gen_random_uuid();
    other_activity uuid := gen_random_uuid();
    assignment uuid := gen_random_uuid();
    attempt uuid := gen_random_uuid();
    failed_attempt uuid := gen_random_uuid();
    progress uuid := gen_random_uuid();
    model uuid := gen_random_uuid();
    policy uuid := gen_random_uuid();
    stream uuid := gen_random_uuid();
    profile uuid := gen_random_uuid();
BEGIN
    INSERT INTO platform.account(account_id, identifier, normalized_identifier, password_hash)
        VALUES (learner, learner::text, learner::text, 'synthetic-only'), (other_learner, other_learner::text, other_learner::text, 'synthetic-only');
    INSERT INTO platform.learner_state(learner_id) VALUES (learner), (other_learner);
    INSERT INTO platform.catalog_release VALUES (release, 2, repeat('b',64), gen_random_uuid(), now());
    INSERT INTO platform.catalog_reference VALUES
        (skill, gen_random_uuid(), gen_random_uuid(), release, 'MICRO_SKILL', repeat('b',64), now()),
        (module, gen_random_uuid(), gen_random_uuid(), release, 'LEARNING_MODULE', repeat('b',64), now());
    INSERT INTO platform.question_bank(question_bank_id, name, created_by) VALUES (bank, 'Synthetic bank', learner);
    INSERT INTO platform.item_version(item_version_id, item_id, version, question_bank_id, prompt, response_schema, protected_key, content_hash)
        VALUES (item, gen_random_uuid(), 1, bank, 'Synthetic prompt', '{}', '{}', repeat('b',64));
    BEGIN
        UPDATE platform.item_version SET publication_state = 'PUBLISHED' WHERE item_version_id = item;
        RAISE EXCEPTION 'Expected empty mapping publication rejection';
    EXCEPTION WHEN check_violation THEN NULL; END;
    INSERT INTO platform.item_skill_mapping(mapping_version_id, item_version_id, skill_ref_id, evidence_weight)
        VALUES (gen_random_uuid(), item, skill, 1);
    UPDATE platform.item_version SET publication_state = 'PUBLISHED' WHERE item_version_id = item;
    BEGIN
        UPDATE platform.item_version SET prompt = 'Edited' WHERE item_version_id = item;
        RAISE EXCEPTION 'Expected published definition rejection';
    EXCEPTION WHEN check_violation THEN NULL; END;
    INSERT INTO platform.assessment_version(assessment_version_id, assessment_id, version, title, purpose, pass_threshold, scoring_version, content_hash)
        VALUES (assessment, gen_random_uuid(), 1, 'Synthetic assessment', 'MODULE', 0.7, 'synthetic-v1', repeat('b',64));
    INSERT INTO platform.assessment_item VALUES (assessment, 1, item, true, 1);
    UPDATE platform.assessment_version SET publication_state = 'PUBLISHED' WHERE assessment_version_id = assessment;
    INSERT INTO platform.module_assessment_binding(module_ref_id, assessment_version_id, required, manifest_hash)
        VALUES (module, assessment, true, repeat('b',64));
    INSERT INTO platform.learning_activity(activity_id, learner_id, module_ref_id, kind, required_assessment_set_hash)
        VALUES (activity, learner, module, 'FOUNDATIONAL', repeat('b',64)), (other_activity, learner, module, 'RETRY', repeat('b',64));
    INSERT INTO platform.activity_requirement VALUES (activity, module, assessment, true, repeat('b',64)), (other_activity, module, assessment, true, repeat('b',64));
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;
    INSERT INTO platform.assessment_assignment(assignment_id, learner_id, assessment_version_id, purpose, activity_id, available_from, attempt_limit, status)
        VALUES (assignment, learner, assessment, 'MODULE', activity, now(), 3, 'ACTIVE');
    BEGIN
        INSERT INTO platform.assessment_attempt(attempt_id, assignment_id, learner_id, assessment_version_id, activity_id, idempotency_key, request_hash, frozen_context, submission_sequence, attempt_number)
            VALUES (gen_random_uuid(), assignment, other_learner, assessment, activity, 'wrong-owner', repeat('b',64), '{}', 1, 1);
        RAISE EXCEPTION 'Expected wrong learner rejection';
    EXCEPTION WHEN foreign_key_violation THEN NULL; END;
    BEGIN
        INSERT INTO platform.assessment_attempt(attempt_id, assignment_id, learner_id, assessment_version_id, idempotency_key, request_hash, frozen_context, submission_sequence, attempt_number)
            VALUES (gen_random_uuid(), assignment, learner, assessment, 'null-context', repeat('b',64), '{}', 1, 1);
        RAISE EXCEPTION 'Expected null activity context rejection';
    EXCEPTION WHEN foreign_key_violation THEN NULL; END;
    INSERT INTO platform.assessment_attempt(attempt_id, assignment_id, learner_id, assessment_version_id, activity_id, idempotency_key, request_hash, frozen_context, submission_sequence, attempt_number)
        VALUES (attempt, assignment, learner, assessment, activity, 'accepted', repeat('b',64), '{}', 1, 1),
        (failed_attempt, assignment, learner, assessment, activity, 'later-failure', repeat('b',64), '{}', 2, 2);
    INSERT INTO platform.item_response VALUES (attempt, 1, assessment, item, 'true'), (failed_attempt, 1, assessment, item, 'false');
    INSERT INTO platform.assessment_result(attempt_id, learner_id, assessment_version_id, activity_id, score, pass_threshold, scoring_version)
        VALUES (attempt, learner, assessment, activity, 1, 0.7, 'synthetic-v1'), (failed_attempt, learner, assessment, activity, 0, 0.7, 'synthetic-v1');
    INSERT INTO platform.progress_revision(progress_revision_id, learner_id, revision_number, activity_snapshot, snapshot_hash)
        VALUES (progress, learner, 1, '[]', repeat('b',64));
    BEGIN
        INSERT INTO platform.module_completion(activity_id, learner_id, progress_revision_id) VALUES (activity, learner, progress);
        SET CONSTRAINTS ALL IMMEDIATE;
        RAISE EXCEPTION 'Expected missing pass rejection';
    EXCEPTION WHEN check_violation THEN NULL; END;
    INSERT INTO platform.module_completion(activity_id, learner_id, progress_revision_id) VALUES (activity, learner, progress);
    BEGIN
        INSERT INTO platform.completion_pass VALUES (activity, assessment, learner, failed_attempt, true);
        RAISE EXCEPTION 'Expected failed assessment rejection';
    EXCEPTION WHEN foreign_key_violation THEN NULL; END;
    BEGIN
        INSERT INTO platform.module_completion(activity_id, learner_id, progress_revision_id) VALUES (other_activity, learner, progress);
        INSERT INTO platform.completion_pass VALUES (other_activity, assessment, learner, attempt, true);
        RAISE EXCEPTION 'Expected cross-activity pass rejection';
    EXCEPTION WHEN foreign_key_violation THEN NULL; END;
    INSERT INTO platform.completion_pass VALUES (activity, assessment, learner, attempt, true);
    SET CONSTRAINTS ALL IMMEDIATE;
    BEGIN
        DELETE FROM platform.module_completion WHERE activity_id = activity;
        RAISE EXCEPTION 'Expected earned completion deletion rejection';
    EXCEPTION WHEN check_violation THEN NULL; END;
    INSERT INTO platform.model_version(model_version_id, algorithm, version, parameter_hash, configuration, artifact_ref)
        VALUES (model, 'synthetic-only', '1', repeat('b',64), '{}', 'synthetic');
    INSERT INTO platform.evidence_policy_version(policy_version_id, policy_name, version, configuration, configuration_hash)
        VALUES (policy, 'synthetic-only', 1, '{}', repeat('b',64));
    INSERT INTO platform.processing_stream(processing_stream_id, learner_id, model_version_id, policy_version_id)
        VALUES (stream, learner, model, policy);
    INSERT INTO platform.profile_revision(profile_revision_id, learner_id, processing_stream_id, model_version_id, policy_version_id, revision_number, evidence_watermark, status)
        VALUES (profile, learner, stream, model, policy, 1, 0, 'COMPLETE');
    BEGIN
        INSERT INTO platform.mastery_estimate(profile_revision_id, skill_ref_id, effective_value, evidence_status) VALUES (profile, skill, 0, 'UNKNOWN');
        RAISE EXCEPTION 'Expected Unknown-as-zero rejection';
    EXCEPTION WHEN check_violation THEN NULL; END;
    INSERT INTO platform.mastery_estimate(profile_revision_id, skill_ref_id, effective_value, evidence_status) VALUES (profile, skill, NULL, 'UNKNOWN');
END;
$$;