package com.adaptlearngraph.entities.domain;

import java.util.*;

/** Authored certificate provision, separate from private Employee evidence. */
public final class CertificateCatalog {
    private CertificateCatalog() {}
    public static List<String> outcomes(List<String> values){
        if(values==null || values.size()>100 || values.stream().anyMatch(value->value==null || !value.equals(value.trim()) || value.length()>160))throw new IllegalArgumentException("Invalid certificate outcomes");
        return RuleAssessment.unique(values).stream().sorted().toList();
    }
    public record Create(String skillId,KnowledgeLevel knowledgeLevel,String name,String referenceUrl,String expectedSkillVersion,String replacesDefinitionId) {
        public Create(String skillId,KnowledgeLevel level,String name,String referenceUrl,String expectedSkillVersion){this(skillId,level,name,referenceUrl,expectedSkillVersion,null);}
        public Create {
            text(skillId,200);Objects.requireNonNull(knowledgeLevel);text(name,300);text(expectedSkillVersion,200);
            name=name.trim();referenceUrl=HttpsReference.require(referenceUrl);
            if(replacesDefinitionId!=null)text(replacesDefinitionId,200);
        }
    }
    public record Definition(String id,String version,String skillId,String skillName,KnowledgeLevel knowledgeLevel,String skillVersion,
            List<String> outcomeCodes,String name,String referenceUrl,String status,String authoredBy,String authoredAt) {
        public Definition {outcomeCodes=outcomes(outcomeCodes);referenceUrl=HttpsReference.require(referenceUrl);}
    }
    private static void text(String value,int max){if(value==null || value.isBlank() || value.length()>max)throw new IllegalArgumentException("Certificate field required or too large");}
}
