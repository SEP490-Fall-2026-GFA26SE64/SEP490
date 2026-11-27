package com.adaptlearngraph.entities.domain;

public record JobPosition(String id,String code,String name,String status,String version,int roleCount,int microSkillCount,
        String description,Integer interestRealistic,Integer interestInvestigative,Integer interestArtistic,
        Integer interestSocial,Integer interestEnterprising,Integer interestConventional) {
    public JobPosition(String id,String code,String name,String status,String version,int roleCount,int microSkillCount) {
        this(id,code,name,status,version,roleCount,microSkillCount,null,null,null,null,null,null,null);
    }
}
