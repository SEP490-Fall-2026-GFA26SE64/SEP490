package com.adaptlearngraph.dtos;

import java.time.Instant;

public record MacroCompetencyResponse(
        String id,
        String code,
        String name,
        String description,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
}