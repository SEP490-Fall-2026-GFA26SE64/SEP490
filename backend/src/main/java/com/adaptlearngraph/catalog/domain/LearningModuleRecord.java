package com.adaptlearngraph.catalog.domain;

import java.util.List;

public record LearningModuleRecord(
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
