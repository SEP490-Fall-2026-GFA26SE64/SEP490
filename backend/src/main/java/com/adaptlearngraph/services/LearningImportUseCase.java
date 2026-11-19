package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.LearningContent.Lesson;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.*;

import java.io.InputStream;
import java.util.*;

public interface LearningImportUseCase {
    record Row(
            String moduleId,
            int excelRow,
            Save module,
            List<Lesson> lessons,
            Long expectedVersion,
            String moduleRef,
            String status,
            String duplicateOf) {
        public Row(String moduleId, int excelRow, Save module, List<Lesson> lessons, Long expectedVersion) {
            this(moduleId, excelRow, module, lessons, expectedVersion, null, "NEW", null);
        }
        public Row(String moduleId, int excelRow, Save module, List<Lesson> lessons, Long expectedVersion, String moduleRef) {
            this(moduleId, excelRow, module, lessons, expectedVersion, moduleRef, "NEW", null);
        }
    }

    record Problem(String moduleId, int row, String reason) {}

    record Preview(
            String id,
            List<Row> modules,
            List<Problem> errors,
            List<String> ownedDuplicates,
            boolean committed,
            String format,
            String fileHash) {
        public Preview(String id, List<Row> modules, List<Problem> errors, List<String> ownedDuplicates, boolean committed) {
            this(id, modules, errors, ownedDuplicates, committed, "DOCX_ZIP_V1", null);
        }
        public Preview(String id, List<Row> modules, List<Problem> errors, List<String> ownedDuplicates, boolean committed, String format) {
            this(id, modules, errors, ownedDuplicates, committed, format, null);
        }
    }

    byte[] template();

    default byte[] template(String lang) { return template(); }

    Preview preview(String filename, long size, InputStream input);

    Preview validate(String id);

    List<Document> commit(String id, boolean confirmOwnedDuplicates);
}
