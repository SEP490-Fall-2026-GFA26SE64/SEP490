package com.adaptlearngraph.repository;

import com.adaptlearngraph.services.RoleBaselineFlow;
import com.adaptlearngraph.services.RuleAssessmentAttemptService.*;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.neo4j.driver.Value;

/** Extends the current granted Role projection. No null/shared Skill grants or prerequisite expansion from baseline. */
public final class CurrentRoleKnowledgeCatalog implements Contexts {
    private final CurrentRoleSelectionStore selections;
    private final RoleBaselineFlow.Catalog roles;
    private final Neo4jCypher graph;
    private final RuleAssessmentContextJpaRepository evidence;
    private final ObjectMapper json;
    private final int maximum;
    private final java.util.function.Consumer<UUID> authorizeStep;
    public CurrentRoleKnowledgeCatalog(CurrentRoleSelectionStore selections,RoleBaselineFlow.Catalog roles,Neo4jCypher graph,
            RuleAssessmentContextJpaRepository evidence,ObjectMapper json,int maximum) {
        this(selections,roles,graph,evidence,json,maximum,step->{throw new Failure(503,"PATHWAY_APPROVAL_AUTHORIZATION_UNAVAILABLE");});
    }
    public CurrentRoleKnowledgeCatalog(CurrentRoleSelectionStore selections,RoleBaselineFlow.Catalog roles,Neo4jCypher graph,
            RuleAssessmentContextJpaRepository evidence,ObjectMapper json,int maximum,java.util.function.Consumer<UUID> authorizeStep) {
        this.selections=selections;this.roles=roles;this.graph=graph;this.evidence=evidence;this.json=json;this.maximum=maximum;
        this.authorizeStep=authorizeStep;
        if(maximum<1 || maximum>1000)throw new IllegalArgumentException("Invalid assessment group capacity");
    }
    private record Definition(Requirement requirement,String skillName,String skillVersion,String mode) {}
    @Override public Context resolve(RoleBaselineFlow.Actor actor,Start command) {
        var selection=selections.current(actor).orElseThrow(()->new Failure(409,"SELECTION_REQUIRED"));
        if(!selection.selectionId().equals(command.expectedSelectionId()) || selection.revision()!=command.expectedSelectionRevision())
            throw new Failure(409,"STALE_SELECTION");
        var role=roles.roles(actor.organizationId()).stream().filter(r->r.id().equals(selection.role().id())).findFirst()
                .orElseThrow(()->new Failure(404,"ROLE_NOT_AVAILABLE"));
        var level=role.levels().stream().filter(l->l.id().equals(selection.levelId())).findFirst().orElseThrow(()->new Failure(409,"LEVEL_REQUIRED"));
        var needs=new ArrayList<Need>();var snapshot=new LinkedHashMap<String,Object>();
        snapshot.put("organizationId",actor.organizationId());snapshot.put("learnerId",actor.learnerId());
        snapshot.put("selectionId",selection.selectionId());snapshot.put("selectionRevision",selection.revision());
        snapshot.put("roleId",role.id());snapshot.put("levelId",level.id());snapshot.put("jobPositionId",role.jobPositionId());
        snapshot.put("roleName",role.name());snapshot.put("levelName",level.name());snapshot.put("jobPositionName",role.jobPositionName());
        snapshot.put("catalogFingerprint",role.fingerprint());snapshot.put("purpose",command.purpose());
        snapshot.put("start",command);
        var definitions=new ArrayList<Definition>();var exempt=new ArrayList<UUID>();
        var unresolved=new ArrayList<Map<String,String>>();
        if(command.purpose()==Purpose.BASELINE) {
            if(command.stepId()!=null || command.moduleId()!=null || command.moduleRevision()!=null)throw new Failure(400,"INVALID_REQUEST");
            for(var skill:level.skills().stream().sorted(Comparator.comparing(RoleBaselineFlow.Skill::id)).toList())
                for(var knowledge:skill.requiredKnowledgeLevels().stream().sorted().toList()) {
                Definition definition;
                try{definition=definition(actor,skill.id(),KnowledgeLevel.valueOf(knowledge));}
                catch(Failure missing) {
                    if(!"PROVISION_NOT_CONFIGURED".equals(missing.code))throw missing;
                    unresolved.add(Map.of("skillId",skill.id(),"knowledgeLevel",knowledge,"reason",missing.code));continue;
                }
                definitions.add(definition);
                if(definitions.size()>maximum)throw new Failure(422,"GROUP_CAPACITY_EXCEEDED");
                if(!definition.mode().equals("MODULE_ONLY"))continue;
                var official=evidence.official(actor.organizationId(),actor.learnerId(),skill.id(),knowledge,definition.skillVersion());
                if(official.isEmpty())needs.add(new Need(definition.requirement(),GroupRole.TARGET));else official.forEach(e->exempt.add(e.getId()));
            }
        } else {
            if(command.stepId()==null || command.moduleId()==null || command.moduleRevision()==null || command.moduleRevision()<1)throw new Failure(400,"INVALID_REQUEST");
            var completed=evidence.completedOption(actor.organizationId(),actor.learnerId(),selection.selectionId(),selection.revision(),
                    command.stepId(),command.moduleId(),command.moduleRevision()).orElseThrow(()->new Failure(409,"EXACT_LEARNING_COMPLETION_REQUIRED"));
            authorizeStep.accept(command.stepId());
            var main=definition(actor,completed.getSkillId(),KnowledgeLevel.valueOf(completed.getKnowledgeLevel()));
            if(!"MODULE_ONLY".equals(main.mode()))throw new Failure(409,"PATHWAY_PROVISION_CHANGED");
            try {
                var expected=json.readTree(completed.getRequirementSnapshot());
                if(!main.skillVersion().equals(expected.path("skillVersion").asText()))
                    throw new Failure(409,"PATHWAY_REQUIREMENT_CHANGED");
            }catch(java.io.IOException invalid){throw new Failure(503,"CONTEXT_INTEGRITY_FAILURE");}
            definitions.add(main);needs.add(new Need(main.requirement(),GroupRole.MAIN));
            prerequisiteClosure(actor,main,definitions,needs);
            snapshot.put("requestId",completed.getRequestId());snapshot.put("pathwayRevision",completed.getPathwayRevision());
            snapshot.put("moduleId",command.moduleId());snapshot.put("moduleRevision",command.moduleRevision());snapshot.put("contentVersion",completed.getContentVersion());
            snapshot.put("stepId",command.stepId());snapshot.put("stepKind",completed.getKind());
            if(completed.getSourceBypassId()!=null)snapshot.put("sourceBypassId",completed.getSourceBypassId());
        }
        snapshot.put("requirements",definitions);snapshot.put("officialExemptionEvidenceIds",exempt);
        snapshot.put("unresolvedRequirements",unresolved);
        String document=write(snapshot);
        // Retakes share their owning context; prior scores and the client retry key do not define a new allowance.
        String contextKey=command.purpose()+":"+selection.selectionId()+":"+selection.revision()+":"+
                (command.purpose()==Purpose.BASELINE?role.fingerprint():command.stepId()+":"+command.moduleId()+":"+command.moduleRevision());
        return new Context(selection.selectionId(),selection.revision(),contextKey,document,needs);
    }
    @Override public void assertCurrent(RoleBaselineFlow.Actor actor,Context context) {
        try {
            var command=json.treeToValue(json.readTree(context.snapshot()).get("start"),Start.class);
            if(!resolve(actor,command).snapshot().equals(context.snapshot()))throw new Failure(409,"ASSESSMENT_CONTEXT_CHANGED");
        }catch(java.io.IOException invalid){throw new Failure(503,"CONTEXT_INTEGRITY_FAILURE");}
    }
    private Definition definition(RoleBaselineFlow.Actor actor,String skill,KnowledgeLevel level) {
        return graph.read(tx->{
            var found=tx.list("""
                    MATCH (s:MicroSkill {id:$skill,organizationId:$org})
                    WHERE s.status='ACTIVE' AND s.reviewStatus='APPROVED' RETURN properties(s) AS skill LIMIT 2
                    """,Map.of("org",actor.organizationId().toString(),"skill",skill));
            if(found.size()!=1)throw new Failure(422,"OWNED_SKILL_CONFIGURATION_REQUIRED");
            var s=found.getFirst().get("skill");
            var modules=levels(s,"moduleOnlyKnowledgeLevels");var certificates=levels(s,"certificateOnlyKnowledgeLevels");
            if(modules.stream().anyMatch(certificates::contains))throw new Failure(422,"CONFLICTING_PROVISION_MODES");
            com.adaptlearngraph.entities.domain.SkillProvisionMode mode=null;
            if(!s.get("provisionMode").isNull())try{mode=com.adaptlearngraph.entities.domain.SkillProvisionMode.valueOf(s.get("provisionMode").asString());}
            catch(IllegalArgumentException invalid){throw new Failure(422,"INVALID_PROVISION_CONFIGURATION");}
            boolean module=modules.contains(level.name()) || mode==com.adaptlearngraph.entities.domain.SkillProvisionMode.MODULE_ONLY;
            boolean certificate=certificates.contains(level.name()) || mode==com.adaptlearngraph.entities.domain.SkillProvisionMode.CERTIFICATE_ONLY;
            if(module && certificate)throw new Failure(422,"CONFLICTING_PROVISION_MODES");
            if(!module && !certificate)throw new Failure(422,"PROVISION_NOT_CONFIGURED");
            if(s.get("version").isNull())throw new Failure(422,"EXACT_KNOWLEDGE_CONFIGURATION_REQUIRED");
            String version=s.get("version").asString();
            if(version.isBlank())throw new Failure(422,"EXACT_KNOWLEDGE_CONFIGURATION_REQUIRED");
            String name=s.get("name").asString();if(name.isBlank())throw new Failure(422,"OWNED_SKILL_CONFIGURATION_REQUIRED");
            return new Definition(new Requirement(skill,level,List.of()),name,version,module?"MODULE_ONLY":"CERTIFICATE_ONLY");
        });
    }
    private Set<String> levels(Value skill,String property) {
        var levels=skill.get(property).isNull()?List.<String>of():skill.get(property).asList(Value::asString);
        if(new HashSet<>(levels).size()!=levels.size() || levels.stream().anyMatch(l->!Set.of("FOUNDATION","INTERMEDIATE","ADVANCED").contains(l)))
            throw new Failure(422,"INVALID_PROVISION_CONFIGURATION");return Set.copyOf(levels);
    }
    private void prerequisiteClosure(RoleBaselineFlow.Actor actor,Definition current,List<Definition> definitions,List<Need> needs) {
        expand(actor,current,new HashSet<>(),new HashSet<>(),definitions,needs);
    }
    private void expand(RoleBaselineFlow.Actor actor,Definition current,Set<String> visiting,Set<String> visited,List<Definition> definitions,List<Need> needs) {
        String key=current.requirement().key();if(!visiting.add(key))throw new Failure(422,"PREREQUISITE_CYCLE");
        if(visited.add(key)) {
            var pairs=graph.read(tx->tx.list("""
                    MATCH (s:MicroSkill {id:$skill,organizationId:$org})-[p:HAS_SKILL_PREREQUISITE]->(b:MicroSkill {organizationId:$org})
                    WHERE p.status='ACTIVE' AND (p.organizationId IS NULL OR p.organizationId=$org)
                    RETURN b.id AS skill,p.dependentKnowledgeLevel AS dependent,p.prerequisiteKnowledgeLevel AS prerequisite
                    ORDER BY skill,dependent,prerequisite LIMIT $maximum
                    """,Map.of("org",actor.organizationId().toString(),"skill",current.requirement().skillId(),"maximum",maximum+1)));
            if(pairs.size()>maximum)throw new Failure(422,"GROUP_CAPACITY_EXCEEDED");
            var seen=new HashSet<String>();
            for(var pair:pairs) {
                KnowledgeLevel dependent,prerequisite;
                try{dependent=KnowledgeLevel.valueOf(pair.get("dependent").asString());prerequisite=KnowledgeLevel.valueOf(pair.get("prerequisite").asString());}
                catch(RuntimeException invalid){throw new Failure(422,"EXACT_PREREQUISITE_CONFIGURATION_REQUIRED");}
                if(dependent!=current.requirement().knowledgeLevel())continue;
                String skill=pair.get("skill").asString(),next=skill+"\n"+prerequisite;
                if(!seen.add(next))throw new Failure(422,"DUPLICATE_PREREQUISITE_PAIR");
                if(visiting.contains(next))throw new Failure(422,"PREREQUISITE_CYCLE");
                if(!visited.contains(next)) {
                    var definition=definition(actor,skill,prerequisite);
                    if(definitions.stream().noneMatch(d->d.requirement().key().equals(next))) {
                        definitions.add(definition);needs.add(new Need(definition.requirement(),GroupRole.PREREQUISITE));
                        if(definitions.size()>maximum)throw new Failure(422,"GROUP_CAPACITY_EXCEEDED");
                    }
                    expand(actor,definition,visiting,visited,definitions,needs);
                }
            }
        }
        visiting.remove(key);
    }
    private String write(Object value){try{return json.writeValueAsString(value);}catch(Exception invalid){throw new Failure(503,"CONTEXT_INTEGRITY_FAILURE");}}
}
