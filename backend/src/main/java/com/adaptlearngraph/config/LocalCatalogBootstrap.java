package com.adaptlearngraph.config;

import com.adaptlearngraph.helper.OfficialQuestionBankCatalog;
import com.adaptlearngraph.repository.Neo4jCypher;
import com.fasterxml.jackson.databind.*;
import java.util.*;
import static com.adaptlearngraph.dtos.OfficialQuestionBankManifest.*;

/** Development-only exact release bootstrap. Existing different graphs are never overwritten. */
public final class LocalCatalogBootstrap {
    public static final String VERSION="0.11.0";
    public static final String SINGLE_SKILL_VERSION="0.12.0";
    public static final String SINGLE_SKILL_HASH="3ccdb02789af0d2560b77c477f9e2fe84f6818943a12479cce8d6580273f1702";
    public static final String SINGLE_SKILL_CRLF_HASH="68f0fcc02d92e3f07d43db55db425be56e8254595816c7e2cd7e8fcc0e1da7c5";
    public static final String KNOWLEDGE_REQUIREMENTS_HASH="9fa8f570f50104089f57678a9cad202e24d9cde56e38084a9bf7db75cc1b916f";
    public static final String KNOWLEDGE_BANK_HASH="62cb7a2289c5a6fd0486d552fce0077badfdce3374f5a6c54d5ee061db909be9";
    public static final String MODULE_KNOWLEDGE_HASH="d6c520311b778b09447a23c03834bfb557617f7ecd566d7708d697ca923da172";
    public static final String SKILL_LEVEL_HASH="1f6c15983de4486ecee6dd3c0d764b19ddceee12252ad54ad7d016e839cbdb1d";
    public static final String SKILL_LEVEL_CRLF_HASH="183f50dd240ea5981625137c9ea38908e35f0dad2a8c3509e2a333b3ab2c6423";
    public static final String PREREQUISITE_KNOWLEDGE_HASH="cc7e3d25549542f945d68eebaff49257190c49db232b076aa50a97893d216a53";
    public static final String PREREQUISITE_KNOWLEDGE_CRLF_HASH="94bfe3fb7b0586aaeb427b26484742c32d3dfb46f84316f08fbe9eddb08accfe";
    public static final String PREREQUISITE_KNOWLEDGE_LF_HASH="a73e9571b5a16cab37341cb34124db36062b0383168871b8b97fcabc9c7233f8";
    public static boolean isPrerequisiteKnowledgeHash(String hash) {
        return SKILL_LEVEL_HASH.equals(hash) || SKILL_LEVEL_CRLF_HASH.equals(hash) || PREREQUISITE_KNOWLEDGE_HASH.equals(hash) || PREREQUISITE_KNOWLEDGE_CRLF_HASH.equals(hash) || PREREQUISITE_KNOWLEDGE_LF_HASH.equals(hash);
    }
    private boolean moduleKnowledgeRelease() { return MODULE_KNOWLEDGE_HASH.equals(sourceHash) || isPrerequisiteKnowledgeHash(sourceHash); }
    private final String catalogVersion;
    private final String sourceHash;
    public String version() { return catalogVersion; }
    public String sourceHash() { return sourceHash; }
    public boolean knowledgeFieldRelease(){return KNOWLEDGE_REQUIREMENTS_HASH.equals(sourceHash) || KNOWLEDGE_BANK_HASH.equals(sourceHash) || moduleKnowledgeRelease();}
    public static final String SOURCE_HASH="a4f3165fa0ce6762651f59130c67e7c98f9a1b739f58d86e6b3e1b4fb58d3ddd";
    public static final String LEGACY_SOURCE_HASH="585eae81565deb7f3d0e40eeea10e583dd526cd4569077babfda6d5b22e9602c";
    private static final Map<String,String> LABELS=Map.of("JobPositions","JobPosition","TargetRoles","TargetRole","Levels","Level",
            "Competencies","Competency","MicroSkills","MicroSkill","LearningModules","LearningModule");
    private static final Set<String> TYPES=Set.of("HAS_ROLE","HAS_LEVEL","HAS_COMPETENCY","HAS_SKILL","REQUIRES_SKILL","TEACHES","HAS_SKILL_PREREQUISITE");
    private final Map<String,List<Map<String,Object>>> nodes=new TreeMap<>();
    private final Map<String,List<Map<String,Object>>> edges=new TreeMap<>();
    private final Map<String,String> expectedNodes=new TreeMap<>(),expectedEdges=new TreeMap<>();
    private final Map<String,Set<String>> expectedNodeKeys=new HashMap<>(),expectedEdgeKeys=new HashMap<>();
    private Map<String,String> baseEdges;
    public static LocalCatalogBootstrap withSoftwareDevelopment(byte[] bytes) throws java.io.IOException {
        var catalog=new LocalCatalogBootstrap(bytes);catalog.addSoftwareDevelopment();return catalog;
    }
    public boolean hasSoftwareDevelopment() { return baseEdges!=null; }
    public static LocalCatalogBootstrap forExistingDevelopment(Neo4jCypher graph,byte[] seed) throws java.io.IOException {
        var count=graph.read(tx->tx.single("MATCH ()-[r {id: 'REL-SE-MS-FS03-MS-CORE01'}]->() RETURN count(r) AS c").get("c").asLong());
        var catalog=count>0 ? withSoftwareDevelopment(seed) : new LocalCatalogBootstrap(seed);
        catalog.verifySealed(graph);return catalog;
    }
    private void addSoftwareDevelopment() throws java.io.IOException {
        // The current release already includes the exact SE prerequisite supplement.
        if(isPrerequisiteKnowledgeHash(sourceHash)){baseEdges=Map.copyOf(expectedEdges);return;}
        baseEdges=Map.copyOf(expectedEdges);
        var bytes=SoftwareDevelopmentSeed.modules();
        require(SoftwareDevelopmentSeed.MODULES_HASH.equals(sha256(bytes)),"SE module seed drift");
        var manifest=JSON.readTree(bytes);
        require((SOURCE_HASH.equals(manifest.path("baseSha256").asText()) || LEGACY_SOURCE_HASH.equals(manifest.path("baseSha256").asText())) && VERSION.equals(manifest.path("catalogVersion").asText()),"SE base pin drift");
        if(!SINGLE_SKILL_VERSION.equals(catalogVersion)) for(var module:manifest.path("reusedModules")) {
            var props=properties(module);
            require(canonical(JSON.valueToTree(Map.of("label","LearningModule","props",props))).equals(expectedNodes.get(props.get("id"))),"SE reused module drift");
        }
        if(!SINGLE_SKILL_VERSION.equals(catalogVersion)) for(var row:manifest.path("reusedTeaching")) {
            var props=properties(row);var type=props.remove("type");var from=props.remove("fromId");var to=props.remove("toId");
            require(canonical(JSON.valueToTree(Map.of("type",type,"from",from,"to",to,"props",props))).equals(expectedEdges.get(props.get("id"))),"SE reused teaching drift");
        }
        for(var row:manifest.path("relationships")) {
            var props=properties(row);var type=props.remove("type");var from=props.remove("fromId");var to=props.remove("toId");
            props.put("version",catalogVersion);
            require("HAS_SKILL_PREREQUISITE".equals(type) && expectedNodes.containsKey(from) && expectedNodes.containsKey(to),"Invalid SE prerequisite");
            var edge=Map.<String,Object>of("type",type,"from",from,"to",to,"props",props);
            String edgeId=(String)props.get("id");
            expectedEdgeKeys.put(edgeId,Set.copyOf(props.keySet()));
            require(expectedEdges.putIfAbsent(edgeId,canonical(JSON.valueToTree(edge)))==null,"Duplicate SE edge");
            edges.computeIfAbsent((String)type,k->new ArrayList<>()).add(edge);
        }
    }
    public LocalCatalogBootstrap(byte[] bytes)throws java.io.IOException {
        sourceHash=sha256(bytes);
        catalogVersion=SINGLE_SKILL_HASH.equals(sourceHash) || SINGLE_SKILL_CRLF_HASH.equals(sourceHash) || knowledgeFieldRelease()?SINGLE_SKILL_VERSION:VERSION;
        require(SINGLE_SKILL_HASH.equals(sourceHash) || SINGLE_SKILL_CRLF_HASH.equals(sourceHash) || knowledgeFieldRelease() || SOURCE_HASH.equals(sourceHash) || LEGACY_SOURCE_HASH.equals(sourceHash),"Latest catalog source drift");
        var data=JSON.readTree(bytes);
        for(var label:LABELS.entrySet())for(var row:data.path(label.getKey())) {
            var props=properties(row);props.remove(switch(label.getValue()){case "TargetRole"->"jobPositionId";case "Level"->"targetRoleId";case "Competency"->"levelId";default->"__exportOnly";});
            require(((KNOWLEDGE_BANK_HASH.equals(sourceHash) || moduleKnowledgeRelease()) && label.getValue().equals("MicroSkill")?"0.12.1":catalogVersion).equals(props.get("version")),"Catalog version drift");
            String id=(String)props.get("id");
            expectedNodeKeys.put(id,Set.copyOf(props.keySet()));
            require(expectedNodes.put(id,canonical(JSON.valueToTree(Map.of("label",label.getValue(),"props",props))))==null,"Duplicate catalog node");
            nodes.computeIfAbsent(label.getValue(),k->new ArrayList<>()).add(props);
        }
        for(var row:data.path("relationships")) {
            var props=properties(row);String type=(String)props.remove("type");Object from=props.remove("fromId"),to=props.remove("toId");
            require(TYPES.contains(type) && catalogVersion.equals(props.get("version")) && expectedNodes.containsKey(from) && expectedNodes.containsKey(to),"Catalog edge drift");
            var edge=Map.<String,Object>of("type",type,"from",from,"to",to,"props",props);
            String edgeId=(String)props.get("id");
            expectedEdgeKeys.put(edgeId,Set.copyOf(props.keySet()));
            require(expectedEdges.put(edgeId,canonical(JSON.valueToTree(edge)))==null,"Duplicate catalog edge");
            edges.computeIfAbsent(type,k->new ArrayList<>()).add(edge);
        }
        require(expectedNodes.size()==(isPrerequisiteKnowledgeHash(sourceHash)?1018:994) && expectedEdges.size()==(isPrerequisiteKnowledgeHash(sourceHash)?4758:SINGLE_SKILL_VERSION.equals(catalogVersion)?4703:5121),"Incomplete latest catalog");
        if(SINGLE_SKILL_VERSION.equals(catalogVersion)) {
            var counts=new HashMap<String,Integer>();
            for(var edge:edges.getOrDefault("TEACHES",List.of())) {
                var props=(Map<?,?>)edge.get("props");
                require(!props.containsKey("teachingFocus") && !props.containsKey("difficultyLevel"),"Retired teaching metadata");
                counts.merge((String)edge.get("from"),1,Integer::sum);
            }
            for(var module:nodes.get("LearningModule"))require(counts.getOrDefault(module.get("id"),0)==1,"Each Module must teach exactly one Skill");
        }
        if(isPrerequisiteKnowledgeHash(sourceHash)) {
            var pairs=new ArrayList<com.adaptlearngraph.entities.domain.PrerequisiteRules.Pair>();
            for(var edge:edges.getOrDefault("HAS_SKILL_PREREQUISITE",List.of())) {
                var props=(Map<?,?>)edge.get("props");
                require(!props.containsKey("requiredScore"),"Retired numeric prerequisite field");
                var pair=new com.adaptlearngraph.entities.domain.PrerequisiteRules.Pair((String)edge.get("from"),
                    com.adaptlearngraph.entities.domain.KnowledgeLevel.valueOf((String)props.get("dependentKnowledgeLevel")),(String)edge.get("to"),
                    com.adaptlearngraph.entities.domain.KnowledgeLevel.valueOf((String)props.get("prerequisiteKnowledgeLevel")));
                com.adaptlearngraph.entities.domain.PrerequisiteRules.assertAddition(pairs,pair);pairs.add(pair);
            }
            require(pairs.size()==42,"Incomplete prerequisite knowledge release");
        }
        if(knowledgeFieldRelease()) {
            var covered=new HashSet<String>();
            edges.getOrDefault("TEACHES",List.of()).forEach(edge->covered.add((String)edge.get("to")));
            for(var skill:nodes.get("MicroSkill"))require(Objects.equals(skill.get("provisionMode"),
                    covered.contains(skill.get("id"))?"MODULE_ONLY":null),"Skill provision must match actual seed teaching coverage");
            for(var edge:edges.getOrDefault("REQUIRES_SKILL",List.of())) {
                var props=(Map<?,?>)edge.get("props");var raw=props.get("requiredKnowledgeLevels");
                require(!props.containsKey("requiredScore") && !props.containsKey("targetMastery") && raw instanceof List<?>,"Explicit enum knowledge requirements required");
                var levels=(List<?>)raw;
                require(!levels.isEmpty() && new HashSet<>(levels).size()==levels.size()
                        && levels.stream().allMatch(level->Set.of("FOUNDATION","INTERMEDIATE","ADVANCED").contains(level)),"Invalid knowledge requirement enum");
            }
        }
    }
    private static Map<String,Object> properties(JsonNode row) {
        Map<String,Object> props=JSON.convertValue(row,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){});
        props.values().removeIf(Objects::isNull);return props;
    }
    void bootstrap(Neo4jCypher graph) {
        var ids=List.copyOf(expectedNodes.keySet());
        boolean present=graph.read(tx->{long count=tx.single("MATCH (n) WHERE n.id IN $ids RETURN count(n) AS c",Map.of("ids",ids)).get("c").asLong();if(count>0)verify(tx,true);return count>0;});
        if(present)return; // Also permits exact idempotent startup on a sealed read-only release.
        for(String label:nodes.keySet())graph.autoCommit("CREATE CONSTRAINT ontology_v011_"+label.toLowerCase(Locale.ROOT)+"_id IF NOT EXISTS FOR (n:"+label+") REQUIRE n.id IS UNIQUE");
        graph.write(tx->{
            require(tx.single("MATCH (n) WHERE n.id IN $ids RETURN count(n) AS c",Map.of("ids",ids)).get("c").asLong()==0,"Catalog changed before import");
            nodes.forEach((label,rows)->tx.execute("UNWIND $rows AS row CREATE (n:"+label+") SET n=row",Map.of("rows",rows)));
            edges.forEach((type,rows)->tx.execute("UNWIND $rows AS row MATCH (a {id:row.from}),(b {id:row.to}) CREATE (a)-[r:"+type+"]->(b) SET r=row.props",Map.of("rows",rows)));
            verify(tx,true);return true;
        });
    }
    public void verifySealed(Neo4jCypher graph) {
        // Neo4j forbids mixing administration and graph-read commands in one transaction.
        graph.read(tx->{verify(tx,false);return true;});
    }
    /** Explicit fixture transition of owned Skill metadata, never a GET/startup repair. */
    public void applyKnowledgeBankFields(Neo4jCypher graph,UUID organization) {
        require(KNOWLEDGE_BANK_HASH.equals(sourceHash) || moduleKnowledgeRelease(),"Expected exact development knowledge-bank release");
        var fields=Set.of("version","reviewStatus","reviewedBy","reviewedAt","reviewSource",
                "foundationOutcomeLabels","intermediateOutcomeLabels","advancedOutcomeLabels");
        var expected=new HashMap<String,Map<String,Object>>();nodes.get("MicroSkill").forEach(s->expected.put((String)s.get("id"),s));
        graph.write(tx->{
            var rows=tx.list("MATCH (s:MicroSkill {organizationId:$org}) WHERE s.id IN $ids RETURN s.id AS id,properties(s) AS props",Map.of("org",organization.toString(),"ids",List.copyOf(expected.keySet())));
            require(rows.size()==79 && rows.stream().map(r->r.get("id").asString()).distinct().count()==79,"Development skill inventory mismatch");
            var updates=new ArrayList<Map<String,Object>>();
            for(var row:rows) {
                var actual=row.get("props").asMap();var target=expected.get(row.get("id").asString());
                require(Objects.equals(actual.get("provisionMode"),target.get("provisionMode")),"Skill provision changed; preserve authored data");
                for(var key:target.keySet())if(!fields.contains(key))require(Objects.equals(actual.get(key),target.get(key)),"Skill content changed; preserve authored data");
                if("0.12.0".equals(actual.get("version")))
                    require("NEEDS_EXPERT_REVIEW".equals(actual.get("reviewStatus")) && actual.get("reviewedBy")==null && actual.get("reviewedAt")==null,"Existing Skill review cannot be replaced by a fixture");
                else for(var field:fields)require(Objects.equals(actual.get(field),target.get(field)),"Skill release differs; preserve authored data");
                var patch=new HashMap<String,Object>();for(var field:fields)patch.put(field,target.get(field));
                updates.add(Map.of("id",target.get("id"),"props",patch));
            }
            long count=tx.single("UNWIND $rows AS row MATCH (s:MicroSkill {id:row.id,organizationId:$org}) SET s += row.props RETURN count(s) AS count",Map.of("rows",updates,"org",organization.toString())).get("count").asLong();
            require(count==79,"Incomplete development Skill transition");return true;
        });
    }
    private void verify(Neo4jCypher.Statements tx,boolean allowBase) {
        if(SINGLE_SKILL_VERSION.equals(catalogVersion)) {
            long invalid=tx.single("MATCH (m:LearningModule) WHERE m.id IN $ids OPTIONAL MATCH (m)-[t:TEACHES]->() WITH m,collect(t) AS mappings WHERE size(mappings)<>1 OR any(t IN mappings WHERE t.teachingFocus IS NOT NULL OR t.difficultyLevel IS NOT NULL) RETURN count(m) AS invalid",
                    Map.of("ids",nodes.get("LearningModule").stream().map(m->m.get("id")).toList())).get("invalid").asLong();
            require(invalid==0,"Single-Skill catalog cardinality/metadata drift");
        }

        // The module release enters the real authoring workflow. Seed bytes remain pinned,
        // while authored module revisions are verified by the module/Pathway adapters.
        var expectedNodeView=new TreeMap<>(expectedNodes);var expectedEdgeView=new TreeMap<>(expectedEdges);
        var baseEdgeView=baseEdges==null?null:new TreeMap<>(baseEdges);
        if(moduleKnowledgeRelease()) {
            nodes.get("LearningModule").forEach(module->expectedNodeView.remove((String)module.get("id")));
            edges.getOrDefault("TEACHES",List.of()).forEach(edge->{String id=(String)((Map<?,?>)edge.get("props")).get("id");expectedEdgeView.remove(id);if(baseEdgeView!=null)baseEdgeView.remove(id);});
        }
        var actualNodes=new TreeMap<String,String>();var actualEdges=new TreeMap<String,String>();
        for(var row:tx.list("MATCH (n) WHERE n.id IN $ids RETURN labels(n) AS labels,properties(n) AS props",Map.of("ids",List.copyOf(expectedNodes.keySet())))) {
            var labels=row.get("labels").asList(v->v.asString());if(moduleKnowledgeRelease() && labels.equals(List.of("LearningModule")))continue;require(labels.size()==1,"Unexpected catalog label");
            var id=row.get("props").get("id").asString();
            var props=new HashMap<String,Object>(row.get("props").asMap());
            if(moduleKnowledgeRelease() && labels.equals(List.of("MicroSkill")))DevelopmentCertificateFixtures.sealedComparison(id,props);
            var allowed=expectedNodeKeys.get(id);
            if(allowed!=null)props.keySet().retainAll(allowed);
            require(actualNodes.put(id,canonical(JSON.valueToTree(Map.of("label",labels.getFirst(),"props",props))))==null,"Ambiguous catalog node");
        }
        for(var row:tx.list("MATCH (a)-[r]->(b) WHERE r.id IN $ids RETURN type(r) AS type,a.id AS source,b.id AS target,properties(r) AS props",Map.of("ids",List.copyOf(expectedEdges.keySet())))) {
            if(moduleKnowledgeRelease() && "TEACHES".equals(row.get("type").asString()))continue;
            var id=row.get("props").get("id").asString();
            var props=new HashMap<String,Object>(row.get("props").asMap());
            var allowed=expectedEdgeKeys.get(id);
            if(allowed!=null)props.keySet().retainAll(allowed);
            require(actualEdges.put(id,canonical(JSON.valueToTree(Map.of("type",row.get("type").asString(),"from",row.get("source").asString(),"to",row.get("target").asString(),"props",props))))==null,"Ambiguous catalog edge");
        }
        if(!expectedNodeView.equals(actualNodes)) {
            System.err.println("CATALOG BOOTSTRAP NODES MISMATCH: expected="+expectedNodes.size()+" actual="+actualNodes.size());
            for(var e:expectedNodeView.entrySet()) {
                if(!actualNodes.containsKey(e.getKey())) { System.err.println("Missing node in DB: "+e.getKey()); break; }
                else if(!e.getValue().equals(actualNodes.get(e.getKey()))) { System.err.println("Node diff for "+e.getKey()+"\nEXP: "+e.getValue()+"\nACT: "+actualNodes.get(e.getKey())); break; }
            }
        }
        if(!expectedEdgeView.equals(actualEdges) && (!allowBase || baseEdges==null || !baseEdgeView.equals(actualEdges))) {
            System.err.println("CATALOG BOOTSTRAP EDGES MISMATCH: expected="+expectedEdges.size()+" base="+(baseEdges!=null?baseEdges.size():0)+" actual="+actualEdges.size());
            for(var e:expectedEdgeView.entrySet()) {
                if(!actualEdges.containsKey(e.getKey())) { System.err.println("Missing edge in DB: "+e.getKey()); break; }
                else if(!e.getValue().equals(actualEdges.get(e.getKey()))) { System.err.println("Edge diff for "+e.getKey()+"\nEXP: "+e.getValue()+"\nACT: "+actualEdges.get(e.getKey())); break; }
            }
        }
        require(expectedNodeView.equals(actualNodes) && (expectedEdgeView.equals(actualEdges) || allowBase && baseEdges!=null && baseEdgeView.equals(actualEdges)),
                "Catalog drift: expected exact base or approved SE supplement; preserve graph and inspect source");
    }
    /** Assessment bank keeps its original release. Only unchanged assessment semantics may be reused. */
    void requireBaselineCompatibility(OfficialQuestionBankCatalog.Scope historical) {
        require(!knowledgeFieldRelease(),"Knowledge requirements are not numeric baseline compatibility");
        for(var node:historical.nodes()) {
            if(node.label().equals("LearningModule") || node.label().equals("Competency"))continue;
            var current=nodes.getOrDefault(node.label(),List.of()).stream().filter(p->p.get("id").equals(node.properties().get("id"))).findFirst().orElseThrow();
            require(assessmentProperties(current,node.label()).equals(assessmentProperties(node.properties(),node.label())),"Historical bank skill/role semantics changed");
        }
        for(var edge:historical.relationships()) {
            if(edge.type().equals("TEACHES") || edge.type().equals("HAS_COMPETENCY") || edge.type().equals("HAS_SKILL"))continue;
            var current=edges.getOrDefault(edge.type(),List.of()).stream().filter(e->((Map<?,?>)e.get("props")).get("id").equals(edge.properties().get("id"))).findFirst().orElseThrow();
            require(current.get("from").equals(edge.fromId()) && current.get("to").equals(edge.toId())
                    && assessmentProperties((Map<?,?>)current.get("props"),edge.type()).equals(assessmentProperties(edge.properties(),edge.type())),"Historical bank requirements changed");
        }
    }
    /** Retains existing development question identities only; never imports a policy, result or knowledge mapping. */
    void requireRetainedQuestionIdentities(OfficialQuestionBankCatalog.Scope historical) {
        require(knowledgeFieldRelease(),"Expected explicit knowledge-field release");
        for(var node:historical.nodes()) {
            if(node.label().equals("LearningModule") || node.label().equals("Competency"))continue;
            require(nodes.getOrDefault(node.label(),List.of()).stream().anyMatch(current->Objects.equals(current.get("id"),node.properties().get("id"))),"Historical question catalog identity changed");
        }
        for(var edge:historical.relationships()) {
            if(edge.type().equals("TEACHES") || edge.type().equals("HAS_COMPETENCY") || edge.type().equals("HAS_SKILL"))continue;
            require(edges.getOrDefault(edge.type(),List.of()).stream().anyMatch(current->
                    Objects.equals(((Map<?,?>)current.get("props")).get("id"),edge.properties().get("id"))
                    && Objects.equals(current.get("from"),edge.fromId()) && Objects.equals(current.get("to"),edge.toId())),"Historical question catalog endpoints changed");
        }
    }
    private static String assessmentProperties(Map<?,?> value,String kind) {
        var copy=JSON.valueToTree(value);((com.fasterxml.jackson.databind.node.ObjectNode)copy).remove("version");
        if(kind.equals("Level")) {
            ((com.fasterxml.jackson.databind.node.ObjectNode)copy).remove("context");
            ((com.fasterxml.jackson.databind.node.ObjectNode)copy).remove("rank");
        }
        return canonical(copy);
    }
}
