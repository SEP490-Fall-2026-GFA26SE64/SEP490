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
        if(!pathway.containsModule(document.id()) && p.teachings().size()==1)try{pathway.requireKnowledge(p.teachings().getFirst().skillId(),p.knowledgeLevel(),p.skillVersion());}
        catch(com.adaptlearngraph.exception.InitialPathwayFailure denied){if(denied.status()>=500)throw denied;return denied.code();}
        if(document.archived() || p.teachings().size()!=1 || !"APPROVED".equals(p.metadata().reviewStatus()) || !"ACTIVE".equals(p.metadata().status()) || p.content().lessons().isEmpty()
            || p.content().lessons().stream().anyMatch(l->!l.complete()))return "MODULE_UNAVAILABLE";
        if(p.knowledgeLevel()==null)return "EXACT_KNOWLEDGE_CONFIGURATION_REQUIRED";
        return graph.read(tx->{
            var rows=tx.list("MATCH (s:MicroSkill {id:$skill,organizationId:$org}) WHERE s.status='ACTIVE' AND s.reviewStatus='APPROVED' RETURN s.version AS version LIMIT 2",
                    Map.of("skill",p.teachings().getFirst().skillId(),"org",actor.organizationId()));
            return rows.size()==1 && Objects.equals(rows.getFirst().get("version").asString(null),p.skillVersion())?null:"SKILL_VERSION_CHANGED";
        });
    }
}
