package com.adaptlearngraph.assessment.infrastructure;

import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.neo4j.driver.Driver;
import org.neo4j.driver.TransactionContext;
import static com.adaptlearngraph.assessment.infrastructure.OfficialQuestionBankManifest.*;

/** Development-only exact release bootstrap. Existing different graphs are never overwritten. */
public final class LocalCatalogBootstrap {
    public static final String VERSION="0.11.0";
    public static final String SOURCE_HASH="a4f3165fa0ce6762651f59130c67e7c98f9a1b739f58d86e6b3e1b4fb58d3ddd";
    public static final String LEGACY_SOURCE_HASH="f7325462f0e8810624c05141798a3ca330b6ae8fb3844fc6e1437951e79832f7";
    private static final Map<String,String> LABELS=Map.of("Occupations","Occupation","TargetRoles","TargetRole","Levels","Level",
            "Competencies","Competency","MicroSkills","MicroSkill","LearningModules","LearningModule");
    private static final Set<String> TYPES=Set.of("HAS_ROLE","HAS_LEVEL","HAS_COMPETENCY","HAS_SKILL","REQUIRES_SKILL","TEACHES","HAS_SKILL_PREREQUISITE");
    private final Map<String,List<Map<String,Object>>> nodes=new TreeMap<>();
    private final Map<String,List<Map<String,Object>>> edges=new TreeMap<>();
    private final Map<String,String> expectedNodes=new TreeMap<>(),expectedEdges=new TreeMap<>();
    private Map<String,String> baseEdges;
    public static LocalCatalogBootstrap withSoftwareDevelopment(byte[] bytes) throws java.io.IOException {
        var catalog=new LocalCatalogBootstrap(bytes);catalog.addSoftwareDevelopment();return catalog;
    }
    public boolean hasSoftwareDevelopment() { return baseEdges!=null; }
    public static LocalCatalogBootstrap forExistingDevelopment(Driver driver,byte[] seed) throws java.io.IOException {
        try(var session=driver.session()) {
            var count=session.executeRead(tx->tx.run("MATCH ()-[r]->() RETURN count(r) AS c").single().get("c").asLong());
            var catalog=count==5121 ? new LocalCatalogBootstrap(seed) : withSoftwareDevelopment(seed);
            catalog.verifySealed(driver);return catalog;
        }
    }
    private void addSoftwareDevelopment() throws java.io.IOException {
        baseEdges=Map.copyOf(expectedEdges);
        var bytes=SoftwareDevelopmentSeed.modules();
        require(SoftwareDevelopmentSeed.MODULES_HASH.equals(sha256(bytes)),"SE module seed drift");
        var manifest=JSON.readTree(bytes);
        require((SOURCE_HASH.equals(manifest.path("baseSha256").asText()) || LEGACY_SOURCE_HASH.equals(manifest.path("baseSha256").asText())) && VERSION.equals(manifest.path("catalogVersion").asText()),"SE base pin drift");
        for(var module:manifest.path("reusedModules")) {
            var props=properties(module);
            require(canonical(JSON.valueToTree(Map.of("label","LearningModule","props",props))).equals(expectedNodes.get(props.get("id"))),"SE reused module drift");
        }
        for(var row:manifest.path("reusedTeaching")) {
            var props=properties(row);var type=props.remove("type");var from=props.remove("fromId");var to=props.remove("toId");
            require(canonical(JSON.valueToTree(Map.of("type",type,"from",from,"to",to,"props",props))).equals(expectedEdges.get(props.get("id"))),"SE reused teaching drift");
        }
        for(var row:manifest.path("relationships")) {
            var props=properties(row);var type=props.remove("type");var from=props.remove("fromId");var to=props.remove("toId");
            require("HAS_SKILL_PREREQUISITE".equals(type) && expectedNodes.containsKey(from) && expectedNodes.containsKey(to),"Invalid SE prerequisite");
            var edge=Map.<String,Object>of("type",type,"from",from,"to",to,"props",props);
            require(expectedEdges.putIfAbsent((String)props.get("id"),canonical(JSON.valueToTree(edge)))==null,"Duplicate SE edge");
            edges.computeIfAbsent((String)type,k->new ArrayList<>()).add(edge);
        }
    }
    public LocalCatalogBootstrap(byte[] bytes)throws java.io.IOException {
        require(SOURCE_HASH.equals(sha256(bytes)) || LEGACY_SOURCE_HASH.equals(sha256(bytes)),"Latest catalog source drift");
        var data=JSON.readTree(bytes);
        for(var label:LABELS.entrySet())for(var row:data.path(label.getKey())) {
            var props=properties(row);props.remove(switch(label.getValue()){case "TargetRole"->"occupationId";case "Level"->"targetRoleId";case "Competency"->"levelId";default->"__exportOnly";});
            require(VERSION.equals(props.get("version")),"Catalog version drift");
            String id=(String)props.get("id");
            require(expectedNodes.put(id,canonical(JSON.valueToTree(Map.of("label",label.getValue(),"props",props))))==null,"Duplicate catalog node");
            nodes.computeIfAbsent(label.getValue(),k->new ArrayList<>()).add(props);
        }
        for(var row:data.path("relationships")) {
            var props=properties(row);String type=(String)props.remove("type");Object from=props.remove("fromId"),to=props.remove("toId");
            require(TYPES.contains(type) && VERSION.equals(props.get("version")) && expectedNodes.containsKey(from) && expectedNodes.containsKey(to),"Catalog edge drift");
            var edge=Map.<String,Object>of("type",type,"from",from,"to",to,"props",props);
            require(expectedEdges.put((String)props.get("id"),canonical(JSON.valueToTree(edge)))==null,"Duplicate catalog edge");
            edges.computeIfAbsent(type,k->new ArrayList<>()).add(edge);
        }
        require(expectedNodes.size()==994 && expectedEdges.size()==5121,"Incomplete latest catalog");
    }
    private static Map<String,Object> properties(JsonNode row) {
        Map<String,Object> props=JSON.convertValue(row,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){});
        props.values().removeIf(Objects::isNull);return props;
    }
    void bootstrap(Driver driver) {
        try(var session=driver.session()) {
            boolean present=session.executeRead(tx->{long count=tx.run("MATCH (n) RETURN count(n) AS c").single().get("c").asLong();if(count>0)verify(tx,true);return count>0;});
            if(present)return; // Also permits exact idempotent startup on a sealed read-only release.
            for(String label:nodes.keySet())session.run("CREATE CONSTRAINT ontology_v011_"+label.toLowerCase(Locale.ROOT)+"_id IF NOT EXISTS FOR (n:"+label+") REQUIRE n.id IS UNIQUE").consume();
            session.executeWrite(tx->{
                require(tx.run("MATCH (n) RETURN count(n) AS c").single().get("c").asLong()==0,"Catalog changed before import");
                nodes.forEach((label,rows)->tx.run("UNWIND $rows AS row CREATE (n:"+label+") SET n=row",Map.of("rows",rows)).consume());
                edges.forEach((type,rows)->tx.run("UNWIND $rows AS row MATCH (a {id:row.from}),(b {id:row.to}) CREATE (a)-[r:"+type+"]->(b) SET r=row.props",Map.of("rows",rows)).consume());
                verify(tx,true);return true;
            });
        }
    }
    public void verifySealed(Driver driver) {
        try(var session=driver.session()) {
            // Neo4j forbids mixing administration and graph-read commands in one transaction.
            session.executeRead(tx->{verify(tx,false);return true;});
        }
    }
    private void verify(TransactionContext tx,boolean allowBase) {
        var actualNodes=new TreeMap<String,String>();var actualEdges=new TreeMap<String,String>();
        for(var row:tx.run("MATCH (n) RETURN labels(n) AS labels,properties(n) AS props").list()) {
            var labels=row.get("labels").asList(v->v.asString());require(labels.size()==1,"Unexpected catalog label");
            require(actualNodes.put(row.get("props").get("id").asString(),canonical(JSON.valueToTree(Map.of("label",labels.getFirst(),"props",row.get("props").asMap()))))==null,"Ambiguous catalog node");
        }
        for(var row:tx.run("MATCH (a)-[r]->(b) RETURN type(r) AS type,a.id AS source,b.id AS target,properties(r) AS props").list())
            require(actualEdges.put(row.get("props").get("id").asString(),canonical(JSON.valueToTree(Map.of("type",row.get("type").asString(),"from",row.get("source").asString(),"to",row.get("target").asString(),"props",row.get("props").asMap()))))==null,"Ambiguous catalog edge");
        require(expectedNodes.equals(actualNodes) && (expectedEdges.equals(actualEdges) || allowBase && baseEdges!=null && baseEdges.equals(actualEdges)),
                "Catalog drift: expected exact base or approved SE supplement; preserve graph and inspect source");
    }
    /** Assessment bank keeps its original release. Only unchanged assessment semantics may be reused. */
    void requireBaselineCompatibility(OfficialQuestionBankCatalog.Scope historical) {
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
    private static String assessmentProperties(Map<?,?> value,String kind) {
        var copy=JSON.valueToTree(value);((com.fasterxml.jackson.databind.node.ObjectNode)copy).remove("version");
        if(kind.equals("Level"))((com.fasterxml.jackson.databind.node.ObjectNode)copy).remove("context");
        return canonical(copy);
    }
}
