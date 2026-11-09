package com.adaptlearngraph.repository;

import com.adaptlearngraph.services.RoleBaselineFlow;
import com.adaptlearngraph.services.RoleBaselineFlow.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;
import org.neo4j.driver.Value;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

/** TMP-MA-CATALOG-BINDING-20261101: default-off, read-only, exact configured identities only. */
public final class Neo4jAuthoredCatalog implements AuthoredCatalogPort {
    private static final String PREFIX="assessment.baseline.workspace.catalog.authored-bindings";
    private static final int MAX_SNAPSHOT_BYTES=2_000_000;
    private final Neo4jCypher graph;private final ObjectMapper json;private final List<Binding> bindings;
    private final int maximum;
    private Neo4jAuthoredCatalog(Neo4jCypher graph,ObjectMapper json,List<Binding> bindings,int maximum) {
        this.graph=graph;this.json=json.copy().configure(com.fasterxml.jackson.databind.SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS,true);this.bindings=List.copyOf(bindings);this.maximum=maximum;
        if(bindings.isEmpty() || bindings.size()>1000 || maximum<1 || maximum>100000)throw invalid();
        var scopes=new HashSet<String>();var roles=new HashSet<String>();
        for(var b:bindings) {
            if(!scopes.add(b.organizationId()+"\n"+b.jobPositionId()))throw invalid();
            for(var id:b.roleIds())if(!roles.add(b.organizationId()+"\n"+id))throw invalid();
        }
    }
    public static AuthoredCatalogPort configured(Neo4jCypher graph,ObjectMapper json,Environment env) {
        if(!env.getProperty(PREFIX+".enabled",Boolean.class,false))return NONE;
        if(!env.acceptsProfiles(Profiles.of("local & workspace-baseline & !prod")))throw invalid();
        var bindings=Binder.get(env).bind(PREFIX+".entries",Bindable.listOf(Binding.class)).orElse(List.of());
        return new Neo4jAuthoredCatalog(graph,json,bindings,env.getProperty(PREFIX+".max-requirements",Integer.class,10000));
    }
    @Override public Set<String> jobPositions(UUID org) {
        var result=new HashSet<String>();bindings.stream().filter(b->b.organizationId().equals(org)).forEach(b->result.add(b.jobPositionId()));return Set.copyOf(result);
    }
    @Override public Optional<Projection> find(UUID org,String jobPosition) {
        var found=bindings.stream().filter(b->b.organizationId().equals(org) && b.jobPositionId().equals(jobPosition)).findFirst();
        if(found.isEmpty())return Optional.empty();var binding=found.get();
        // Neo4jClient: one bounded projection over exact configured identities, validated field by field.
        try {
            return Optional.of(graph.read(tx->{
                var rows=tx.list("""
                        MATCH (o:JobPosition {id:$jobPosition}), (r:TargetRole)
                        WHERE r.id IN $roles AND r.organizationId IN $owners
                        OPTIONAL MATCH (parent:JobPosition)-[m:HAS_ROLE]->(r)
                        WHERE m.status='ACTIVE' AND parent.status='ACTIVE'
                        WITH o,r,collect(DISTINCT parent.id) AS parents
                        OPTIONAL MATCH (r)-[q:REQUIRES_SKILL]->(s:MicroSkill)
                        RETURN properties(o) AS o,elementId(o) AS oi,properties(r) AS r,elementId(r) AS ri,
                               parents,properties(q) AS q,properties(s) AS s
                        ORDER BY r.id,q.level,s.id LIMIT $maximum
                        """,Map.of("jobPosition",jobPosition,"roles",binding.roleIds(),"owners",List.copyOf(binding.sourceOwners()),"maximum",maximum+1));
                if(rows.isEmpty() || rows.size()>maximum)throw invalid();
                var first=rows.getFirst().get("o");owned(first,binding);active(first);
                var node=rows.getFirst().get("oi").asString();String name=text(first,"name"),catalogVersion=text(first,"version");
                var roleNodes=new HashMap<String,String>();var sourceRoles=new TreeMap<String,Value>();
                var requirements=new TreeMap<String,Map<String,Map<String,Skill>>>();
                var roleVersions=new TreeMap<String,String>();var skillVersions=new TreeMap<String,String>();var skillFacts=new HashMap<String,List<String>>();
                var canonical=new CanonicalFacts();
                canonical.add(write(Map.of("format",binding.sourceFormat(),"policy","ALL_LISTED_REQUIREMENTS_V1","org",org.toString(),
                        "jobPosition",jobPosition,"name",name,"version",catalogVersion,"binding",binding.bindingRevision(),
                        "provenance",binding.provenanceRef(),"roles",binding.roleIds().stream().sorted().toList(),"owners",binding.sourceOwners().stream().sorted().toList())));
                canonical.add(write(Map.of("jobPositionOwner",text(first,"organizationId"),"jobPositionStatus",text(first,"status"))));
                for(var row:rows) {
                    if(!node.equals(row.get("oi").asString()))throw invalid();
                    var r=row.get("r");owned(r,binding);String status=text(r,"status");
                    if(!Set.of("ACTIVE","PUBLISHED").contains(status))throw invalid();
                    String id=text(r,"id");String identity=row.get("ri").asString();
                    if(roleNodes.putIfAbsent(id,identity)!=null && !roleNodes.get(id).equals(identity))throw invalid();
                    var parents=row.get("parents").asList(Value::asString);
                    if(parents.size()>1 || parents.size()==1 && !parents.getFirst().equals(jobPosition))throw invalid();
                    sourceRoles.put(id,r);roleVersions.put(id,text(r,"version"));
                    var levels=r.get("levels").asList(Value::asString);
                    if(levels.isEmpty() || levels.size()>100 || new HashSet<>(levels).size()!=levels.size())throw invalid();
                    for(String level:levels)if(level.isBlank() || !level.equals(level.strip()) || level.length()>200)throw invalid();
                    canonical.add(write(Map.of("role",id,"name",text(r,"name"),"code",text(r,"code"),"version",text(r,"version"),
                            "status",status,"owner",text(r,"organizationId"),"levels",levels,"description",r.get("description").asString(""))));
                    canonical.add(write(Map.of("role",id,"activeParents",parents.stream().sorted().toList())));
                    var q=row.get("q");if(q.isNull())continue;
                    String requirementStatus=text(q,"status");if(!"ACTIVE".equals(requirementStatus))continue;
                    var s=row.get("s");owned(s,binding);active(s);
                    if(!q.get("organizationId").isNull() && !binding.sourceOwners().contains(q.get("organizationId").asString()))throw invalid();
                    String level=text(q,"level");if(!levels.contains(level))throw invalid();
                    String skill=text(s,"id"),skillName=text(s,"name"),skillVersion=text(s,"version"),code=s.get("code").asString(null);
                    var facts=List.of(skillName,skillVersion,Objects.toString(code,""));
                    if(skillFacts.putIfAbsent(skill,facts)!=null && !skillFacts.get(skill).equals(facts))throw invalid();
                    skillVersions.put(skill,skillVersion);
                    var knowledge=q.get("requiredKnowledgeLevels").asList(Value::asString);
                    if(knowledge.isEmpty() || new HashSet<>(knowledge).size()!=knowledge.size()
                        || knowledge.stream().anyMatch(k->!Set.of("FOUNDATION","INTERMEDIATE","ADVANCED").contains(k)))throw invalid();
                    var levelSkills=requirements.computeIfAbsent(id,k->new TreeMap<>()).computeIfAbsent(level,k->new TreeMap<>());
                    if(levelSkills.putIfAbsent(skill,new Skill(skill,code,skillName,knowledge,true))!=null)throw invalid();
                    canonical.add(write(Map.of("role",id,"level",level,"skill",skill,"name",skillName,"code",Objects.toString(code,""),
                            "skillVersion",skillVersion,"requiredKnowledgeLevels",knowledge,"mandatoryPolicy","ALL_LISTED_REQUIREMENTS_V1","status","ACTIVE")));
                    canonical.add(write(Map.of("role",id,"level",level,"skill",skill,"skillOwner",text(s,"organizationId"),
                            "requirementOwner",q.get("organizationId").asString(""))));
                }
                if(!sourceRoles.keySet().equals(Set.copyOf(binding.roleIds())))throw invalid();
                String fingerprint=RoleBaselineFlow.hash("AUTHORED-CATALOG-V1:"+write(canonical.values));var result=new ArrayList<Role>();
                for(var entry:sourceRoles.entrySet()) {
                    var r=entry.getValue();var levels=new ArrayList<Level>();int rank=0;
                    for(String label:r.get("levels").asList(Value::asString)) {
                        var skills=requirements.getOrDefault(entry.getKey(),Map.of()).getOrDefault(label,Map.of());
                        levels.add(new Level(label,label,label,++rank,"","ALL_MANDATORY_SKILLS",List.copyOf(skills.values())));
                    }
                    result.add(new Role(entry.getKey(),text(r,"code"),text(r,"name"),r.get("description").asString(""),jobPosition,name,catalogVersion,fingerprint,levels));
                }
                return new Projection(org,jobPosition,name,fingerprint,binding.bindingRevision(),result,roleVersions,skillVersions);
            }));
        } catch(IllegalStateException failure){throw failure;}catch(RuntimeException failure){throw new IllegalStateException("Authored catalog unavailable or inconsistent",failure);}
    }
    private static final class CanonicalFacts {
        private final Set<String> values=new TreeSet<>();private long bytes=2;
        void add(String value) {
            // A conservative JSON budget includes worst-case escaping when canonical lines are serialized.
            if(values.add(value))bytes+=6L*value.getBytes(java.nio.charset.StandardCharsets.UTF_8).length+3;
            if(bytes>MAX_SNAPSHOT_BYTES)throw invalid();
        }
    }
    private String write(Object value){try{return json.writeValueAsString(value);}catch(com.fasterxml.jackson.core.JsonProcessingException failure){throw new IllegalStateException("Invalid catalog canonical data",failure);}}
    private static String text(Value v,String key){String t=v.get(key).asString();if(t.isBlank() || !t.equals(t.strip()) || t.length()>2000)throw invalid();return t;}
    private static void owned(Value v,Binding b){if(v.isNull() || !b.sourceOwners().contains(v.get("organizationId").asString(null)))throw invalid();}
    private static void active(Value v){if(!"ACTIVE".equals(v.get("status").asString(null)))throw invalid();}
    private static IllegalStateException invalid(){return new IllegalStateException("Explicit authored catalog binding/source is unavailable or invalid");}
}
