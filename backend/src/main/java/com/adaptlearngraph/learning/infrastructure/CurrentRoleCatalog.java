package com.adaptlearngraph.learning.infrastructure;

import com.adaptlearngraph.learning.application.RoleBaselineFlow.*;
import com.adaptlearngraph.learning.application.RoleBaselineFlow;
import com.adaptlearngraph.assessment.adaptive.infrastructure.Neo4jAdaptiveBaselineCatalogAdapter;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Scope;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Value;

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
                var result=new LinkedHashMap<String,Role>();

                // 1. Process legacy graph roles with explicit Level nodes if present
                var legacyRows=tx.run("""
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

                if(!legacyRows.isEmpty()) {
                    Set<String> ids=new HashSet<>(); legacyRows.forEach(r->ids.add(r.get("o").get("id").asString()));
                    if(allowedOccupations!=null && !allowedOccupations.isEmpty()) {
                        Set<String> normalized=new HashSet<>();
                        for(String occ:allowedOccupations) {
                            normalized.add(occ);
                            if(occ.startsWith("OCC-")) normalized.add(occ.substring(4));
                            else normalized.add("OCC-" + occ);
                        }
                        ids.removeIf(id -> !normalized.contains(id));
                    }
                    if(!ids.isEmpty()) {
                        var adapter=new Neo4jAdaptiveBaselineCatalogAdapter(driver,mapper,org,ids,demoReview);
                        var validated=new HashMap<String,com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBaselineCatalogPort.CatalogSnapshot>();
                        for(String id:ids) adapter.findAvailable(new Scope(org,id)).ifPresent(s->validated.put(id,s));
                        for(var row:legacyRows) {
                            var o=row.get("o");var r=row.get("r");var l=row.get("l");String occ=o.get("id").asString(),id=r.get("id").asString();
                            var snapshot=validated.get(occ); if(snapshot==null || !snapshot.roles().containsKey(id)) continue;
                            var skills=row.get("skills").asList(v->new Skill(v.get("id").asString(),v.get("code").asString(null),v.get("name").asString(),v.get("requiredScore").asDouble(),v.get("mandatory").asBoolean()));
                            var level=new Level(l.get("id").asString(),l.get("code").asString(),l.get("name").asString(),l.get("rank").asInt(),
                                    l.get("context").asString(""),l.get("attainmentRule").asString(""),skills);
                            var existing=result.get(id); var levels=new ArrayList<Level>(existing==null?List.of():existing.levels());levels.add(level);
                            result.put(id,new Role(id,r.get("code").asString(),r.get("name").asString(),r.get("scope").asString(""),occ,
                                    o.get("name").asString(),o.get("version").asString(),snapshot.fingerprint(),List.copyOf(levels)));
                        }
                    }
                }

                // 2. Query target roles authored and published via L&D Manager / Expert flow
                var targetRoleRows=tx.run("""
                        MATCH (r:TargetRole)
                        WHERE (r.organizationId IS NULL OR r.organizationId = $org OR r.organizationId = 'comp-technova')
                          AND coalesce(r.status, 'ACTIVE') IN ['ACTIVE', 'PUBLISHED']
                          AND coalesce(r.status, 'ACTIVE') <> 'SUPERSEDED'
                        OPTIONAL MATCH (o:Occupation)
                        WHERE o.code = r.familyCode OR o.id = r.familyCode OR o.name = r.familyCode
                        OPTIONAL MATCH (r)-[q:REQUIRES_SKILL]->(s:MicroSkill)
                        WHERE coalesce(s.status, 'ACTIVE') = 'ACTIVE'
                          AND (s.organizationId IS NULL OR s.organizationId = $org OR s.organizationId = 'comp-technova')
                        WITH r, o, [x IN collect(DISTINCT CASE WHEN s IS NOT NULL THEN {
                          id: s.id,
                          code: s.code,
                          name: s.name,
                          level: q.level,
                          requiredScore: coalesce(q.targetMastery, 0.70),
                          mandatory: coalesce(q.isMandatory, true)
                        } END) WHERE x IS NOT NULL] AS skills
                        RETURN properties(r) AS r, properties(o) AS o, skills
                        ORDER BY r.name
                        """,Map.of("org",org.toString())).list();

                for(var row:targetRoleRows) {
                    var r=row.get("r");
                    String id=r.get("id").asString();
                    if(result.containsKey(id)) continue;

                    String code=r.containsKey("baseCode") && !r.get("baseCode").isNull()
                            ? r.get("baseCode").asString()
                            : (r.containsKey("code") && !r.get("code").isNull() ? r.get("code").asString() : id);
                    if(code.contains("#")) {
                        code=code.substring(0,code.indexOf("#"));
                    }
                    String name=r.containsKey("name") && !r.get("name").isNull() ? r.get("name").asString() : code;
                    String scope=r.containsKey("description") && !r.get("description").isNull()
                            ? r.get("description").asString()
                            : (r.containsKey("scope") && !r.get("scope").isNull() ? r.get("scope").asString() : "");
                    String version=r.containsKey("version") && !r.get("version").isNull() ? r.get("version").asString() : "1.0";

                    String occupationId;
                    String occupationName;
                    var oVal=row.get("o");
                    if(oVal!=null && !oVal.isNull()) {
                        occupationId=oVal.get("id").asString(oVal.get("code").asString("OCC-15-1252.00"));
                        occupationName=oVal.get("name").asString("Software Developers");
                    } else {
                        var occ=resolveFallbackOccupation(name,code,r.containsKey("familyCode") && !r.get("familyCode").isNull() ? r.get("familyCode").asString() : "");
                        occupationId=occ.id();
                        occupationName=occ.name();
                    }

                    if(allowedOccupations!=null && !allowedOccupations.isEmpty() && !demoReview) {
                        Set<String> normalized=new HashSet<>();
                        for(String occ:allowedOccupations) {
                            normalized.add(occ);
                            if(occ.startsWith("OCC-")) normalized.add(occ.substring(4));
                            else normalized.add("OCC-" + occ);
                        }
                        if(!normalized.contains(occupationId)) continue;
                    }

                    List<String> levelNames=new ArrayList<>();
                    if(r.containsKey("levels") && !r.get("levels").isNull()) {
                        var lv=r.get("levels");
                        try {
                            levelNames.addAll(lv.asList(Value::asString));
                        } catch(Exception ex) {
                            try {
                                List<?> parsed=mapper.readValue(lv.asString(),List.class);
                                for(Object item:parsed) if(item!=null) levelNames.add(item.toString());
                            } catch(Exception ignored){}
                        }
                    }
                    if(levelNames.isEmpty()) {
                        levelNames=List.of("Junior","Middle","Senior");
                    }

                    var rawSkills=row.get("skills").asList(v->v);
                    List<Level> levels=new ArrayList<>();
                    for(int i=0;i<levelNames.size();i++) {
                        String lvlName=levelNames.get(i);
                        String lvlId=lvlName.toLowerCase(Locale.ROOT).replace(" ","-");
                        String lvlCode=lvlName.toUpperCase(Locale.ROOT).replace(" ","_");
                        List<Skill> lvlSkills=new ArrayList<>();
                        for(var sv:rawSkills) {
                            String skillLevel=sv.get("level").asString(null);
                            if(skillLevel==null || skillLevel.isBlank() || skillLevel.equalsIgnoreCase(lvlName)) {
                                lvlSkills.add(new Skill(
                                        sv.get("id").asString(),
                                        sv.get("code").asString(null),
                                        sv.get("name").asString(),
                                        sv.get("requiredScore").asDouble(0.70),
                                        sv.get("mandatory").asBoolean(true)
                                ));
                            }
                        }
                        levels.add(new Level(lvlId,lvlCode,lvlName,i+1,lvlName + " Level","ALL_MANDATORY",List.copyOf(lvlSkills)));
                    }

                    String fingerprint=RoleBaselineFlow.hash("TR-CATALOG-V1:" + id + ":" + version + ":" + levels.size());
                    result.put(id,new Role(id,code,name,scope,occupationId,occupationName,version,fingerprint,List.copyOf(levels)));
                }

                return List.copyOf(result.values());
            });
        } catch(Failure e){throw e;} catch(RuntimeException e){throw new IllegalStateException("Current catalog unavailable",e);}
    }

    private record FallbackOccupation(String id,String name){}
    private static FallbackOccupation resolveFallbackOccupation(String title,String code,String family) {
        String t=title.toLowerCase(Locale.ROOT);
        String c=code.toUpperCase(Locale.ROOT);
        String f=family.toUpperCase(Locale.ROOT);
        if(t.contains("security") || t.contains("cyber") || c.contains("SEC") || f.contains("SEC")) {
            return new FallbackOccupation("OCC-15-1212.00","Information Security Analysts");
        }
        if(t.contains("test") || t.contains("quality") || t.contains("qa") || c.contains("QA") || f.contains("QA")) {
            return new FallbackOccupation("OCC-15-1253.00","Software Quality Assurance Analysts and Testers");
        }
        if(t.contains("data") || t.contains("database") || t.contains("analytics") || c.contains("DATA") || f.contains("DATA")) {
            return new FallbackOccupation("OCC-15-1243.00","Database Architects");
        }
        if(t.contains("system") || t.contains("network") || t.contains("cloud") || (t.contains("architect") && !t.contains("software")) || c.contains("SYS") || c.contains("INFRA")) {
            return new FallbackOccupation("OCC-15-1299.08","Computer Systems Engineers/Architects");
        }
        return new FallbackOccupation("OCC-15-1252.00","Software Developers");
    }
}
