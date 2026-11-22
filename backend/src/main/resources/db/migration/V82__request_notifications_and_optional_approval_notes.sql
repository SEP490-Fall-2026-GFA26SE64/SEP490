-- Staff content review submissions are in-app only, with explicitly scoped routes.
ALTER TABLE platform.learning_notification DROP CONSTRAINT learning_notification_target;
ALTER TABLE platform.learning_notification ADD CONSTRAINT learning_notification_target CHECK (
 module_id IS NOT NULL OR (deep_link IS NOT NULL AND (
  deep_link LIKE '/employee/%'
  OR (kind IN ('REVIEW_RULE_PATHWAY_REQUESTED','REVIEW_RULE_PATHWAY_APPROVED','REVIEW_RULE_PATHWAY_REJECTED') AND deep_link ~ '^/expert/pathway-review/[0-9a-f-]{36}$')
  OR (kind IN ('REVIEW_CERTIFICATE_EVIDENCE_SUBMITTED','REVIEW_CERTIFICATE_APPROVED','REVIEW_CERTIFICATE_REJECTED') AND deep_link='/expert/certificates?tab=review')
  OR (kind IN ('CERTIFICATE_DEFINITIONS_SUBMITTED','REVIEW_CERTIFICATES_SUBMITTED') AND deep_link='/ld-manager/certificates?status=SUBMITTED')
  OR (kind='REVIEW_MODULES_SUBMITTED' AND deep_link='/ld-manager/modules?status=SUBMITTED')
  OR (kind='REVIEW_QUESTIONS_SUBMITTED' AND deep_link='/ld-manager/question-bank?status=SUBMITTED')
  OR (kind IN ('CERTIFICATE_DEFINITION_PUBLISHED','CERTIFICATE_DEFINITION_REJECTED','CERTIFICATE_DEFINITION_PUBLISH_FAILED')
      AND deep_link ~ '^/expert/certificates[?]certificate=[0-9a-f-]{36}$')
 ))
);

ALTER TABLE platform.certificate_submission_decision DROP CONSTRAINT certificate_submission_decision_reason_check;
ALTER TABLE platform.certificate_submission_decision ADD CONSTRAINT certificate_submission_decision_reason_check CHECK (decision='APPROVED' OR btrim(reason)<>'');
