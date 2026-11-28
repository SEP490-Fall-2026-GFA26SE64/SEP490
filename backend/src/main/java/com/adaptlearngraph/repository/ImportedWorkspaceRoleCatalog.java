package com.adaptlearngraph.repository;

import com.adaptlearngraph.services.RoleBaselineFlow;
import com.adaptlearngraph.services.RoleBaselineFlow.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.neo4j.driver.Value;

/** Registration imports use the Role publication workflow, not the legacy ontology review workflow. */
final class ImportedWorkspaceRoleCatalog {
    private final Neo4jCypher graph;
    private final ObjectMapper json;
    ImportedWorkspaceRoleCatalog(Neo4jCypher graph,ObjectMapper json){this.graph=graph;this.json=json;}

    Set<String> jobPositions(UUID org) {
        return graph.read(tx->{
            var rows=tx.list("MATCH (o:JobPosition {organizationId:$org,source:'REGISTRATION_IMPORT',status:'ACTIVE'}) RETURN o.id AS id LIMIT 1001",Map.of("org",org.toString()));
            if(rows.size()>1000)throw new IllegalStateException("Imported catalog capacity exceeded");
            var ids=new HashSet<String>();for(var row:rows)if(!ids.add(row.get("id").asString()))throw invalid();return Set.copyOf(ids);
        });
    }

    List<Role> roles(UUID org,Set<String> positions) {
        if(positions.isEmpty())return List.of();
        return graph.read(tx->{
            var rows=tx.list("""
                    MATCH (o:JobPosition {organizationId:$org,source:'REGISTRATION_IMPORT',status:'ACTIVE'})-[m:HAS_ROLE]->(r:TargetRole)
                    WHERE o.id IN $positions AND m.organizationId=$org AND m.status='ACTIVE'
                      AND r.organizationId=$org AND r.status IN ['PUBLISHED','ACTIVE']
                    OPTIONAL MATCH (owner:JobPosition)-[ownership:HAS_ROLE]->(r)
                    WHERE owner.status='ACTIVE' AND ownership.status='ACTIVE'
                    WITH o,r,collect(DISTINCT owner.id) AS owners
                    OPTIONAL MATCH (r)-[h:HAS_LEVEL]->(l:Level)
                    WHERE h.organizationId=$org AND l.organizationId=$org AND h.status='ACTIVE' AND l.status='ACTIVE'
                    OPTIONAL MATCH (r)-[q:REQUIRES_SKILL]->(s:MicroSkill)
                    WHERE q.status='ACTIVE' AND q.level=l.name
                    RETURN properties(o) AS o,properties(r) AS r,properties(l) AS l,owners,
                           collect(CASE WHEN s IS NULL THEN null ELSE {id:s.id,code:s.code,name:s.name,version:s.version,knowledge:q.requiredKnowledgeLevels,owner:s.organizationId,requirementOwner:q.organizationId,status:s.status,review:s.reviewStatus} END) AS skills
                    ORDER BY o.id,r.id,l.rank,l.id LIMIT 10001
                    """,Map.of("org",org.toString(),"positions",List.copyOf(positions)));
            if(rows.size()>10000)throw invalid();
            var roles=new LinkedHashMap<String,Role>();var facts=new TreeMap<String,List<Object>>();
            for(var row:rows) {
                var o=row.get("o");var r=row.get("r");var l=row.get("l");String position=text(o,"id"),id=text(r,"id");
                if(!row.get("owners").asList(Value::asString).equals(List.of(position)) || l.isNull())throw invalid();
                var skills=new ArrayList<Skill>();var seen=new HashSet<String>();
                for(var item:row.get("skills").asList(v->v)) {
                    if(!org.toString().equals(item.get("owner").asString(null)) || !org.toString().equals(item.get("requirementOwner").asString(null))
                            || !"ACTIVE".equals(item.get("status").asString(null)) || !"APPROVED".equals(item.get("review").asString(null)))throw invalid();
                    String skill=text(item,"id");var knowledge=item.get("knowledge").asList(Value::asString);
                    if(!seen.add(skill) || knowledge.isEmpty() || new HashSet<>(knowledge).size()!=knowledge.size()
                            || knowledge.stream().anyMatch(k->!Set.of("FOUNDATION","INTERMEDIATE","ADVANCED").contains(k)))throw invalid();
                    skills.add(new Skill(skill,item.get("code").asString(null),text(item,"name"),knowledge,true));
                    facts.computeIfAbsent(position,k->new ArrayList<>()).add(List.of(id,text(l,"id"),skill,text(item,"version"),knowledge));
                }
                if(skills.isEmpty())throw invalid();skills.sort(Comparator.comparing(Skill::id));
                int rawRank=l.get("rank").asInt();
                int normalizedRank="AUTHORED_ROLE_MEMBER_V1".equals(l.get("sourceFormat").asString(null)) ? rawRank+1 : rawRank;
                var level=new Level(text(l,"id"),text(l,"code"),text(l,"name"),normalizedRank,
                        l.get("context").asString(""),"ALL_MANDATORY_SKILLS",List.copyOf(skills),l.get("duration").asString(null));
                var previous=roles.get(id);var levels=new ArrayList<Level>(previous==null?List.of():previous.levels());
                if(level.rank()<1 || levels.stream().anyMatch(v->v.id().equals(level.id()) || v.rank()==level.rank()))throw invalid();
                levels.add(level);
                String roleScope = r.get("scope").isNull() ? r.get("description").asString("") : r.get("scope").asString("");
                roles.put(id,new Role(id,text(r,"code"),text(r,"name"),roleScope,position,text(o,"name"),text(o,"version"),"pending",List.copyOf(levels),text(r,"version")));
            }
            var fingerprints=new HashMap<String,String>();
            for(String position:facts.keySet())try {
                var canonical=new ArrayList<String>();
                for(var fact:facts.get(position))canonical.add(json.writeValueAsString(fact));
                for(var role:roles.values())if(position.equals(role.jobPositionId()))canonical.add(json.writeValueAsString(role));
                Collections.sort(canonical);fingerprints.put(position,RoleBaselineFlow.hash("REGISTRATION-PUBLISHED-ROLE-V1:"+org+":"+json.writeValueAsString(canonical)));
            }catch(com.fasterxml.jackson.core.JsonProcessingException failure){throw new IllegalStateException(failure);}
            return roles.values().stream().map(r->new Role(r.id(),r.code(),r.name(),r.scope(),r.jobPositionId(),r.jobPositionName(),r.catalogVersion(),fingerprints.get(r.jobPositionId()),r.levels(),r.roleVersion())).toList();
        });
    }
    private static String text(Value value,String key){String text=value.get(key).asString();if(text.isBlank() || !text.equals(text.strip()))throw invalid();return text;}
    private static IllegalStateException invalid(){return new IllegalStateException("Published imported Role catalog is incomplete or inconsistent");}
}
