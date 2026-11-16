package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.ModuleAuthoring.*;
import com.adaptlearngraph.services.SkillLearningService;
import com.adaptlearngraph.services.RequirementPathwayAccess;
import java.util.*;

/** Live independent access; never treats lesson completion as official knowledge evidence. */
public final class IndependentSkillAdmission implements SkillLearningService.Admission {
    private final Neo4jCypher graph;
    private final RuleAssessmentContextJpaRepository evidence;
    private final RequirementPathwayAccess pathway;
    public IndependentSkillAdmission(Neo4jCypher graph,RuleAssessmentContextJpaRepository evidence,RequirementPathwayAccess pathway) {
        this.graph=graph;this.evidence=evidence;this.pathway=pathway;
    }
    public String reason(Actor actor,Document document,Revision revision) {
        if(!actor.organizationId().equals(document.organizationId()))return "MODULE_UNAVAILABLE";
        if(pathway==null)return "ACCESS_POLICY_UNAVAILABLE";
        if(pathway.containsModule(document.id()) && !pathway.permits(document.id(),revision.number()))return "PATHWAY_MODULE_LOCKED";
        var p=revision.payload();
        if(document.archived() || p.teachings().size()!=1 || !"APPROVED".equals(p.metadata().reviewStatus()) || !"ACTIVE".equals(p.metadata().status()) || p.content().lessons().isEmpty()
            || p.content().lessons().stream().anyMatch(l->!l.complete()))return "MODULE_UNAVAILABLE";
        if(p.knowledgeLevel()==null)return "EXACT_KNOWLEDGE_CONFIGURATION_REQUIRED";
        return check(actor,p.teachings().getFirst().skillId(),p.knowledgeLevel().name(),p.skillVersion(),new HashSet<>());
    }
    private String check(Actor actor,String skill,String level,String version,Set<String> visiting) {
        String key=skill+"/"+level;
        if(!visiting.add(key) || visiting.size()>1000)return "PREREQUISITE_CONFIGURATION_INVALID";
        var rows=graph.read(tx->tx.list("""
            MATCH (s:MicroSkill {id:$skill,organizationId:$org})
            WHERE s.status='ACTIVE' AND s.reviewStatus='APPROVED'
            OPTIONAL MATCH (s)-[p:HAS_SKILL_PREREQUISITE]->(b:MicroSkill {organizationId:$org})
            WHERE p.status='ACTIVE' AND (p.organizationId IS NULL OR p.organizationId=$org)
            RETURN s.version AS version,p.dependentKnowledgeLevel AS dependent,
                p.prerequisiteKnowledgeLevel AS prerequisite,b.id AS skill,b.version AS prerequisiteVersion
            LIMIT 1001
            """,Map.of("skill",skill,"org",actor.organizationId())));
        if(rows.isEmpty() || rows.size()>1000)return "SKILL_CONFIGURATION_UNAVAILABLE";
        for(var row:rows) {
            if(row.get("version").isNull() || !Objects.equals(row.get("version").asString(),version))return "SKILL_VERSION_CHANGED";
            if(row.get("skill").isNull())continue;
            if(row.get("dependent").isNull() || row.get("prerequisite").isNull() || row.get("prerequisiteVersion").isNull())return "EXACT_PREREQUISITE_CONFIGURATION_REQUIRED";
            if(!row.get("dependent").asString().equals(level))continue;
            String next=row.get("skill").asString(),nextLevel=row.get("prerequisite").asString(),nextVersion=row.get("prerequisiteVersion").asString();
            if(evidence.official(UUID.fromString(actor.organizationId()),UUID.fromString(actor.id()),next,nextLevel,nextVersion).isEmpty())return "PREREQUISITE_NOT_MET";
            String blocked=check(actor,next,nextLevel,nextVersion,visiting);if(blocked!=null)return blocked;
        }
        visiting.remove(key);return null;
    }
}
