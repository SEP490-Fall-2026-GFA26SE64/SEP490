-- Forward-only policy identity. No defaults, activation, learner rewrite or seed.
CREATE TABLE platform.baseline_assessment_policy_version (
    policy_version_id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES platform.organization,
    version bigint NOT NULL CHECK(version>0),
    schema_version text NOT NULL CHECK(schema_version='ORG_POLICY_V1'),
    stop_se double precision NOT NULL CHECK(stop_se>0 AND stop_se<'Infinity'::float8),
    high_confidence_se double precision NOT NULL CHECK(high_confidence_se>0 AND high_confidence_se<'Infinity'::float8),
    medium_confidence_se double precision NOT NULL CHECK(medium_confidence_se>high_confidence_se AND medium_confidence_se<'Infinity'::float8),
    k double precision NOT NULL CHECK(k>0 AND k<=10),
    configuration_hash platform.content_hash NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp() CHECK(isfinite(created_at)),
    UNIQUE(organization_id,policy_version_id), UNIQUE(organization_id,version), UNIQUE(organization_id,configuration_hash),
    FOREIGN KEY(created_by,organization_id) REFERENCES platform.account(account_id,organization_id)
);
CREATE TABLE platform.baseline_assessment_policy_activation (
    organization_id uuid PRIMARY KEY REFERENCES platform.organization,
    revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0),
    current_policy_version_id uuid,
    changed_by uuid,
    changed_at timestamptz,
    FOREIGN KEY(organization_id,current_policy_version_id) REFERENCES platform.baseline_assessment_policy_version(organization_id,policy_version_id),
    FOREIGN KEY(changed_by,organization_id) REFERENCES platform.account(account_id,organization_id),
    CHECK((revision=0 AND current_policy_version_id IS NULL AND changed_by IS NULL AND changed_at IS NULL)
       OR (revision>0 AND current_policy_version_id IS NOT NULL AND changed_by IS NOT NULL AND changed_at IS NOT NULL AND isfinite(changed_at)))
);
CREATE TABLE platform.baseline_assessment_policy_command (
    organization_id uuid NOT NULL, actor_id uuid NOT NULL, command_key uuid NOT NULL,
    operation text NOT NULL CHECK(operation IN('SAVE_VERSION','ACTIVATE')),
    request_hash platform.content_hash NOT NULL,
    response_payload jsonb NOT NULL CHECK(jsonb_typeof(response_payload)='object'),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp() CHECK(isfinite(created_at)),
    PRIMARY KEY(organization_id,actor_id,command_key),
    FOREIGN KEY(actor_id,organization_id) REFERENCES platform.account(account_id,organization_id)
);
CREATE TABLE platform.baseline_assessment_policy_activation_event (
    event_id uuid PRIMARY KEY, organization_id uuid NOT NULL,
    activation_revision bigint NOT NULL CHECK(activation_revision>0), old_policy_version_id uuid,
    new_policy_version_id uuid NOT NULL, actor_id uuid NOT NULL, command_key uuid NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT clock_timestamp() CHECK(isfinite(occurred_at)),
    UNIQUE(organization_id,activation_revision),
    FOREIGN KEY(organization_id,old_policy_version_id) REFERENCES platform.baseline_assessment_policy_version(organization_id,policy_version_id),
    FOREIGN KEY(organization_id,new_policy_version_id) REFERENCES platform.baseline_assessment_policy_version(organization_id,policy_version_id),
    FOREIGN KEY(organization_id,actor_id,command_key) REFERENCES platform.baseline_assessment_policy_command DEFERRABLE INITIALLY DEFERRED,
    CHECK(old_policy_version_id IS DISTINCT FROM new_policy_version_id),
    CHECK((activation_revision=1)=(old_policy_version_id IS NULL))
);
CREATE FUNCTION platform.guard_assessment_policy_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Assessment policy history is immutable' USING ERRCODE='23514'; END;
$$;
CREATE TRIGGER assessment_policy_version_immutable BEFORE UPDATE OR DELETE ON platform.baseline_assessment_policy_version
 FOR EACH ROW EXECUTE FUNCTION platform.guard_assessment_policy_history();
CREATE TRIGGER assessment_policy_command_immutable BEFORE UPDATE OR DELETE ON platform.baseline_assessment_policy_command
 FOR EACH ROW EXECUTE FUNCTION platform.guard_assessment_policy_history();
CREATE TRIGGER assessment_policy_event_immutable BEFORE UPDATE OR DELETE ON platform.baseline_assessment_policy_activation_event
 FOR EACH ROW EXECUTE FUNCTION platform.guard_assessment_policy_history();
CREATE FUNCTION platform.guard_assessment_policy_activation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Policy enrollment cannot be deleted' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
   IF NEW.revision<>0 THEN RAISE EXCEPTION 'Policy scope starts empty' USING ERRCODE='23514'; END IF;
 ELSE
   IF NEW.organization_id<>OLD.organization_id OR NEW.revision<>OLD.revision+1
     OR NEW.current_policy_version_id IS NULL OR NEW.current_policy_version_id IS NOT DISTINCT FROM OLD.current_policy_version_id
   THEN RAISE EXCEPTION 'Stale or invalid policy activation' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER assessment_policy_activation_guard BEFORE INSERT OR UPDATE OR DELETE ON platform.baseline_assessment_policy_activation
 FOR EACH ROW EXECUTE FUNCTION platform.guard_assessment_policy_activation();

