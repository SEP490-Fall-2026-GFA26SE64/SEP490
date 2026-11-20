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
    private ModuleAuthoringPort independentModules;
    private LearningContentPort independentLearning;
    private com.adaptlearngraph.services.SkillLearningService.Admission independentAdmission;
    private java.util.function.Consumer<com.adaptlearngraph.entities.domain.SkillAssessmentScope> scopeGuard=scope->{};
    public CurrentRoleKnowledgeCatalog scopeGuard(java.util.function.Consumer<com.adaptlearngraph.entities.domain.SkillAssessmentScope> guard) {
        this.scopeGuard=Objects.requireNonNull(guard);return this;
    }
    public CurrentRoleKnowledgeCatalog independent(ModuleAuthoringPort modules,LearningContentPort learning,com.adaptlearngraph.services.SkillLearningService.Admission admission) {
        this.independentModules=modules;this.independentLearning=learning;this.independentAdmission=admission;return this;
    }
    private Context independentContext(RoleBaselineFlow.Actor actor,Start command) {
        if(independentModules==null)throw new Failure(503,"INDEPENDENT_ASSESSMENT_UNAVAILABLE");
        return independentModules.transaction(()->{
            var trusted=independentModules.actor();
            if(!trusted.organizationId().equals(actor.organizationId().toString()) || !trusted.id().equals(actor.learnerId().toString()) || !trusted.roles().contains("EMPLOYEE"))throw new Failure(403,"FORBIDDEN");
            var doc=independentModules.lock(trusted.organizationId(),command.moduleId()).orElseThrow(()->new Failure(404,"MODULE_NOT_FOUND"));
            var revision=doc.revisions().stream().filter(v->v.number()==command.moduleRevision()).findFirst().orElseThrow(()->new Failure(409,"LEARNING_PACKAGE_UNAVAILABLE"));
            String reason=independentAdmission.reason(trusted,doc,revision);if(reason!=null)throw new Failure(403,reason);
            if(!independentLearning.selfStudyRevision(trusted.organizationId(),trusted.id(),doc.id(),revision.number()) || !independentLearning.assignedRevision(trusted.organizationId(),trusted.id(),doc.id(),revision.number()))throw new Failure(403,"INDEPENDENT_LEARNING_REQUIRED");
            var p=revision.payload();String skill=p.teachings().getFirst().skillId();
            var proof=independentLearning.completions(trusted.organizationId(),trusted.id(),skill).stream().filter(c->c.moduleId().equals(doc.id()) && c.revision()==revision.number()
                && c.contentVersion().equals(p.contentVersion()) && p.knowledgeLevel().name().equals(c.knowledgeLevel()) && p.skillVersion().equals(c.skillVersion())).findFirst()
                .orElseThrow(()->new Failure(409,"EXACT_LEARNING_COMPLETION_REQUIRED"));
            var main=definition(actor,skill,p.knowledgeLevel());if(!main.mode().equals("MODULE_ONLY"))throw new Failure(409,"PROVISION_CHANGED");
            requireFoundations(actor,main);
            var definitions=new ArrayList<Definition>();var needs=new ArrayList<Need>();definitions.add(main);needs.add(new Need(main.requirement(),GroupRole.MAIN));
            prerequisiteClosure(actor,main,definitions,needs);
            var snapshot=new LinkedHashMap<String,Object>();snapshot.put("learningContext","INDEPENDENT_SKILL");snapshot.put("organizationId",actor.organizationId());snapshot.put("learnerId",actor.learnerId());
            snapshot.put("purpose",command.purpose());snapshot.put("start",command);snapshot.put("moduleId",doc.id());snapshot.put("moduleRevision",revision.number());snapshot.put("contentVersion",p.contentVersion());
            snapshot.put("completionAt",proof.completedAt());snapshot.put("requirements",definitions);snapshot.put("officialExemptionEvidenceIds",List.of());snapshot.put("unresolvedRequirements",List.of());
            return new Context(null,0,"INDEPENDENT_SKILL:"+doc.id()+":"+revision.number(),write(snapshot),needs);
        });
    }
    @Override public com.adaptlearngraph.entities.domain.SkillAssessmentScope scopeForModule(RoleBaselineFlow.Actor actor,String moduleId,int number) {
        if(independentModules==null)throw new Failure(503,"INDEPENDENT_ASSESSMENT_UNAVAILABLE");
        return independentModules.transaction(()->{
            var trusted=independentModules.actor();
            if(!trusted.organizationId().equals(actor.organizationId().toString()) || !trusted.id().equals(actor.learnerId().toString()) || !trusted.roles().contains("EMPLOYEE"))throw new Failure(403,"FORBIDDEN");
            var doc=independentModules.lock(trusted.organizationId(),moduleId).orElseThrow(()->new Failure(404,"MODULE_NOT_FOUND"));
            var revision=doc.revisions().stream().filter(r->r.number()==number && r.state().equals("RELEASED")).findFirst().orElseThrow(()->new Failure(409,"LEARNING_PACKAGE_UNAVAILABLE"));
            var p=revision.payload();
            if(p.teachings().size()!=1 || p.knowledgeLevel()==null || p.skillVersion()==null || !"APPROVED".equals(p.metadata().reviewStatus()))throw new Failure(409,"SKILL_SCOPE_RECONCILIATION_REQUIRED");
            return new com.adaptlearngraph.entities.domain.SkillAssessmentScope(p.teachings().getFirst().skillId(),p.knowledgeLevel(),p.skillVersion());
        });
    }
    private record Definition(Requirement requirement,String skillName,String skillVersion,String mode) {}
    @Override public Context resolve(RoleBaselineFlow.Actor actor,Start command) {
        if(command.independent())return independentContext(actor,command);
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
            if(level.skills().isEmpty() || level.skills().stream().anyMatch(skill->skill.requiredKnowledgeLevels().isEmpty()))
                throw new Failure(422,"ROLE_REQUIREMENTS_NOT_CONFIGURED");
            for(var skill:level.skills().stream().sorted(Comparator.comparing(RoleBaselineFlow.Skill::id)).toList())
                for(var knowledge:skill.requiredKnowledgeLevels().stream().sorted().toList()) {
                Definition definition;
                try{definition=definition(actor,skill.id(),KnowledgeLevel.valueOf(knowledge));}
                catch(Failure missing) {
                    if(!"PROVISION_NOT_CONFIGURED".equals(missing.code))throw missing;
                    unresolved.add(Map.of("skillId",skill.id(),"knowledgeLevel",knowledge,"reason",missing.code));continue;
                }
                for(var candidate:KnowledgeLevel.values())if(candidate.ordinal()<=definition.requirement().knowledgeLevel().ordinal()) {
                    var group=definition(actor,skill.id(),candidate);
                    if(definitions.stream().anyMatch(d->d.requirement().key().equals(group.requirement().key())))continue;
                    definitions.add(group);
                    if(definitions.size()>maximum)throw new Failure(422,"GROUP_CAPACITY_EXCEEDED");
                    var official=evidence.official(actor.organizationId(),actor.learnerId(),skill.id(),candidate.name(),group.skillVersion());
                    boolean priorLower=candidate.ordinal()<definition.requirement().knowledgeLevel().ordinal()
                            && evidence.assessed(actor.organizationId(),actor.learnerId(),skill.id(),candidate.name(),group.skillVersion()).isPresent();
                    if(official.isEmpty() && !priorLower)needs.add(new Need(group.requirement(),GroupRole.TARGET));
                    else official.forEach(e->exempt.add(e.getId()));
                }
            }
        } else {
            if(command.stepId()==null || command.moduleId()==null || command.moduleRevision()==null || command.moduleRevision()<1)throw new Failure(400,"INVALID_REQUEST");
            var completed=evidence.completedOption(actor.organizationId(),actor.learnerId(),selection.selectionId(),selection.revision(),
                    command.stepId(),command.moduleId(),command.moduleRevision()).orElseThrow(()->new Failure(409,"EXACT_LEARNING_COMPLETION_REQUIRED"));
            authorizeStep.accept(command.stepId());
            var main=definition(actor,completed.getSkillId(),KnowledgeLevel.valueOf(completed.getKnowledgeLevel()));
            requireFoundations(actor,main);
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
    private void requireFoundations(RoleBaselineFlow.Actor actor,Definition main) {
        if(evidence.foundationsPending(actor.organizationId(),actor.learnerId(),main.requirement().skillId(),main.requirement().knowledgeLevel().name(),main.skillVersion()))
            throw new Failure(423,"REQUIRED_SUPPLEMENT_NOT_READY");
    }
    @Override public String admissionIssue(RoleBaselineFlow.Actor actor,com.adaptlearngraph.entities.domain.SkillAssessmentScope scope) {
        try {
            scopeGuard.accept(scope);
            if(evidence.foundationsPending(actor.organizationId(),actor.learnerId(),scope.skillId(),scope.knowledgeLevel().name(),scope.skillVersion()))return "REQUIRED_SUPPLEMENT_NOT_READY";
            return null;
        }catch(Failure denied){if(denied.status>=500)throw denied;return denied.code;}
    }
    @Override public void assertAccessible(RoleBaselineFlow.Actor actor,String frozenContext) {
        try {
            var context=json.readTree(frozenContext).path("context");
            if(!"SKILL_ASSESSMENT".equals(context.path("purpose").asText()))return;
            var start=json.treeToValue(context.path("start"),Start.class);
            if(start.independent()) {
                var doc=independentModules.lock(actor.organizationId().toString(),start.moduleId()).orElseThrow(()->new Failure(404,"MODULE_NOT_FOUND"));
                var revision=doc.revisions().stream().filter(item->item.number()==start.moduleRevision()).findFirst().orElseThrow(()->new Failure(409,"LEARNING_PACKAGE_UNAVAILABLE"));
                var reason=independentAdmission.reason(independentModules.actor(),doc,revision);if(reason!=null)throw new Failure(423,reason);
            } else authorizeStep.accept(start.stepId());
            var main=json.treeToValue(context.path("requirements").get(0),Definition.class);
            requireFoundations(actor,main);
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
            if(s.get("version").isNull())throw new Failure(422,"EXACT_KNOWLEDGE_CONFIGURATION_REQUIRED");
            String version=s.get("version").asString();
            if(version.isBlank())throw new Failure(422,"EXACT_KNOWLEDGE_CONFIGURATION_REQUIRED");
            String name=s.get("name").asString();if(name.isBlank())throw new Failure(422,"OWNED_SKILL_CONFIGURATION_REQUIRED");
            return new Definition(new Requirement(skill,level,List.of()),name,version,module?"MODULE_ONLY":certificate?"CERTIFICATE_ONLY":"UNCONFIGURED");
        });
    }
    private Set<String> levels(Value skill,String property) {
        var levels=skill.get(property).isNull()?List.<String>of():skill.get(property).asList(Value::asString);
        if(new HashSet<>(levels).size()!=levels.size() || levels.stream().anyMatch(l->!Set.of("FOUNDATION","INTERMEDIATE","ADVANCED").contains(l)))
            throw new Failure(422,"INVALID_PROVISION_CONFIGURATION");return Set.copyOf(levels);
    }
    private void prerequisiteClosure(RoleBaselineFlow.Actor actor,Definition current,List<Definition> definitions,List<Need> needs) {
        var visiting=new HashSet<String>();var visited=new HashSet<String>();
        expand(actor,current,visiting,visited,definitions,needs,true);
        // Lower levels apply to MAIN only; cross-Skill scopes follow their explicit graph configuration.
        for(var lower:KnowledgeLevel.values())if(lower.ordinal()<current.requirement().knowledgeLevel().ordinal()) {
            Definition foundation;
            try{foundation=definition(actor,current.requirement().skillId(),lower);}
            catch(Failure missing){if("PROVISION_NOT_CONFIGURED".equals(missing.code))continue;throw missing;}
            if(definitions.stream().noneMatch(d->d.requirement().key().equals(foundation.requirement().key()))) {
                definitions.add(foundation);needs.add(new Need(foundation.requirement(),GroupRole.PREREQUISITE));
                if(definitions.size()>maximum)throw new Failure(422,"GROUP_CAPACITY_EXCEEDED");
            }
        }
    }
    private void expand(RoleBaselineFlow.Actor actor,Definition current,Set<String> visiting,Set<String> visited,List<Definition> definitions,List<Need> needs,boolean includeSkillEdges) {
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
                String skill=pair.get("skill").asString();
                KnowledgeLevel prerequisite;
                Definition definition;
                if(pair.get("dependent").isNull() && pair.get("prerequisite").isNull()) {
                    if(!includeSkillEdges)continue;
                    definition=definition(actor,skill,KnowledgeLevel.ADVANCED);
                    prerequisite=definition.requirement().knowledgeLevel();
                } else {
                    KnowledgeLevel dependent;
                    try{dependent=KnowledgeLevel.valueOf(pair.get("dependent").asString());prerequisite=KnowledgeLevel.valueOf(pair.get("prerequisite").asString());}
                    catch(RuntimeException invalid){throw new Failure(422,"EXACT_PREREQUISITE_CONFIGURATION_REQUIRED");}
                    if(dependent!=current.requirement().knowledgeLevel())continue;
                    prerequisite=KnowledgeLevel.ADVANCED;
                    definition=definition(actor,skill,prerequisite);
                }
                String next=skill+"\n"+prerequisite;
                if(!seen.add(next))continue;
                if(visiting.contains(next))throw new Failure(422,"PREREQUISITE_CYCLE");
                if(!visited.contains(next)) {
                    if(definitions.stream().noneMatch(d->d.requirement().key().equals(next))) {
                        definitions.add(definition);needs.add(new Need(definition.requirement(),GroupRole.PREREQUISITE));
                        if(definitions.size()>maximum)throw new Failure(422,"GROUP_CAPACITY_EXCEEDED");
                    }
                    expand(actor,definition,visiting,visited,definitions,needs,true);
                }
            }
        }
        visiting.remove(key);
    }
    private String write(Object value){try{return json.writeValueAsString(value);}catch(Exception invalid){throw new Failure(503,"CONTEXT_INTEGRITY_FAILURE");}}
}
