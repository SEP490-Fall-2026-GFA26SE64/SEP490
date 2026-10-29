package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.LearningContent.Lesson;
import com.adaptlearngraph.catalog.domain.ModuleAuthoring.*;

import java.io.InputStream;
import java.util.*;

public interface LearningImportUseCase {
    record Row(
            String moduleId,
            int excelRow,
            Save module,
            List<Lesson> lessons,
            Long expectedVersion) {}

    record Problem(String moduleId, int row, String reason) {}

    record Preview(
            String id,
            List<Row> modules,
            List<Problem> errors,
            List<String> ownedDuplicates,
            boolean committed) {}

    byte[] template();

    Preview preview(String filename, long size, InputStream input);

    Preview validate(String id);

    List<Document> commit(String id, boolean confirmOwnedDuplicates);
}
