package com.adaptlearngraph.dtos;

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
    ) {}

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