CREATE FUNCTION platform.validate_assessment_policy_activation_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.current_policy_version_id IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM platform.baseline_assessment_policy_activation_event e
   JOIN platform.baseline_assessment_policy_command c ON c.organization_id=e.organization_id AND c.actor_id=e.actor_id AND c.command_key=e.command_key
   WHERE e.organization_id=NEW.organization_id AND e.activation_revision=NEW.revision
     AND e.new_policy_version_id=NEW.current_policy_version_id AND e.actor_id=NEW.changed_by AND c.operation='ACTIVATE'
     AND e.old_policy_version_id IS NOT DISTINCT FROM OLD.current_policy_version_id)
 THEN RAISE EXCEPTION 'Policy switch requires exact immutable event/receipt' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE CONSTRAINT TRIGGER assessment_policy_switch_history AFTER UPDATE ON platform.baseline_assessment_policy_activation
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform.validate_assessment_policy_activation_event();

ALTER TABLE platform.baseline_adaptive_attempt
 ADD COLUMN assessment_policy_mode text,
 ADD COLUMN assessment_policy_version_id uuid,
 ADD COLUMN assessment_policy_hash platform.content_hash,
 ADD COLUMN assessment_policy_snapshot jsonb,
 ADD CONSTRAINT assessment_policy_own_pin FOREIGN KEY(organization_id,assessment_policy_version_id)
 REFERENCES platform.baseline_assessment_policy_version(organization_id,policy_version_id),
 ADD CONSTRAINT assessment_policy_pin_shape CHECK(
   (assessment_policy_mode IS NULL AND assessment_policy_version_id IS NULL AND assessment_policy_hash IS NULL AND assessment_policy_snapshot IS NULL)
   OR (assessment_policy_mode IS NOT NULL AND assessment_policy_mode='ORG_POLICY_V1' AND assessment_policy_version_id IS NOT NULL AND assessment_policy_hash IS NOT NULL
       AND assessment_policy_snapshot IS NOT NULL AND jsonb_typeof(assessment_policy_snapshot)='object'));
ALTER TABLE platform.baseline_attempt_skill_result ADD COLUMN policy_version_id uuid, ADD COLUMN policy_hash platform.content_hash;
ALTER TABLE platform.baseline_mastery_evidence ADD COLUMN policy_version_id uuid, ADD COLUMN policy_hash platform.content_hash;
CREATE FUNCTION platform.validate_attempt_assessment_policy() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE policy platform.baseline_assessment_policy_version%ROWTYPE;
DECLARE prior platform.baseline_adaptive_attempt%ROWTYPE;
DECLARE effective uuid;
BEGIN
 IF NEW.replaces_attempt_id IS NOT NULL THEN
   SELECT * INTO STRICT prior FROM platform.baseline_adaptive_attempt WHERE attempt_id=NEW.replaces_attempt_id;
   IF ROW(NEW.assessment_policy_mode,NEW.assessment_policy_version_id,NEW.assessment_policy_hash,NEW.assessment_policy_snapshot)
      IS DISTINCT FROM ROW(prior.assessment_policy_mode,prior.assessment_policy_version_id,prior.assessment_policy_hash,prior.assessment_policy_snapshot)
   THEN RAISE EXCEPTION 'Replacement must retain original policy' USING ERRCODE='23514'; END IF;
 ELSIF NEW.assessment_policy_mode IS NULL AND EXISTS(SELECT 1 FROM platform.baseline_assessment_policy_activation
       WHERE organization_id=NEW.organization_id AND current_policy_version_id IS NOT NULL) THEN
   RAISE EXCEPTION 'Enrolled organization requires policy on new root attempt' USING ERRCODE='23514';
 END IF;
 IF NEW.assessment_policy_mode IS NOT NULL THEN
   IF NEW.replaces_attempt_id IS NULL THEN
     SELECT current_policy_version_id INTO effective FROM platform.baseline_assessment_policy_activation WHERE organization_id=NEW.organization_id FOR SHARE;
     IF effective IS DISTINCT FROM NEW.assessment_policy_version_id THEN
       RAISE EXCEPTION 'New root attempt requires current own policy' USING ERRCODE='23514';
     END IF;
   END IF;
   SELECT * INTO STRICT policy FROM platform.baseline_assessment_policy_version
      WHERE organization_id=NEW.organization_id AND policy_version_id=NEW.assessment_policy_version_id;
   IF NEW.assessment_policy_hash<>policy.configuration_hash OR NEW.assessment_policy_snapshot IS DISTINCT FROM
      jsonb_build_object('stop_se',policy.stop_se,'high_confidence_se',policy.high_confidence_se,'medium_confidence_se',policy.medium_confidence_se,'k',policy.k)
   THEN RAISE EXCEPTION 'Attempt policy snapshot differs from immutable version' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER attempt_assessment_policy_insert BEFORE INSERT ON platform.baseline_adaptive_attempt
 FOR EACH ROW EXECUTE FUNCTION platform.validate_attempt_assessment_policy();
CREATE FUNCTION platform.validate_result_assessment_policy() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE attempt platform.baseline_adaptive_attempt%ROWTYPE;
BEGIN
 SELECT * INTO STRICT attempt FROM platform.baseline_adaptive_attempt WHERE attempt_id=NEW.attempt_id AND organization_id=NEW.organization_id;
 IF ROW(NEW.policy_version_id,NEW.policy_hash) IS DISTINCT FROM ROW(attempt.assessment_policy_version_id,attempt.assessment_policy_hash)
 THEN RAISE EXCEPTION 'Result/evidence policy must match attempt' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER result_assessment_policy_insert BEFORE INSERT ON platform.baseline_attempt_skill_result
 FOR EACH ROW EXECUTE FUNCTION platform.validate_result_assessment_policy();
CREATE TRIGGER evidence_assessment_policy_insert BEFORE INSERT ON platform.baseline_mastery_evidence
 FOR EACH ROW EXECUTE FUNCTION platform.validate_result_assessment_policy();

