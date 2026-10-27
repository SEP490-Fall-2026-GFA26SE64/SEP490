package com.adaptlearngraph.assessment.infrastructure;

import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.neo4j.driver.Driver;
import org.neo4j.driver.TransactionContext;
import static com.adaptlearngraph.assessment.infrastructure.OfficialQuestionBankManifest.*;

/** Development-only exact release bootstrap. Existing different graphs are never overwritten. */
public final class LocalCatalogBootstrap {
    public static final String VERSION="0.10.0";
    public static final String SOURCE_HASH="fb4b308402e5413a246de65621f97df464d3538ad36264f40e827be005728b25";
    private static final Map<String,String> LABELS=Map.of("Occupations","Occupation","TargetRoles","TargetRole","Levels","Level",
            "Competencies","Competency","MicroSkills","MicroSkill","LearningModules","LearningModule");
    private static final Set<String> TYPES=Set.of("HAS_ROLE","HAS_LEVEL","HAS_COMPETENCY","HAS_SKILL","REQUIRES_SKILL","TEACHES","HAS_SKILL_PREREQUISITE");
    private final Map<String,List<Map<String,Object>>> nodes=new TreeMap<>();
    private final Map<String,List<Map<String,Object>>> edges=new TreeMap<>();
    private final Map<String,String> expectedNodes=new TreeMap<>(),expectedEdges=new TreeMap<>();
    public LocalCatalogBootstrap(byte[] bytes)throws java.io.IOException {
        require(SOURCE_HASH.equals(sha256(bytes)),"Latest catalog source drift");
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
        require(expectedNodes.size()==833 && expectedEdges.size()==4638,"Incomplete latest catalog");
    }
    private static Map<String,Object> properties(JsonNode row) {
        Map<String,Object> props=JSON.convertValue(row,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){});
        props.values().removeIf(Objects::isNull);return props;
    }
    void bootstrap(Driver driver) {
        try(var session=driver.session()) {
            boolean present=session.executeRead(tx->{long count=tx.run("MATCH (n) RETURN count(n) AS c").single().get("c").asLong();if(count>0)verify(tx);return count>0;});
            if(present)return; // Also permits exact idempotent startup on a sealed read-only release.
            for(String label:nodes.keySet())session.run("CREATE CONSTRAINT ontology_v010_"+label.toLowerCase(Locale.ROOT)+"_id IF NOT EXISTS FOR (n:"+label+") REQUIRE n.id IS UNIQUE").consume();
            session.executeWrite(tx->{
                require(tx.run("MATCH (n) RETURN count(n) AS c").single().get("c").asLong()==0,"Catalog changed before import");
                nodes.forEach((label,rows)->tx.run("UNWIND $rows AS row CREATE (n:"+label+") SET n=row",Map.of("rows",rows)).consume());
                edges.forEach((type,rows)->tx.run("UNWIND $rows AS row MATCH (a {id:row.from}),(b {id:row.to}) CREATE (a)-[r:"+type+"]->(b) SET r=row.props",Map.of("rows",rows)).consume());
                verify(tx);return true;
            });
        }
    }
    public void verifySealed(Driver driver) {
        try(var session=driver.session()) {
            // Neo4j forbids mixing administration and graph-read commands in one transaction.
            var setting=session.run("SHOW SETTINGS YIELD name,value WHERE name='server.databases.default_to_read_only' RETURN value").single();
            require("true".equals(setting.get("value").asString()),"Local catalog must be sealed read-only before pathway use");
            require("read-only".equals(session.run("SHOW DATABASE neo4j YIELD access RETURN access").single().get("access").asString()),"Catalog database is writable");
            session.executeRead(tx->{verify(tx);return true;});
        }
    }
    private void verify(TransactionContext tx) {
        var actualNodes=new TreeMap<String,String>();var actualEdges=new TreeMap<String,String>();
        for(var row:tx.run("MATCH (n) RETURN labels(n) AS labels,properties(n) AS props").list()) {
            var labels=row.get("labels").asList(v->v.asString());require(labels.size()==1,"Unexpected catalog label");
            require(actualNodes.put(row.get("props").get("id").asString(),canonical(JSON.valueToTree(Map.of("label",labels.getFirst(),"props",row.get("props").asMap()))))==null,"Ambiguous catalog node");
        }
        for(var row:tx.run("MATCH (a)-[r]->(b) RETURN type(r) AS type,a.id AS source,b.id AS target,properties(r) AS props").list())
            require(actualEdges.put(row.get("props").get("id").asString(),canonical(JSON.valueToTree(Map.of("type",row.get("type").asString(),"from",row.get("source").asString(),"to",row.get("target").asString(),"props",row.get("props").asMap()))))==null,"Ambiguous catalog edge");
        require(expectedNodes.equals(actualNodes) && expectedEdges.equals(actualEdges),"Existing graph differs from latest release; preserve it and use a new volume");
    }
    /** Assessment bank keeps its original release. Only unchanged assessment semantics may be reused. */
    void requireBaselineCompatibility(OfficialQuestionBankCatalog.Scope historical) {
        for(var node:historical.nodes()) {
            if(node.label().equals("LearningModule"))continue;
            var current=nodes.getOrDefault(node.label(),List.of()).stream().filter(p->p.get("id").equals(node.properties().get("id"))).findFirst().orElseThrow();
            require(assessmentProperties(current,node.label()).equals(assessmentProperties(node.properties(),node.label())),"Historical bank skill/role semantics changed");
        }
        for(var edge:historical.relationships()) {
            if(edge.type().equals("TEACHES"))continue;
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
