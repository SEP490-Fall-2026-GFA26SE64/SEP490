package com.adaptlearngraph.entities.domain;

import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Objects;

/** Exact assessed MAIN knowledge, independent of the learning module/Role used as admission evidence. */
public record SkillAssessmentScope(String skillId,KnowledgeLevel knowledgeLevel,String skillVersion) {
    public SkillAssessmentScope {
        if(skillId==null || skillId.isBlank() || skillId.length()>200 || skillVersion==null || skillVersion.isBlank() || skillVersion.length()>200)
            throw new IllegalArgumentException("Invalid skill assessment scope");
        Objects.requireNonNull(knowledgeLevel);
    }
    public String contextKey() {
        String value=skillId.length()+":"+skillId+":"+knowledgeLevel+":"+skillVersion.length()+":"+skillVersion;
        try{return "SKILL_ASSESSMENT:SCOPE_V1:"+HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}
        catch(java.security.NoSuchAlgorithmException unavailable){throw new IllegalStateException(unavailable);}
    }
    /** Missing/duplicate frozen definitions are an integrity issue, never a reason to guess a version. */
    public static SkillAssessmentScope fromDefinitions(JsonNode definitions,String skill,KnowledgeLevel level) {
        if(definitions==null || !definitions.isArray())throw new IllegalArgumentException("Missing frozen requirements");
        JsonNode found=null;
        for(var definition:definitions)if(definition.path("requirement").path("skillId").isTextual()
                && definition.path("requirement").path("knowledgeLevel").isTextual()
                && definition.path("requirement").path("skillId").asText().equals(skill)
                && definition.path("requirement").path("knowledgeLevel").asText().equals(level.name())) {
            if(found!=null)throw new IllegalArgumentException("Ambiguous frozen requirement");found=definition;
        }
        if(found==null || !found.path("skillVersion").isTextual())throw new IllegalArgumentException("Missing frozen skill version");
        return new SkillAssessmentScope(skill,level,found.path("skillVersion").asText());
    }
}
