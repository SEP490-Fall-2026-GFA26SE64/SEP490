package com.adaptlearngraph.entities.domain;

public record JobPositionChange(String id,String code,String name,Integer jobZone,String status,String version,String authorId,boolean create,
        String description,java.util.Map<String,Integer> interestProfile) {
    public JobPositionChange {
        if(interestProfile!=null) {
            var keys=java.util.Set.of("interestRealistic","interestInvestigative","interestArtistic","interestSocial","interestEnterprising","interestConventional");
            if(!interestProfile.isEmpty() && (!interestProfile.keySet().equals(keys) || interestProfile.values().stream().anyMatch(v->v==null || v<0 || v>40)))
                throw new CatalogFailure(400,"INVALID_RIASEC_PROFILE");
            interestProfile=java.util.Map.copyOf(interestProfile);
        }
    }
}
