package com.adaptlearngraph.learning.infrastructure;

import com.adaptlearngraph.learning.application.RoleBaselineFlow.*;
import com.adaptlearngraph.assessment.adaptive.infrastructure.Neo4jAdaptiveBaselineCatalogAdapter;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Scope;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.neo4j.driver.Driver;

/** Local-only current-schema catalog. Reuses full union validation; never invents legacy track/seniority. */
public final class CurrentRoleCatalog implements Catalog {
    private final Driver driver; private final ObjectMapper mapper; private final UUID organization;
    private final Set<String> allowedOccupations;
    private final boolean demoReview;
    public CurrentRoleCatalog(Driver driver,ObjectMapper mapper,UUID organization) {
        this(driver,mapper,organization,null,true);
    }
    public CurrentRoleCatalog(Driver driver,ObjectMapper mapper,UUID organization,Set<String> allowedOccupations,boolean demoReview) {
        this.driver=driver;this.mapper=mapper;this.organization=organization;
        this.allowedOccupations=allowedOccupations==null?null:Set.copyOf(allowedOccupations);this.demoReview=demoReview;
    }
    @Override public List<Role> roles(UUID org) {
        if(!organization.equals(org)) throw new Failure(403,"FORBIDDEN");
        try(var session=driver.session()) {
            return session.executeRead(tx -> {
                var rows=tx.run("""
                        MATCH (o:Occupation)-[m:HAS_ROLE]->(r:TargetRole)-[h:HAS_LEVEL]->(l:Level)
                        WHERE o.status='ACTIVE' AND r.status='ACTIVE' AND m.status='ACTIVE' AND h.status='ACTIVE' AND l.status='ACTIVE'
                          AND all(n IN [o,r,l,m,h] WHERE n.organizationId IS NULL OR n.organizationId=$org)
                        OPTIONAL MATCH (l)-[q:REQUIRES_SKILL]->(s:MicroSkill)
                        WHERE q.status='ACTIVE' AND s.status='ACTIVE'
                          AND all(n IN [q,s] WHERE n.organizationId IS NULL OR n.organizationId=$org)
                        RETURN properties(o) AS o,properties(r) AS r,properties(l) AS l,
                            collect(DISTINCT CASE WHEN s IS NULL THEN null ELSE {
                              id:s.id,code:s.code,name:s.name,requiredScore:q.requiredScore,mandatory:q.isMandatory} END) AS skills
                        ORDER BY o.name,r.name,l.rank
                        """,Map.of("org",org.toString())).list();
                Set<String> ids=new HashSet<>(); rows.forEach(r->ids.add(r.get("o").get("id").asString()));
                if(allowedOccupations!=null) ids.retainAll(allowedOccupations);
                if(ids.isEmpty()) return List.<Role>of();
                var adapter=new Neo4jAdaptiveBaselineCatalogAdapter(driver,mapper,org,ids,demoReview);
                var validated=new HashMap<String,com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBaselineCatalogPort.CatalogSnapshot>();
                for(String id:ids) adapter.findAvailable(new Scope(org,id)).ifPresent(s->validated.put(id,s));
                var result=new LinkedHashMap<String,Role>();
                for(var row:rows) {
                    var o=row.get("o");var r=row.get("r");var l=row.get("l");String occ=o.get("id").asString(),id=r.get("id").asString();
                    var snapshot=validated.get(occ); if(snapshot==null || !snapshot.roles().containsKey(id)) continue;
                    var skills=row.get("skills").asList(v->new Skill(v.get("id").asString(),v.get("code").asString(null),v.get("name").asString(),v.get("requiredScore").asDouble(),v.get("mandatory").asBoolean()));
                    var level=new Level(l.get("id").asString(),l.get("code").asString(),l.get("name").asString(),l.get("rank").asInt(),
                            l.get("context").asString(""),l.get("attainmentRule").asString(""),skills);
                    var existing=result.get(id); var levels=new ArrayList<Level>(existing==null?List.of():existing.levels());levels.add(level);
                    result.put(id,new Role(id,r.get("code").asString(),r.get("name").asString(),r.get("scope").asString(""),occ,
                            o.get("name").asString(),o.get("version").asString(),snapshot.fingerprint(),List.copyOf(levels)));
                }
                return List.copyOf(result.values());
            });
        } catch(Failure e){throw e;} catch(RuntimeException e){throw new IllegalStateException("Current catalog unavailable",e);}
    }
}
