package com.adaptlearngraph.dtos;

import java.time.Instant;

public record MicroSkillResponse(
        String id,
        String organizationId,
        String code,
        String name,
        String description,
        String status,
        Instant createdAt,
        Instant updatedAt) {
}