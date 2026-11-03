package com.adaptlearngraph.repository;

import com.adaptlearngraph.services.RoleBaselineFlow.*;
import com.adaptlearngraph.entities.AdaptiveBlueprint.Scope;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

/** Local-only current-schema catalog. Reuses full union validation; never invents legacy track/seniority. */
public final class CurrentRoleCatalog implements Catalog {
    private final Neo4jCypher graph; private final ObjectMapper mapper; private final UUID organization;
    private final Set<String> allowedOccupations;
    private final boolean demoReview;
    private final com.adaptlearngraph.repository.AuthoredCatalogPort authored;
    public CurrentRoleCatalog(Neo4jCypher graph,ObjectMapper mapper,UUID organization) {
        this(graph,mapper,organization,null,true);
    }
    public CurrentRoleCatalog(Neo4jCypher graph,ObjectMapper mapper,UUID organization,Set<String> allowedOccupations,boolean demoReview) {
        this(graph,mapper,organization,allowedOccupations,demoReview,com.adaptlearngraph.repository.AuthoredCatalogPort.NONE);
    }
    public CurrentRoleCatalog(Neo4jCypher graph,ObjectMapper mapper,UUID organization,Set<String> allowedOccupations,boolean demoReview,
                              com.adaptlearngraph.repository.AuthoredCatalogPort authored) {
        this.graph=graph;this.mapper=mapper;this.organization=organization;
        this.allowedOccupations=allowedOccupations==null?null:Set.copyOf(allowedOccupations);this.demoReview=demoReview;
        this.authored=Objects.requireNonNull(authored);
    }
    @Override public List<Role> roles(UUID org) {
        if(!organization.equals(org)) throw new Failure(403,"FORBIDDEN");
        var authoredScopes=new HashSet<>(authored.occupations(org));
        if(allowedOccupations!=null)authoredScopes.retainAll(allowedOccupations);
        Set<String> legacyScopes=null;
        if(allowedOccupations!=null){var scopes=new HashSet<>(allowedOccupations);scopes.removeAll(authoredScopes);legacyScopes=Set.copyOf(scopes);}
        var result=new ArrayList<>(legacyRoles(org,legacyScopes,authoredScopes));
        for(String occupation:new TreeSet<>(authoredScopes))result.addAll(com.adaptlearngraph.repository.AuthoredCatalogPort.scoped(authored.find(org,occupation)
                .orElseThrow(()->new IllegalStateException("Explicit authored source unavailable")),org,occupation).roles());
        var ids=new HashSet<String>();for(var role:result)if(!ids.add(role.id()))throw new IllegalStateException("Ambiguous catalog Role");
        return List.copyOf(result);
    }
    private List<Role> legacyRoles(UUID org,Set<String> allowedOccupations,Set<String> excluded) {
        if(allowedOccupations!=null && allowedOccupations.isEmpty())return List.of();
        // Neo4jClient: role/level rows with collected skill maps under tenant/shared and review filters.
        try {
            return graph.read(tx -> {
                var rows=tx.list("""
                        MATCH (o:Occupation)-[m:HAS_ROLE]->(r:TargetRole)-[h:HAS_LEVEL]->(l:Level)
                        WHERE o.status='ACTIVE' AND r.status='ACTIVE' AND m.status='ACTIVE' AND h.status='ACTIVE' AND l.status='ACTIVE'
                          AND all(n IN [o,r,l,m,h] WHERE n.organizationId IS NULL OR n.organizationId=$org)
                          AND ($unrestricted OR o.id IN $occupations)
                          AND NOT o.id IN $excluded
                          AND ($demoReview OR all(n IN [o,r,l,m,h] WHERE n.reviewStatus='APPROVED'))
                        OPTIONAL MATCH (l)-[q:REQUIRES_SKILL]->(s:MicroSkill)
                        WHERE q.status='ACTIVE' AND s.status='ACTIVE'
                          AND all(n IN [q,s] WHERE n.organizationId IS NULL OR n.organizationId=$org)
                          AND ($demoReview OR all(n IN [q,s] WHERE n.reviewStatus='APPROVED'))
                        RETURN properties(o) AS o,properties(r) AS r,properties(l) AS l,
                            collect(DISTINCT CASE WHEN s IS NULL THEN null ELSE {
                              id:s.id,code:s.code,name:s.name,requiredScore:q.requiredScore,mandatory:q.isMandatory} END) AS skills
                        ORDER BY o.name,r.name,l.rank
                        """,Map.of("org",org.toString(),"unrestricted",allowedOccupations==null,
                                "occupations",allowedOccupations==null?List.of():List.copyOf(allowedOccupations),"demoReview",demoReview,"excluded",List.copyOf(excluded)));
                Set<String> ids=new HashSet<>();
                if(allowedOccupations!=null) ids.addAll(allowedOccupations);
                else rows.forEach(r->ids.add(r.get("o").get("id").asString()));
                if(ids.isEmpty()) return List.<Role>of();
                var adapter=new Neo4jAdaptiveBaselineCatalogAdapter(graph,mapper,org,ids,demoReview);
                var validated=new HashMap<String,com.adaptlearngraph.repository.AdaptiveBaselineCatalogPort.CatalogSnapshot>();
                for(String id:ids) validated.put(id,adapter.findAvailable(new Scope(org,id))
                        .orElseThrow(()->new IllegalStateException("Granted Occupation catalog unavailable")));
                var result=new LinkedHashMap<String,Role>();
                for(var row:rows) {
                    var o=row.get("o");var r=row.get("r");var l=row.get("l");String occ=o.get("id").asString(),id=r.get("id").asString();
                    var snapshot=validated.get(occ); if(snapshot==null || !snapshot.roles().containsKey(id)) continue;
                    var skills=row.get("skills").asList(v->new Skill(v.get("id").asString(),v.get("code").asString(null),v.get("name").asString(),v.get("requiredScore").asDouble(),v.get("mandatory").asBoolean()));
                    if(skills.isEmpty()) throw new IllegalStateException("Role Level requirements unavailable");
                    var level=new Level(l.get("id").asString(),l.get("code").asString(),l.get("name").asString(),l.get("rank").asInt(),
                            l.get("context").asString(""),l.get("attainmentRule").asString(""),skills);
                    var existing=result.get(id); var levels=new ArrayList<Level>(existing==null?List.of():existing.levels());levels.add(level);
                    result.put(id,new Role(id,r.get("code").asString(),r.get("name").asString(),r.get("scope").asString(""),occ,
                            o.get("name").asString(),o.get("version").asString(),snapshot.fingerprint(),List.copyOf(levels)));
                }
                for(var entry:validated.entrySet()) {
                    var projected=new HashMap<String,Set<String>>();
                    result.values().stream().filter(role->role.occupationId().equals(entry.getKey())).forEach(role-> {
                        var skills=new HashSet<String>();
                        role.levels().forEach(level->level.skills().forEach(skill->skills.add(skill.id())));
                        projected.put(role.id(),skills);
                    });
                    var expected=new HashMap<String,Set<String>>();
                    entry.getValue().roles().forEach((id,role)->expected.put(id,role.skills().keySet()));
                    if(!projected.equals(expected)) throw new IllegalStateException("Role catalog projection incomplete");
                }
                return List.copyOf(result.values());
            });
        } catch(Failure e){throw e;} catch(RuntimeException e){throw new IllegalStateException("Current catalog unavailable",e);}
    }
}
