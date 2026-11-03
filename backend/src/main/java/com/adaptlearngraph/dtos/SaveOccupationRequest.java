package com.adaptlearngraph.dtos;

public record SaveOccupationRequest(
        String id,
        String code,
        String name,
        Integer jobZone,
        Double interestRealistic,
        Double interestInvestigative,
        Double interestArtistic,
        Double interestSocial,
        Double interestEnterprising,
        Double interestConventional,
        String status,
        String version
) {}