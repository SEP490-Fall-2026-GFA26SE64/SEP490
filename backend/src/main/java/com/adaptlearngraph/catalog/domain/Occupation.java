package com.adaptlearngraph.catalog.domain;

public record Occupation(
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
}
