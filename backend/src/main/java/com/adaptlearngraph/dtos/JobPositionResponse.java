package com.adaptlearngraph.dtos;

public record JobPositionResponse(String id,String code,String name,String status,String version,int roleCount,int microSkillCount,
        String description,Integer interestRealistic,Integer interestInvestigative,Integer interestArtistic,
        Integer interestSocial,Integer interestEnterprising,Integer interestConventional) {}
