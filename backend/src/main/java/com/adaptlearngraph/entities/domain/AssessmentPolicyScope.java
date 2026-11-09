package com.adaptlearngraph.entities.domain;

import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import java.util.*;

/** Catalog identity, not a display-name composite or a tenant-wide activation pointer. */
public final class AssessmentPolicyScope {
    private AssessmentPolicyScope() {}
    public static String key(Purpose purpose,String ownerId,String levelId) {
        if(ownerId==null || ownerId.isBlank() || levelId==null || levelId.isBlank())throw new IllegalArgumentException("Missing catalog identity");
        try {
            var body=purpose+":"+ownerId.length()+":"+ownerId+":"+levelId.length()+":"+levelId;
            return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                    .digest(body.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        }catch(java.security.NoSuchAlgorithmException unavailable){throw new IllegalStateException(unavailable);}
    }
    /** Configuration discovery may precede assessment outcome authoring. Frozen paper Requirements remain strict. */
    public record ConfigurationRequirement(String skillId,KnowledgeLevel knowledgeLevel,List<String> outcomeCodes) {
        public ConfigurationRequirement {
            if(skillId==null || skillId.isBlank())throw new IllegalArgumentException("Missing skill identity");
            Objects.requireNonNull(knowledgeLevel);outcomeCodes=List.copyOf(outcomeCodes);
            if(outcomeCodes.stream().anyMatch(code->code==null || code.isBlank()) || new HashSet<>(outcomeCodes).size()!=outcomeCodes.size())
                throw new IllegalArgumentException("Invalid explicit outcomes");
        }
        public String key(){return skillId+"\n"+knowledgeLevel;}
        public Requirement assessmentRequirement(){return new Requirement(skillId,knowledgeLevel,outcomeCodes);}
    }
    public record GroupSpec(ConfigurationRequirement requirement,String skillName,String skillVersion,
                            SkillProvisionMode provisionMode,List<String> readinessIssues) {
        public GroupSpec { readinessIssues=readinessIssues==null?List.of():List.copyOf(readinessIssues); }
    }
    public record Issue(String ownerId,String ownerName,String levelName,String code) {}
    public record Discovery(List<Scope> scopes,List<Issue> issues) {
        public Discovery { scopes=List.copyOf(scopes);issues=List.copyOf(issues); }
    }
    public record Scope(String key,Purpose purpose,String ownerId,String ownerName,String levelId,String levelName,String contextLevelId,
                        int rank,String catalogHash,List<GroupSpec> groups,boolean ready,List<String> readinessIssues,
                        @com.fasterxml.jackson.annotation.JsonIgnore String legacyCatalogHash) {
        public Scope(String key,Purpose purpose,String ownerId,String ownerName,String levelId,String levelName,String contextLevelId,int rank,String catalogHash,List<GroupSpec> groups,boolean ready,List<String> readinessIssues) {
            this(key,purpose,ownerId,ownerName,levelId,levelName,contextLevelId,rank,catalogHash,groups,ready,readinessIssues,null);
        }
        public boolean matchesCatalog(String hash){return catalogHash.equals(hash) || legacyCatalogHash!=null && legacyCatalogHash.equals(hash);}
        public Scope { groups=List.copyOf(groups);readinessIssues=readinessIssues==null?List.of():List.copyOf(readinessIssues); }
    }
}
