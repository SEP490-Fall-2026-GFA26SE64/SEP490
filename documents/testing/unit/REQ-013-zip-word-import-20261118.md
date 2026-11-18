# REQ-013 / FR-05.05 — ZIP and Word module import, 2026-11-18

Local source/build verification. No running application deployment or schema migration was performed in this slice.

| Acceptance | Actual check | Result |
| --- | --- | --- |
| Downloaded template is self-contained | ZIP has module.xlsx, VI/EN text guides, two DOCX and two actual MP4 files; every example path resolves; human-readable headers and plain Skill code | Passed |
| Eligible organization Skill choices | Template uses trusted catalog and knowledge definitions; no eligible scope returns actionable 409 | Passed |
| Word conversion | Standard headings, bold/italic/underline, literal escaped text, adjacent numbered lists, simple table and embedded image upload | Passed |
| Word limits/content safety | Reject empty/corrupt packages, expansion bomb, tracked changes, unsupported main body content and external media without uploading those unsafe inputs | Passed |
| New package contract | Reject old headers, standalone XLSX, RAR, malformed refs, JSON/multi-Skill input, unknown Skill, wrong content type/path and missing files | Passed |
| Batch validation | Duplicate module/lesson refs/order, unknown module and invalid numeric order produce errors; invalid batches do not call authoring mutations | Passed |
| Identity and authorization | Generated UUID retained through validation, new upload gets new identity; collision, foreign preview, wrong-role template access and old preview format are blocked | Passed |
| API metadata/projections | ZIP Content-Type/attachment filename, multipart preview errors preserve module reference/row; protected template failure returns 403 | Passed |
| Existing private asset checks | Existing sanitization, private-image/code handling, traversal and H.264 parser cases remain passing | Passed |
| Frontend import flow | ZIP-only download/input, invalid-type rejection, drop/busy handling, review/learner preview/back, errors/retry, confirmation semantics | Passed |
| Builds and static checks | Java21 production compile, TypeScript/Vite build, scoped lint and git diff --check | Passed; Vite retains existing large-bundle warning |

Final focused backend run: **22 tests passed**, zero failures/errors/skips: SingleSkillImportTest 11, WordLessonReaderTest 5, ModuleZipImportApiTest 1, PrivateLearningAssetsTest 5. Frontend LearningImportPanel.test.tsx: **7 passed**. PostgreSQL/MinIO test is [separate](../integration/REQ-013-zip-word-import-20261118.md).

Office artifact QA: re-imported/rendered all five sheets of the actual generated workbook with Artifact Tool; rendered both bundled DOCX files through bundled LibreOffice and inspected every page. Sample MP4 is a generated three-second silent H.264 clip with VI/EN replacement instructions; its frame/duration were checked with AVFoundation. It is sample playback material, not claimed course content. No empty placeholder file is shipped with a media extension.

## Reproduction and limitations

Production compile: `JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home bash backend/mvnw -o -f backend/pom.xml -Dmaven.test.skip=true compile`.

The pre-existing broad test source mismatch recorded in earlier same-session evidence still prevents treating a whole-suite run as certified. The selected test classes were explicitly compiled with Java21 javac against backend/target/classes plus the Maven dependency classpath, then executed using the normal Surefire runner:

`JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home bash backend/mvnw -o -f backend/pom.xml '-Dtest=SingleSkillImportTest,WordLessonReaderTest,ModuleZipImportApiTest,PrivateLearningAssetsTest' '-Dmodule.template.output=/Users/nguyenan/Documents/FINAL FPT/Project/SEP490/outputs/module-import-template-20261118/module-template.zip' '-DargLine=-javaagent:/Users/nguyenan/.m2/repository/org/mockito/mockito-core/5.17.0/mockito-core-5.17.0.jar' surefire:test`.

Frontend: `npm test -- src/features/expert/modules/LearningImportPanel.test.tsx`; `npm run build`; scoped `./node_modules/.bin/oxlint` on panel and test. Backend tests use isolated actor/catalog fixtures, not the live entitlement/session stack. No full-suite, deployed API, Playwright or production pass is claimed.

Early failures were corrected: Word test expected the source image filename rather than POI's package filename; one frontend upload-error fixture used the now-rejected non-ZIP type. A first UI run also timed out under concurrent build load and passed on rerun. All final selected assertions passed. Earlier logs were retained, not relabeled.

Session artifacts/logs: `/tmp/sep490-module-import-package/unit-final.log`, `frontend-tests-final.log`, `frontend-build-final.log`, `backend-compile-final.log`, `lint.log`, and `template-preview/`. The output ZIP is a demonstration generated with the test Skill fixture; runtime download queries the actual organization's Skill catalog. [Manual checklist](../system/REQ-013-zip-word-import-20261118.md).
