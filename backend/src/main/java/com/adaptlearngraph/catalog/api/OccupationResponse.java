package com.adaptlearngraph.catalog.api;

import com.adaptlearngraph.catalog.domain.Occupation;

public record OccupationResponse(
        String id,
        String code,
        String name,
        int jobZone,
        double interestRealistic,
        double interestInvestigative,
        double interestArtistic,
        double interestSocial,
        double interestEnterprising,
        double interestConventional,
        String status,
        String version,
        int roleCount,
        int microSkillCount
) {
    public static OccupationResponse fromDomain(Occupation domain) {
        return new OccupationResponse(
                domain.id(),
                domain.code(),
                domain.name(),
                domain.jobZone(),
                domain.interestRealistic(),
                domain.interestInvestigative(),
                domain.interestArtistic(),
                domain.interestSocial(),
                domain.interestEnterprising(),
                domain.interestConventional(),
                domain.status(),
                domain.version(),
                domain.roleCount(),
                domain.microSkillCount()
        );
    }
}
