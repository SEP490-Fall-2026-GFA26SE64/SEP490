# REQ-013 — ZIP Word/video persistence, 2026-11-18

**Passed:** ModuleZipImportPersistenceTest, 1 integration scenario with disposable PostgreSQL 17.6 and MinIO. No existing stack/database/media was modified. Containers are managed by Testcontainers and closed on completion.

The real ExcelLearningImport, ModuleAuthoringService, WordLessonReader and PrivateLearningAssets process the generated template ZIP. MinIO stores both uploaded H.264 MP4s; reading each asset back returns exactly the original bytes, with a valid measured duration. PostgreSQL stores the scoped preview, content snapshots and module documents using a small JDBC-backed test port under real Spring transactions and row locks.

A deliberately injected second-module persistence failure rolls back both module and content rows and leaves the import PREVIEW. Retry commits exactly two drafts; reload returns identical Word HTML/tables and lessons, actual importing owner and organization, nullable reviewer/time and no released revision. Repeated confirmation and foreign-owner preview access are blocked. No catalog projection/publication call occurs. As in the existing workflow, media may be staged during preview; this test does not assert automatic staged-media deletion.

Actor/eligible-Skill/catalog ports are isolated fixtures; this is not the entire JPA/Neo4j/session/CSRF stack or a complete Compose run. The default MinIO test image matches compose.dev.yml, and a system property supports an equivalent locally built image.

Final command, after isolated compilation described in [unit evidence](../unit/REQ-013-zip-word-import-20261118.md):

`JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home bash backend/mvnw -o -f backend/pom.xml '-Dtest=ModuleZipImportPersistenceTest' '-Dmodule.import.minio-image=adapt-learn-graph-minio:dev' '-DargLine=-javaagent:/Users/nguyenan/.m2/repository/org/mockito/mockito-core/5.17.0/mockito-core-5.17.0.jar' surefire:test`.

The initial attempt failed due to a Mockito generic-varargs inference issue in the JDBC test adapter, not a successful persistence run; a simultaneous separate Surefire process also removed a temporary booter JAR. The adapter was corrected and the integration test was rerun sequentially. Retry passed (19.336s, test body 16.57s); final portable-image-configuration run also passed (24.259s, test body 20.27s), recorded in `/tmp/sep490-module-import-package/integration-final.log`. The failed first log and successful retry remain at `integration.log` and `integration-retry.log`.
