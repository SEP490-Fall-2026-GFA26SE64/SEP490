package com.adaptlearngraph.evaluation.infrastructure;
import com.adaptlearngraph.evaluation.application.port.ResearchGraphPort;
import com.adaptlearngraph.evaluation.domain.Research.*;
import org.neo4j.driver.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.TimeUnit;

public final class Neo4jResearchGraph implements ResearchGraphPort, AutoCloseable {
    public static final String QUERY = """
        MATCH (start:ResearchNode {id: $startId}), (module:ResearchNode:LearningModule {id: $moduleId})
        MATCH p = shortestPath((start)-[:HAS_ROLE|HAS_LEVEL|HAS_COMPETENCY|HAS_SKILL|TEACHES*..5]-(module))
        RETURN length(p) AS hops
        """;
    private final Driver benchmark,primary;private final String environmentLabel;
    public Neo4jResearchGraph(Driver primary,String uri,String user,String password,String environmentLabel) {
        this.primary=primary;this.environmentLabel=environmentLabel;
        this.benchmark=GraphDatabase.driver(uri,AuthTokens.basic(user,password),Config.builder()
            .withMaxConnectionPoolSize(1).withConnectionTimeout(15,TimeUnit.SECONDS)
            .withConnectionAcquisitionTimeout(10,TimeUnit.SECONDS).withMaxTransactionRetryTime(0,TimeUnit.SECONDS).build());
    }
    private String databaseId(Driver driver){try(Session s=driver.session()){return s.run("CALL db.info() YIELD id RETURN id").single().get("id").asString();}}
    public Map<String,String> environment(){
        if(databaseId(primary).equals(databaseId(benchmark)))throw new IllegalStateException("Research requires a separate Neo4j database instance");
        try(Session s=benchmark.session()) {
            if(s.run("MATCH (n) WHERE NOT n:ResearchNode RETURN count(n) AS n").single().get("n").asLong()!=0)
                throw new IllegalStateException("Research database contains non-research nodes; refusing to modify it");
            var info=s.run("CALL dbms.components() YIELD name, versions, edition RETURN name, versions[0] AS version, edition").single();
            Map<String,String> env=new TreeMap<>();env.put("neo4jVersion",info.get("version").asString());env.put("neo4jEdition",info.get("edition").asString());
            env.put("deployment",environmentLabel);env.put("backendJava",System.getProperty("java.version"));env.put("backendOs",System.getProperty("os.name")+" "+System.getProperty("os.arch"));
            env.put("backendProcessors",Integer.toString(Runtime.getRuntime().availableProcessors()));env.put("backendMaxHeapBytes",Long.toString(Runtime.getRuntime().maxMemory()));
            env.put("measurement","Monotonic client wall time: driver query + complete result consumption; no automatic retry");
            env.put("cache","Warm cache; 30 excluded warm-up queries per size; OS caches not flushed");env.put("concurrency","1 query; 1 active benchmark; single API worker");
            env.put("index","ResearchNode.id UNIQUE; indexes ONLINE before warm-up");env.put("query",QUERY);return env;
        }
    }
    public void replace(Graph graph){
        try(Session session=benchmark.session()) {
            session.run("MATCH (n:ResearchNode) DETACH DELETE n").consume();
            session.run("CREATE CONSTRAINT research_node_id IF NOT EXISTS FOR (n:ResearchNode) REQUIRE n.id IS UNIQUE").consume();
            for(String label:graph.nodeCounts().keySet()) {
                List<Map<String,Object>> rows=graph.nodes().stream().filter(n->n.label().equals(label)).map(Node::properties).toList();
                batch(session,rows,"UNWIND $rows AS row CREATE (n:ResearchNode:"+label+") SET n = row");
            }
            for(String type:graph.edgeCounts().keySet()) {
                List<Map<String,Object>> rows=graph.edges().stream().filter(e->e.type().equals(type)).map(e->Map.<String,Object>of("from",e.fromId(),"to",e.toId(),"properties",e.properties())).toList();
                batch(session,rows,"UNWIND $rows AS row MATCH (a:ResearchNode {id:row.from}), (b:ResearchNode {id:row.to}) CREATE (a)-[r:"+type+"]->(b) SET r = row.properties");
            }
            session.run("CALL db.awaitIndexes(60)").consume();
            long nodes=session.run("MATCH (n:ResearchNode) RETURN count(n) AS n").single().get("n").asLong();
            long edges=session.run("MATCH (:ResearchNode)-[r]->(:ResearchNode) RETURN count(r) AS n").single().get("n").asLong();
            if(nodes!=graph.nodes().size()||edges!=graph.edges().size())throw new IllegalStateException("Imported graph count mismatch");
        }
    }
    private void batch(Session session,List<Map<String,Object>> rows,String cypher){for(int i=0;i<rows.size();i+=500)session.run(cypher,Map.of("rows",rows.subList(i,Math.min(i+500,rows.size())))).consume();}
    public Sample measure(int iteration,Workload workload){
        try(Session session=benchmark.session()) {
            long started=System.nanoTime();
            var result=session.run(QUERY,Map.of("startId",workload.startId(),"moduleId",workload.moduleId()),TransactionConfig.builder().withTimeout(Duration.ofSeconds(10)).build());
            List<org.neo4j.driver.Record> rows=result.list();result.consume();double ms=(System.nanoTime()-started)/1e6;
            if(rows.size()!=1||rows.getFirst().get("hops").asInt()!=workload.hops())throw new IllegalStateException("Measured path did not match the expected hop count");
            return new Sample(iteration,workload.hops(),workload.startId(),workload.moduleId(),ms,rows.getFirst().get("hops").asInt());
        }
    }
    public void close(){benchmark.close();}
}
