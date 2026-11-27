package com.adaptlearngraph.dtos;
import com.fasterxml.jackson.databind.JsonNode;

public record SaveJobPositionRequest(String id,String code,String name,String status,String version,
        String description, JsonNode interestRealistic, JsonNode interestInvestigative, JsonNode interestArtistic,
        JsonNode interestSocial, JsonNode interestEnterprising, JsonNode interestConventional) {
    public SaveJobPositionRequest(String id,String code,String name,String status,String version) {
        this(id,code,name,status,version,null,null,null,null,null,null,null);
    }
}
