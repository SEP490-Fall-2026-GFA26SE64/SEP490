package com.adaptlearngraph.competency.api;

import com.adaptlearngraph.competency.domain.MacroCompetency;

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
    public static MacroCompetencyResponse fromDomain(MacroCompetency macro) {
        return new MacroCompetencyResponse(
                macro.id(),
                macro.code(),
                macro.name(),
                macro.description(),
                macro.status(),
                macro.createdAt(),
                macro.updatedAt()
        );
    }
}
