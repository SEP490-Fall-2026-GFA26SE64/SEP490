package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.AssessmentPolicyScope;
import com.adaptlearngraph.entities.domain.AssessmentPolicyScope.*;
import com.adaptlearngraph.entities.domain.RuleAssessment.Purpose;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.SkillProvisionMode;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import com.adaptlearngraph.services.RoleBaselineFlow;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.neo4j.driver.Value;

/** Reads the owner's canonical ontology. Discovery never creates or repairs Role/Level nodes. */
public final class Neo4jAssessmentPolicyCatalog implements AssessmentPolicyCatalog {
    private final Neo4jCypher graph;private final ObjectMapper json;
    public Neo4jAssessmentPolicyCatalog(Neo4jCypher graph,ObjectMapper json){this.graph=graph;this.json=json;}
    private record Skill(String id,String name,String version,SkillProvisionMode mode,boolean invalidMode,
                         List<String> modules,List<String> certificates,Map<KnowledgeLevel,List<String>> outcomes,boolean approved) {}
    private record Edge(String skill,KnowledgeLevel level,String prerequisite,KnowledgeLevel prerequisiteLevel) {}
    private record Need(String skill,String level) {}
    private record RoleLevel(String id,String name,String level,String levelName,int rank,String version,String status,List<Need> needs,Set<String> problems) {}
    @Override public List<Scope> scopes(UUID organization,Purpose purpose){return discover(organization,purpose).scopes();}
    @Override public Discovery discover(UUID organization,Purpose purpose) {
        return graph.read(5,tx->{
            var params=Map.<String,Object>of("org",organization.toString());
            var rows=tx.list("MATCH (s:MicroSkill {organizationId:$org}) WHERE s.status='ACTIVE' RETURN properties(s) AS skill ORDER BY s.id LIMIT 10001",params);
            if(rows.size()>10000)throw capacity();
            var skills=new TreeMap<String,Skill>();
            for(var row:rows) {
                var s=row.get("skill");var outcomes=new EnumMap<KnowledgeLevel,List<String>>(KnowledgeLevel.class);
                outcomes.put(KnowledgeLevel.FOUNDATION,list(s,"foundationOutcomeCodes"));
                outcomes.put(KnowledgeLevel.INTERMEDIATE,list(s,"intermediateOutcomeCodes"));
                outcomes.put(KnowledgeLevel.ADVANCED,list(s,"advancedOutcomeCodes"));
                SkillProvisionMode mode=null;boolean invalidMode=false;
                if(!s.get("provisionMode").isNull())try{mode=SkillProvisionMode.valueOf(s.get("provisionMode").asString());}
                catch(IllegalArgumentException invalid){invalidMode=true;}
                var skill=new Skill(text(s,"id"),text(s,"name"),s.get("version").asString(""),mode,invalidMode,
                        list(s,"moduleOnlyKnowledgeLevels"),list(s,"certificateOnlyKnowledgeLevels"),outcomes,
                        "APPROVED".equals(s.get("reviewStatus").asString("")));
                if(skills.putIfAbsent(skill.id(),skill)!=null)throw new Failure(503,"AMBIGUOUS_CATALOG_IDENTITY");
            }
            var result=new ArrayList<Scope>();var issues=new ArrayList<Issue>();
            if(purpose==Purpose.BASELINE) {
                var missing=tx.list("""
                        MATCH (r:TargetRole {organizationId:$org})
                        WHERE NOT r.status IN ['ARCHIVED','DELETED','INACTIVE','SUPERSEDED']
                        UNWIND coalesce(r.levels,[]) AS token
                        WITH r,token
                        WHERE NOT EXISTS {
                            MATCH (r)-[h:HAS_LEVEL]->(l:Level)
                            WHERE h.status='ACTIVE' AND l.status='ACTIVE'
                              AND (h.organizationId IS NULL OR h.organizationId=$org)
                              AND (l.organizationId IS NULL OR l.organizationId=$org)
                              AND (l.id=token OR l.name=token OR l.code=token)
                        }
                        RETURN r.id AS id,r.name AS name,token AS level LIMIT 10001
                        """,params);
                if(missing.size()>10000)throw capacity();
                for(var row:missing)issues.add(new Issue(row.get("id").asString(),row.get("name").asString(),
                        row.get("level").asString(),"CATALOG_MEMBER_LEVEL_IDENTITY_REQUIRED"));
                var roles=tx.list("""
                        MATCH (r:TargetRole {organizationId:$org})-[h:HAS_LEVEL]->(l:Level)
                        WHERE NOT r.status IN ['ARCHIVED','DELETED','INACTIVE','SUPERSEDED']
                          AND h.status='ACTIVE' AND l.status='ACTIVE'
                          AND (l.organizationId IS NULL OR l.organizationId=$org)
                          AND (h.organizationId IS NULL OR h.organizationId=$org)
                        OPTIONAL MATCH (l)-[q:REQUIRES_SKILL]->(s:MicroSkill {organizationId:$org})
                        WHERE q.status='ACTIVE' AND (q.organizationId IS NULL OR q.organizationId=$org)
                        RETURN properties(r) AS role,l.id AS levelId,l.name AS levelName,coalesce(l.rank,0) AS rank,
                            properties(q) AS requirement,s.id AS skillId
                        LIMIT 50001
                        """,params);
                if(roles.size()>50000)throw capacity();
                var levels=new LinkedHashMap<String,RoleLevel>();
                for(var row:roles) {
                    var r=row.get("role");String id=text(r,"id"),level=row.get("levelId").asString();
                    var key=AssessmentPolicyScope.key(purpose,id,level);
                    var entry=levels.computeIfAbsent(key,k->new RoleLevel(id,text(r,"name"),level,row.get("levelName").asString(),
                            row.get("rank").asInt(),r.get("version").asString(""),r.get("status").asString(""),new ArrayList<>(),new TreeSet<>()));
                    if(!row.get("skillId").isNull()) {
                        var required=list(row.get("requirement"),"requiredKnowledgeLevels");
                        if(required.isEmpty())entry.problems().add("EXACT_KNOWLEDGE_CONFIGURATION_REQUIRED");
                        else for(String knowledge:required) {
                            try{KnowledgeLevel.valueOf(knowledge);entry.needs().add(new Need(row.get("skillId").asString(),knowledge));}
                            catch(IllegalArgumentException invalid){entry.problems().add("INVALID_KNOWLEDGE_CONFIGURATION");}
                        }
                    }
                }
                for(var role:levels.values()) {
                    var groups=new LinkedHashMap<String,GroupSpec>();var problems=new TreeSet<>(role.problems());
                    if(!Set.of("ACTIVE","PUBLISHED").contains(role.status()))problems.add("CATALOG_NOT_PUBLISHED");
                    if(role.version().isBlank())problems.add("EXACT_KNOWLEDGE_CONFIGURATION_REQUIRED");
                    for(var need:role.needs()) {
                        var skill=skills.get(need.skill());
                        if(skill==null){problems.add("OWNED_SKILL_CONFIGURATION_REQUIRED");continue;}
                        var knowledge=KnowledgeLevel.valueOf(need.level());
                        if(provision(skill,knowledge)==SkillProvisionMode.CERTIFICATE_ONLY)continue;
                        add(skill,knowledge,groups);
                    }
                    result.add(scope(purpose,role.id(),role.name(),role.level(),role.levelName(),role.rank(),role.version()+":"+role.status(),groups,problems));
                }
            } else {
                var edges=tx.list("""
                        MATCH (s:MicroSkill {organizationId:$org})-[p:HAS_SKILL_PREREQUISITE]->(b:MicroSkill {organizationId:$org})
                        WHERE s.status='ACTIVE' AND p.status='ACTIVE' AND (p.organizationId IS NULL OR p.organizationId=$org)
                        RETURN s.id AS skill,p.dependentKnowledgeLevel AS level,b.id AS prerequisite,p.prerequisiteKnowledgeLevel AS prerequisiteLevel LIMIT 50001
                        """,params);
                if(edges.size()>50000)throw capacity();
                var prerequisites=new HashMap<String,List<Edge>>();var invalidPrerequisites=new HashSet<String>();
                for(var row:edges) {
                    String source=row.get("skill").asString();Edge edge;
                    try {
                        edge=new Edge(source,KnowledgeLevel.valueOf(row.get("level").asString("")),row.get("prerequisite").asString(),KnowledgeLevel.valueOf(row.get("prerequisiteLevel").asString("")));
                    }catch(RuntimeException malformed) {
                        // Unknown endpoints affect every level of this source Skill and
                        // all transitive consumers. Never infer levels from legacy scores.
                        invalidPrerequisites.add(source);continue;
                    }
                    prerequisites.computeIfAbsent(edge.skill()+"\n"+edge.level(),k->new ArrayList<>()).add(edge);
                }
                // Resolve current common-mode and explicit historical per-level mappings alike.
                for(var skill:skills.values())for(var level:KnowledgeLevel.values()) {
                    if(provision(skill,level)!=SkillProvisionMode.MODULE_ONLY)continue;
                    String knowledge=level.name();var groups=new LinkedHashMap<String,GroupSpec>();var problems=new TreeSet<String>();
                    expand(skill.id(),level,skills,prerequisites,invalidPrerequisites,groups,new HashSet<>(),new HashSet<>(),problems);
                    result.add(scope(purpose,skill.id(),skill.name(),knowledge,knowledge,level.ordinal(),skill.version(),groups,problems));
                    if(result.size()>10000)throw capacity();
                }
            }
            if(result.size()>10000 || result.stream().map(Scope::key).distinct().count()!=result.size())throw capacity();
            return new Discovery(result,issues);
        });
    }
    private void expand(String id,KnowledgeLevel level,Map<String,Skill> skills,Map<String,List<Edge>> edges,Set<String> invalidPrerequisites,
                        Map<String,GroupSpec> groups,Set<String> visiting,Set<String> visited,Set<String> problems) {
        String key=id+"\n"+level;
        if(!visiting.add(key)){problems.add("PREREQUISITE_CYCLE");return;}
        if(visited.contains(key)){visiting.remove(key);return;}
        if(visiting.size()>100 || groups.size()>1000)throw new Failure(422,"GROUP_CAPACITY_EXCEEDED");
        var skill=skills.get(id);
        if(invalidPrerequisites.contains(id))problems.add("PREREQUISITE_LEVELS_NOT_CONFIGURED");
        if(skill==null)problems.add("OWNED_SKILL_CONFIGURATION_REQUIRED");else add(skill,level,groups);
        for(var edge:edges.getOrDefault(key,List.of()))
            expand(edge.prerequisite(),edge.prerequisiteLevel(),skills,edges,invalidPrerequisites,groups,visiting,visited,problems);
        visiting.remove(key);visited.add(key);
    }
    private SkillProvisionMode provision(Skill skill,KnowledgeLevel level) {
        boolean module=skill.mode()==SkillProvisionMode.MODULE_ONLY || skill.modules().contains(level.name());
        boolean certificate=skill.mode()==SkillProvisionMode.CERTIFICATE_ONLY || skill.certificates().contains(level.name());
        if(skill.invalidMode() || module==certificate)return null;
        return module?SkillProvisionMode.MODULE_ONLY:SkillProvisionMode.CERTIFICATE_ONLY;
    }
    private void add(Skill skill,KnowledgeLevel level,Map<String,GroupSpec> groups) {
        var problems=new TreeSet<String>();var mode=provision(skill,level);
        if(mode!=SkillProvisionMode.MODULE_ONLY)problems.add("LEARNING_PROVISION_REQUIRED");
        if(skill.invalidMode())problems.add("INVALID_PROVISION_CONFIGURATION");
        if(!skill.approved())problems.add("CATALOG_REVIEW_REQUIRED");
        if(skill.version().isBlank())problems.add("EXACT_KNOWLEDGE_CONFIGURATION_REQUIRED");
        var outcomes=skill.outcomes().get(level);
        if(outcomes.isEmpty())problems.add("ASSESSMENT_OUTCOMES_NOT_CONFIGURED");
        var need=new ConfigurationRequirement(skill.id(),level,outcomes);
        groups.put(need.key(),new GroupSpec(need,skill.name(),skill.version().isBlank()?null:skill.version(),mode,List.copyOf(problems)));
    }
    private Scope scope(Purpose purpose,String id,String name,String level,String levelName,int rank,String version,
                        Map<String,GroupSpec> groups,Set<String> problems) {
        var ordered=groups.values().stream().sorted(Comparator.comparing(g->g.requirement().key())).toList();
        var allProblems=new TreeSet<>(problems);
        if(ordered.isEmpty())allProblems.add("EXACT_KNOWLEDGE_CONFIGURATION_REQUIRED");
        ordered.forEach(group->allProblems.addAll(group.readinessIssues()));
        String hash;
        try{hash=RoleBaselineFlow.hash(json.writeValueAsString(List.of(purpose,id,name,level,levelName,version,ordered,allProblems)));}
        catch(java.io.IOException invalid){throw new Failure(503,"CATALOG_INTEGRITY_FAILURE");}
        return new Scope(AssessmentPolicyScope.key(purpose,id,level),purpose,id,name,level,levelName,level,rank,hash,ordered,allProblems.isEmpty(),List.copyOf(allProblems));
    }
    private static Failure capacity(){return new Failure(422,"CATALOG_CAPACITY_EXCEEDED");}
    private static KnowledgeLevel level(String value){try{return KnowledgeLevel.valueOf(value);}catch(RuntimeException invalid){throw new Failure(422,"INVALID_KNOWLEDGE_CONFIGURATION");}}
    private static String text(Value value,String field){String result=value.get(field).asString("");if(result.isBlank())throw new Failure(503,"CATALOG_INTEGRITY_FAILURE");return result;}
    private static List<String> list(Value value,String field){return value.isNull() || value.get(field).isNull()?List.of():value.get(field).asList(Value::asString).stream().sorted().toList();}
}
