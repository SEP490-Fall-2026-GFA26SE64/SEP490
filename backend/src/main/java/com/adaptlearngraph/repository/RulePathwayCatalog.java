package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.*;
import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.services.RoleBaselineFlow;
import com.adaptlearngraph.repository.InitialPathwayPorts.Failure;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.neo4j.driver.Value;
import java.util.*;

/** Bounded current owned catalog plus the original published module document; no seed, percentage or shared-node fallback. */
public final class RulePathwayCatalog {
    public record Certificate(String id,String version,String name,String referenceUrl,List<String> outcomeCodes) {
        public Certificate { referenceUrl=HttpsReference.require(referenceUrl);outcomeCodes=List.copyOf(outcomeCodes); }
    }
    public record Related(String skillId,KnowledgeLevel knowledgeLevel,Option module) {}
    public record Snapshot(String fingerprint,List<Requirement> requirements,Map<String,List<Option>> options,Map<String,Certificate> certificates,
            @com.fasterxml.jackson.annotation.JsonIgnore List<Related> related) {
        public Snapshot(String fingerprint,List<Requirement> requirements,Map<String,List<Option>> options,Map<String,Certificate> certificates) {
            this(fingerprint,requirements,options,certificates,List.of());
        }
        public Snapshot {
            requirements=List.copyOf(requirements);options=Collections.unmodifiableMap(new TreeMap<>(options));
            certificates=Collections.unmodifiableMap(new TreeMap<>(certificates));
            related=related==null?List.of():List.copyOf(related);
        }
    }
    private final Neo4jCypher graph;private final ModuleAuthoringPort modules;private final ObjectMapper json;
    private final int timeout;
    public RulePathwayCatalog(Neo4jCypher graph,ModuleAuthoringPort modules,ObjectMapper json){this(graph,modules,json,5);}
    public RulePathwayCatalog(Neo4jCypher graph,ModuleAuthoringPort modules,ObjectMapper json,int timeout){
        if(timeout<1 || timeout>60)throw new IllegalArgumentException("Invalid catalog transaction budget");this.graph=graph;this.modules=modules;this.json=json;this.timeout=timeout;
    }
    public Snapshot resolve(RoleBaselineFlow.Actor actor,RoleBaselineFlow.Role role,String levelId) {
        return resolve(actor,role,levelId,List.of());
    }
    public Snapshot resolve(RoleBaselineFlow.Actor actor,RoleBaselineFlow.Role role,String levelId,List<Requirement> additional) {
        var level=role.levels().stream().filter(item->item.id().equals(levelId)).findFirst().orElseThrow(()->new Failure(409,"LEVEL_REQUIRED"));
        var selectedIds=level.skills().stream().map(RoleBaselineFlow.Skill::id).collect(java.util.stream.Collectors.toSet());
        var requested=new TreeMap<String,Set<KnowledgeLevel>>();
        for(var skill:level.skills())for(var name:skill.requiredKnowledgeLevels())requested.computeIfAbsent(skill.id(),key->new TreeSet<>()).add(KnowledgeLevel.valueOf(name));
        var strictKeys=new HashSet<String>();requested.forEach((id,levels)->levels.forEach(knowledge->strictKeys.add(id+"\n"+knowledge)));
        for(var requirement:additional)requested.computeIfAbsent(requirement.skillId(),key->new TreeSet<>()).add(requirement.knowledgeLevel());
        return lookup(actor,role,levelId,requested,selectedIds,strictKeys);
    }
    public Snapshot providers(RoleBaselineFlow.Actor actor,RoleBaselineFlow.Role role,String levelId,List<Requirement> requirements,Set<String> strictKeys) {
        var requested=new TreeMap<String,Set<KnowledgeLevel>>();var strictIds=new HashSet<String>();
        for(var requirement:requirements) {
            requested.computeIfAbsent(requirement.skillId(),key->new TreeSet<>()).add(requirement.knowledgeLevel());
            if(strictKeys.contains(requirement.key()))strictIds.add(requirement.skillId());
        }
        return lookup(actor,role,levelId,requested,strictIds,strictKeys);
    }
    private Snapshot lookup(RoleBaselineFlow.Actor actor,RoleBaselineFlow.Role role,String levelId,Map<String,Set<KnowledgeLevel>> requested,Set<String> selectedIds,Set<String> strictKeys) {
        var ids=List.copyOf(requested.keySet());
        if(ids.isEmpty())return new Snapshot(RoleBaselineFlow.hash("EMPTY_PROVISION\n"+role.fingerprint()+"\n"+levelId),List.of(),Map.of(),Map.of());
        if(ids.size()>1000)throw new Failure(422,"REQUIREMENT_CATALOG_CAPACITY");
        var required=graph.read(timeout,tx->{
            var rows=tx.list("""
                    MATCH (s:MicroSkill {organizationId:$org}) WHERE s.id IN $ids AND s.status='ACTIVE' AND s.reviewStatus='APPROVED'
                    RETURN properties(s) AS skill ORDER BY s.id LIMIT 1001
                    """,Map.of("org",actor.organizationId().toString(),"ids",ids));
            var owned=new HashMap<String,Value>();
            for(var row:rows){var skill=row.get("skill");if(owned.put(skill.get("id").asString(),skill)!=null)throw new Failure(503,"DUPLICATE_CATALOG_ID");}
            if(!owned.keySet().containsAll(selectedIds))throw new Failure(409,"OWNED_SKILL_UNAVAILABLE");
            var result=new ArrayList<Requirement>();
            for(var entry:requested.entrySet()) {
                var source=owned.get(entry.getKey());if(source==null)continue;
                var skillRequirements=new ArrayList<Requirement>();
                try {
                    for(var knowledge:entry.getValue()) {
                        var provision=SkillProvisionMode.resolve(text(source,"provisionMode"),list(source,"moduleOnlyKnowledgeLevels"),
                                list(source,"certificateOnlyKnowledgeLevels"),knowledge);
                        var mode=provision==null?Provision.UNCONFIGURED:Provision.valueOf(provision.name());
                        var outcomes=list(source,switch(knowledge){case FOUNDATION->"foundationOutcomeCodes";case INTERMEDIATE->"intermediateOutcomeCodes";case ADVANCED->"advancedOutcomeCodes";});
                        var version=text(source,"version");
                        if(version==null || version.isBlank())mode=Provision.UNCONFIGURED;
                        skillRequirements.add(new Requirement(entry.getKey(),source.get("name").asString(),knowledge,version,outcomes,mode));
                    }
                } catch(IllegalArgumentException invalid) {
                    if(!selectedIds.contains(entry.getKey()))continue;
                    throw new Failure(422,"SKILL_PROVISION_CONFIGURATION_INVALID");
                }
                result.addAll(skillRequirements);
                if(result.size()>1000)throw new Failure(422,"REQUIREMENT_CATALOG_CAPACITY");
            }
            return List.copyOf(result);
        });
        var candidates=modules.releasedCandidates(actor.organizationId().toString(),ids,1001);
        if(candidates.size()>1000)throw new Failure(422,"MODULE_CATALOG_CAPACITY");
        var currentIds=candidates.stream().map(ModuleAuthoring.Document::id).toList();
        var retained=modules.retainedCandidates(actor.organizationId().toString(),actor.learnerId().toString(),ids,currentIds,1001);
        if(retained.size()>1000)throw new Failure(422,"RETAINED_MODULE_CAPACITY");
        var pinnedIds=retained.stream().map(item->item.document().id()).collect(java.util.stream.Collectors.toSet());
        var moduleIds=java.util.stream.Stream.concat(currentIds.stream(),pinnedIds.stream()).distinct().sorted().toList();
        if(moduleIds.size()>1000)throw new Failure(422,"MODULE_CATALOG_CAPACITY");
        var projections=moduleIds.isEmpty()?List.<org.neo4j.driver.Record>of():graph.read(timeout,tx->tx.list("""
                MATCH (m:LearningModule {organizationId:$org}) WHERE m.id IN $ids AND m.status='ACTIVE' AND m.reviewStatus='APPROVED'
                OPTIONAL MATCH (m)-[t:TEACHES]->(s:MicroSkill)
                RETURN properties(m) AS module,count(t) AS teachingCount,
                    collect(CASE WHEN s.organizationId=$org AND t.status='ACTIVE' THEN s.id ELSE null END) AS skillIds
                ORDER BY module.id LIMIT 1001
                """,Map.of("org",actor.organizationId().toString(),"ids",moduleIds)));
        var projected=new HashMap<String,org.neo4j.driver.Record>();
        for(var row:projections){String id=row.get("module").get("id").asString();if(projected.put(id,row)!=null)throw new Failure(503,"DUPLICATE_CATALOG_ID");}
        var options=new TreeMap<String,List<Option>>();var related=new ArrayList<Related>();
        for(var document:candidates) {
            var release=document.released();var projection=projected.get(document.id());
            if(!currentProjection(document,projection))continue;
            var payload=release.payload();
            related.add(new Related(payload.teachings().getFirst().skillId(),payload.knowledgeLevel(),
                    new Option(document.id(),release.number(),payload.contentVersion(),payload.title(),payload.outcomeCodes(),payload.skillVersion())));
            addOption(document,release,required,options);
        }
        for(var pinned:retained) {
            if(!currentProjection(pinned.document(),projected.get(pinned.document().id())))continue;
            var revision=pinned.document().revisions().stream().filter(item->item.number()==pinned.revision() && "RELEASED".equals(item.state())).findFirst();
            if(revision.isPresent())addOption(pinned.document(),revision.get(),required,options);
        }
        options.replaceAll((key,value)->value.stream().sorted(Comparator.comparing(Option::moduleId).thenComparing(Option::contentVersion)).toList());
        var certificates=certificates(actor,required,ids,strictKeys);
        String fingerprint;
        try{fingerprint=RoleBaselineFlow.hash(json.writeValueAsString(List.of(role.fingerprint(),levelId,required,options,certificates)));}
        catch(Exception invalid){throw new Failure(503,"CATALOG_SNAPSHOT_INVALID");}
        return new Snapshot(fingerprint,required,options,certificates,related);
    }
    private static boolean ready(ModuleAuthoring.Package payload) {
        return payload.knowledgeLevel()!=null && payload.teachings().size()==1 && !payload.content().lessons().isEmpty()
                && payload.content().lessons().stream().allMatch(LearningContent.Lesson::complete)
                && "APPROVED".equals(payload.metadata().reviewStatus()) && "ACTIVE".equals(payload.metadata().status());
    }
    private static boolean currentProjection(ModuleAuthoring.Document document,org.neo4j.driver.Record projection) {
        var release=document.released();
        if(release==null || projection==null || document.archived() || !"RELEASED".equals(release.state()) || !ready(release.payload()))return false;
        var payload=release.payload();var visible=projection.get("module");
        return projection.get("teachingCount").asLong()==1 && projection.get("skillIds").asList(Value::asString).equals(List.of(payload.teachings().getFirst().skillId()))
                && Objects.equals(text(visible,"version"),payload.metadata().version()) && Objects.equals(text(visible,"contentVersion"),payload.contentVersion())
                && Objects.equals(text(visible,"knowledgeLevel"),payload.knowledgeLevel().name()) && Objects.equals(text(visible,"skillVersion"),payload.skillVersion())
                && new HashSet<>(list(visible,"outcomeCodes")).equals(new HashSet<>(payload.outcomeCodes()));
    }
    private static void addOption(ModuleAuthoring.Document document,ModuleAuthoring.Revision revision,List<Requirement> requirements,Map<String,List<Option>> options) {
        var payload=revision.payload();if(!ready(payload))return;
        var requirement=requirements.stream().filter(item->item.skillId().equals(payload.teachings().getFirst().skillId())
                && item.knowledgeLevel()==payload.knowledgeLevel() && item.provision()==Provision.MODULE_ONLY).findFirst();
        if(requirement.isEmpty())return;
        var option=new Option(document.id(),revision.number(),payload.contentVersion(),payload.title(),payload.outcomeCodes(),payload.skillVersion());
        if(option.matches(requirement.get())) {
            var eligible=options.computeIfAbsent(requirement.get().key(),key->new ArrayList<>());
            if(eligible.stream().noneMatch(existing->existing.key().equals(option.key())))eligible.add(option);
        }
    }
    private Map<String,Certificate> certificates(RoleBaselineFlow.Actor actor,List<Requirement> required,List<String> skills,Set<String> strictKeys) {
        var rows=graph.read(timeout,tx->tx.list("""
                MATCH (s:MicroSkill {organizationId:$org})-[assignment:REQUIRES_CERTIFICATE]->(c:Certificate {organizationId:$org})
                WHERE s.id IN $skills AND assignment.status='ACTIVE' AND (assignment.organizationId IS NULL OR assignment.organizationId=$org)
                    AND c.status='ACTIVE' AND c.reviewStatus='APPROVED'
                RETURN s.id AS skill,properties(c) AS certificate ORDER BY s.id,c.knowledgeLevel,c.id LIMIT 1001
                """,Map.of("org",actor.organizationId().toString(),"skills",skills)));
        if(rows.size()>1000)throw new Failure(422,"CERTIFICATE_CATALOG_CAPACITY");
        var result=new TreeMap<String,Certificate>();var seen=new HashSet<String>();
        for(var row:rows) {
            var source=row.get("certificate");String key=row.get("skill").asString()+"\n"+source.get("knowledgeLevel").asString();
            if(!seen.add(key)) {if(strictKeys.contains(key))throw new Failure(422,"DUPLICATE_CERTIFICATE_ASSIGNMENT");result.remove(key);continue;}
            var requirement=required.stream().filter(item->item.key().equals(key)).findFirst();if(requirement.isEmpty())continue;
            if(requirement.get().provision()!=Provision.CERTIFICATE_ONLY) {if(strictKeys.contains(key))throw new Failure(422,"PROVISION_MODE_CONFLICT");continue;}
            var outcomes=list(source,"outcomeCodes");
            if(!Objects.equals(text(source,"skillVersion"),requirement.get().skillVersion()) || !new HashSet<>(outcomes).equals(new HashSet<>(requirement.get().outcomeCodes())))continue;
            try{result.put(key,new Certificate(source.get("id").asString(),source.get("version").asString(),source.get("name").asString(),source.get("referenceUrl").asString(),outcomes));}
            catch(IllegalArgumentException invalid){if(strictKeys.contains(key))throw new Failure(422,"CERTIFICATE_DEFINITION_INVALID");}
        }
        return Collections.unmodifiableMap(result);
    }
    private static List<String> list(Value value,String field){return value.get(field).isNull()?List.of():value.get(field).asList(Value::asString);}
    private static String text(Value value,String field){return value.get(field).isNull()?null:value.get(field).asString();}
}
