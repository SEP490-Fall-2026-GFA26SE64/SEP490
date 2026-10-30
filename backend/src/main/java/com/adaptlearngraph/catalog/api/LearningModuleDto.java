package com.adaptlearngraph.catalog.api;

import com.adaptlearngraph.catalog.domain.LearningModuleRecord;
import java.util.List;

public class LearningModuleDto {
    public record LearningModuleResponse(
            String id,
            String code,
            String title,
            String moduleType,
            String contentUri,
            String contentType,
            String contentVersion,
            String version,
            String status,
            String reviewStatus,
            int durationMinutes,
            List<String> teachesSkillIds,
            List<String> teachesSkillNames
    ) {
        public static LearningModuleResponse fromDomain(LearningModuleRecord m) {
            return new LearningModuleResponse(
                    m.id(),
                    m.code(),
                    m.title(),
                    m.moduleType(),
                    m.contentUri(),
                    m.contentType(),
                    m.contentVersion(),
                    m.version(),
                    m.status(),
                    m.reviewStatus(),
                    m.durationMinutes(),
                    m.teachesSkillIds(),
                    m.teachesSkillNames()
            );
        }
    }

    public record SaveLearningModuleRequest(
            String id,
            String code,
            String title,
            String moduleType,
            String contentUri,
            String contentType,
            String contentVersion,
            String version,
            String status,
            String reviewStatus,
            Integer durationMinutes,
            List<String> teachesSkillIds
    ) {}
}
