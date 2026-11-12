# REQ-013 — Module import dropzone M2

2026-11-11, localhost:8088, FR-05.05. Implemented the approved Module upload refinement using the same drop region as Assessment Bank. Existing QuestionImportUpload markup was extracted to shared FileDropzone, retaining its dashed border, drag highlight, Upload icon, keyboard Browse button and file input. Module configures XLSX/ZIP; Bank keeps XLSX/JSON and its own limits/templates. Both paths pass the actual File to their existing upload callback. No new dependencies, APIs, business validation, runtime configuration or database changes.

## Results

- **59 component tests passed /8 files**:20 Module +39 Question Bank. New cases cover dropped ZIP, duplicate-drop blocking while busy, upload failure/retry and unchanged format hint. Existing chooser, draft/import/confirmation, exact payload and Bank upload tests remain active.
- **Frontend production build passed**; existing Vite chunk-size warning remains. Scoped lint and diff whitespace check passed.
- **2 Playwright cases passed**:1440px and390px. Actual workspace sign-in, isolated Module API fixtures. Browser asserts Enter opens file chooser, dragover highlight, actual multipart filename, exactly one upload, filename feedback, Review then explicit Confirm, exact commit payload, success, no page errors or horizontal overflow. Screenshots inspected at both widths; footer and controls remain visible. No new persisted import/test content was created by M2. These fixtures verify UI/callback behavior, not real ZIP parsing; M1 real API acceptance remains separately dated.

[Component log](assets/module-import-dropzone-m2-20261111/checks/component.log), [build](assets/module-import-dropzone-m2-20261111/checks/build.log), [lint](assets/module-import-dropzone-m2-20261111/checks/lint.log), [browser](assets/module-import-dropzone-m2-20261111/checks/browser.log), [desktop/mobile screenshots](assets/module-import-dropzone-m2-20261111/run1).

## Changed files

- `frontend/src/shared/components/ui/FileDropzone.tsx`: shared extraction, configurable format/label/callback; busy guard and existing design tokens.
- `frontend/src/shared/components/question-bank/QuestionImportPanels.tsx`: consumes shared region without changing Bank formats, limits or templates.
- `frontend/src/features/expert/modules/LearningImportPanel.tsx`: replaces native upload field with shared dropzone; keeps server validation, file status, Review/Confirm, video/duplicates and commit behavior.
- `frontend/src/features/expert/modules/LearningImportPanel.test.tsx` and `frontend/system-tests/REQ-013-module-import-dropzone-m2.spec.ts`: focused verification.

Manual repeat: open Module Import, browse with keyboard or drop one XLSX/ZIP; observe highlight/filename/upload state. While uploading, additional drops and Browse are disabled. A rejected file shows the server error and permits retry. Review server results, then confirm deliberately. On390px, verify controls fit and body scrolls if needed. Assessment Bank continues using its XLSX/JSON upload and existing templates. One file is processed per upload, matching existing behavior; no unsupported file-size limits are invented.
