# REQ-013 document-oriented reader — unit evidence, 2026-11-12

Scope: approved reading-area revision 1. These checks cover the new document presentation and narrow sanitizer metadata change, not a production release.

| Check | Actual result |
| --- | --- |
| `npm --prefix frontend test -- --run src/shared/components/learning/LessonDocument.test.tsx src/features/employee/modules/LearningModuleReaderPage.test.tsx src/shared/components/learning/LessonVideoControls.test.tsx` | **Passed: 15 tests / 3 files**, final run after code-copy state was scoped to the current code text. |
| `npm --prefix frontend run build` | **Passed**, final source; existing large-bundle advisory remains. |
| Scoped `oxlint` for changed reader/document/code components and browser spec | **Passed**, no diagnostics. |
| `git diff --check` | **Passed**. |
| Standard Maven `test -Dtest=PrivateLearningAssetsTest` under Java 21 | **Blocked at test compilation** by unrelated test/source drift, including QuestionBank constructor/requireKnowledge changes and removed Package.price. Main application compilation succeeded; the standard lifecycle is not reported as passed. |
| Selected PrivateLearningAssetsTest compiled directly against current `target/classes` + Maven test dependency classpath, then `surefire:test -Dtest=PrivateLearningAssetsTest` with cached mockito-core startup javaagent | **Passed: 5 tests**, 0 failures/errors/skips. This is the focused suite, not the standard all-test compilation gate. |

## Coverage

`LessonDocument.test.tsx` verifies heading semantics (authored H1 becomes a section H2 under the lesson H1), nested lists, line breaks, strong/emphasis, inline code, tables/spans, dividers, private images, declared-language/Cypher tokens, escaped code containing script text, exact clipboard bytes, unknown/unlabelled code, typed callouts versus ordinary quotes, plain text, safe links/resources, VI labels and copy failure. A separate case prevents a copied confirmation from carrying into a different lesson's code.

Existing reader cases continue checking actual progress request payloads through isolated doubles, current lesson/resume, completion, navigation, collapse, failure/recovery and empty/loading handling; existing native media control tests remain in the selected run.

The backend test verifies CommonMark/GFM output, script/event/style/remote-image removal, private image retention, exact code text, and preservation of only a restricted `language-*` class on code nodes. Arbitrary classes and injected attributes remain stripped. Other retained tests in that class cover ZIP traversal refusal, MP4 validation and malformed import handling.

## Focused backend procedure

The first direct Surefire attempt failed because inline Mockito could not self-attach in the restricted process environment. No test implementation was weakened. The rerun used Mockito's startup agent from the existing cached test dependencies.

1. `JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home bash backend/mvnw -o -f backend/pom.xml dependency:build-classpath -Dmdep.outputFile=/tmp/learning-document-classpath.txt`
2. Compile only `backend/src/test/java/com/adaptlearngraph/repository/PrivateLearningAssetsTest.java` with Java 21 `javac --release 21`, classpath `backend/target/classes` plus that generated dependency classpath, output `backend/target/test-classes`.
3. `JAVA_HOME=... bash backend/mvnw -o -f backend/pom.xml surefire:test -Dtest=PrivateLearningAssetsTest -DargLine=-javaagent:<cached mockito-core jar>`

[Focused result](assets/learning-document-reader-20261112/PrivateLearningAssetsTest.txt) and [initial agent failure](assets/learning-document-reader-20261112/initial-agent-failure.txt) retain the distinction. No DB/schema/persistence operation was needed for the sanitizer tests. Architecture/store boundaries are unchanged; broader integration acceptance is recorded in [system evidence](../system/REQ-013-learning-document-reader-20261112.md).
