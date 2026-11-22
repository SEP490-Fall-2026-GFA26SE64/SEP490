-- Certificate authoring notifications have no module target. Keep their routes explicitly scoped.
ALTER TABLE platform.learning_notification DROP CONSTRAINT learning_notification_target;
ALTER TABLE platform.learning_notification ADD CONSTRAINT learning_notification_target CHECK (
 module_id IS NOT NULL OR (deep_link IS NOT NULL AND (
  deep_link LIKE '/employee/%'
  OR (kind='CERTIFICATE_DEFINITIONS_SUBMITTED' AND deep_link='/ld-manager/certificates?status=SUBMITTED')
  OR (kind IN ('CERTIFICATE_DEFINITION_PUBLISHED','CERTIFICATE_DEFINITION_REJECTED','CERTIFICATE_DEFINITION_PUBLISH_FAILED')
      AND deep_link ~ '^/expert/certificates[?]certificate=[0-9a-f-]{36}$')
 ))
);
