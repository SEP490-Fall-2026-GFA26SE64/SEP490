package com.adaptlearngraph.dtos;

/** Learning admission, independent of any assessment/attempt/scoring DTO. */
public final class SkillLearningDto {
    private SkillLearningDto() {}
    public record CompletionResponse(String skillId,String moduleId,int revision,String contentVersion,String completedAt,
                                     String knowledgeLevel,String skillVersion,java.util.List<String> outcomeCodes,String skillName) {}
    public record EligibilityResponse(String skillId,boolean eligible,String reason,CompletionResponse qualifyingCompletion) {}
    public record ModuleResponse(String moduleId,String title,String contentVersion,boolean started,boolean completed) {}
}
