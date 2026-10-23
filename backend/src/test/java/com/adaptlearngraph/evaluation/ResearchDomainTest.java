package com.adaptlearngraph.evaluation;
import com.adaptlearngraph.evaluation.domain.*;
import com.adaptlearngraph.evaluation.domain.Research.*;
import com.adaptlearngraph.evaluation.infrastructure.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import java.util.stream.IntStream;
import static org.junit.jupiter.api.Assertions.*;

class ResearchDomainTest {
    static Graph source(){return new JsonOntologySource(Path.of("../documents/dataset/import/ontology_seed.json"),new ObjectMapper()).load();}
    @Test void generatesExactSizesWithCompleteSchemaAndReproducibleWorkload(){
        Graph source=source();var generator=new OntologyGenerator();
        for(int size:List.of(1000,5000,10000)) {
            Graph a=generator.generate(source,size,42),b=generator.generate(source,size,42);
            assertEquals(size,a.nodes().size());assertEquals(a,b);
            assertNotEquals(a.workload(),generator.generate(source,size,43).workload());
            assertTrue(a.nodes().containsAll(source.nodes()));assertTrue(a.edges().containsAll(source.edges()));
            assertEquals(6,a.nodeCounts().size());assertEquals(7,a.edgeCounts().size());
            assertEquals(a.edges().size(),a.edgeCounts().values().stream().mapToInt(i->i).sum());
            assertEquals(Set.of(3,4,5),new HashSet<>(a.workload().stream().map(Workload::hops).toList()));
            for(Node n:a.nodes()) {
                assertFalse(n.properties().containsKey("actualScore"));assertFalse(n.properties().containsKey("occupationId"));
                assertNotNull(n.properties().get("version"));assertNotNull(n.properties().get("status"));
                assertNotNull(n.properties().get("reviewStatus"));assertTrue(n.properties().containsKey("reviewedAt"));
                if(n.id().startsWith("SYN-")){assertEquals("NEEDS_EXPERT_REVIEW",n.properties().get("reviewStatus"));assertNull(n.properties().get("reviewedBy"));}
            }
        }
    }
    @Test void rejectsMissingFieldsDanglingEdgesAndCycles(){
        Graph s=source();Node first=s.nodes().getFirst();var props=new LinkedHashMap<>(first.properties());props.remove("version");var nodes=new ArrayList<>(s.nodes());nodes.set(0,new Node(first.label(),props));
        assertThrows(IllegalArgumentException.class,()->OntologyGenerator.validate(new Graph(nodes,s.edges(),s.workload(),s.sourceHash(),s.sourceVersion(),0,s.nodeCounts(),s.edgeCounts())));
        var edges=new ArrayList<>(s.edges());Edge original=edges.getFirst();edges.add(new Edge(original.type(),"MISSING",original.toId(),original.properties()));
        assertThrows(IllegalArgumentException.class,()->OntologyGenerator.validate(new Graph(s.nodes(),edges,s.workload(),s.sourceHash(),s.sourceVersion(),0,s.nodeCounts(),s.edgeCounts())));
        Edge prerequisite=s.edges().stream().filter(e->e.type().equals("HAS_SKILL_PREREQUISITE")).findFirst().orElseThrow();
        var cycleEdges=new ArrayList<>(s.edges());var ep=new LinkedHashMap<>(prerequisite.properties());ep.put("id","cycle");cycleEdges.add(new Edge(prerequisite.type(),prerequisite.toId(),prerequisite.fromId(),ep));
        assertThrows(IllegalArgumentException.class,()->OntologyGenerator.validate(new Graph(s.nodes(),cycleEdges,s.workload(),s.sourceHash(),s.sourceVersion(),0,s.nodeCounts(),s.edgeCounts())));
    }
    @Test void computesMeanAndNearestRankP95WithoutDroppingOutliers(){
        var samples=IntStream.rangeClosed(1,100).mapToObj(i->new Sample(i,3,"s","m",i,3)).toList();Metrics m=Metrics.of(samples);
        assertEquals(50.5,m.meanMs());assertEquals(95,m.p95Ms());assertEquals(1,m.minMs());assertEquals(100,m.maxMs());
        assertThrows(IllegalArgumentException.class,()->Metrics.of(List.of()));
        assertThrows(IllegalArgumentException.class,()->Metrics.of(List.of(new Sample(0,3,"s","m",Double.NaN,3))));
    }
    @Test void reportContainsProvenanceCountsProtocolAndLimitations()throws Exception{
        var metrics=new Metrics(1000,2,4,1,9);var result=new Result(1000,5000,Map.of("MicroSkill",100),Map.of("TEACHES",100),20,30,metrics,Map.of(3,metrics),List.of());
        var run=new Run(UUID.randomUUID(),"research-admin","SUCCEEDED",Instant.now(),Instant.now(),42,List.of(1000),"abc123","0.9.0","rq2-v1",1000,30,1000,"Completed",null,Map.of("query",Neo4jResearchGraph.QUERY),"rules",List.of(result));
        byte[] bytes=new PdfResearchReport(Path.of("../documents/research/RQ2/RULES.md")).pdf(run);
        try(var pdf=Loader.loadPDF(bytes)){String text=new PDFTextStripper().getText(pdf);assertTrue(text.contains(run.id().toString()));assertTrue(text.contains("abc123"));assertTrue(text.contains("P95"));assertTrue(text.contains("150 ms"));assertTrue(text.contains("not executed"));}
    }
    @Test void reportUsesTheSavedCustomIterationCount()throws Exception {
        var run=new Run(UUID.randomUUID(),"admin","SUCCEEDED",Instant.now(),Instant.now(),42,List.of(1000),"hash","0.9.0","rq2-v2",37,30,37,"Completed",null,Map.of(),"rules",List.of());
        try(var pdf=Loader.loadPDF(new PdfResearchReport(Path.of("../documents/research/RQ2/RULES.md")).pdf(run))) {
            String text=new PDFTextStripper().getText(pdf);
            assertTrue(text.contains("37 measured queries per size: 13 at 3 hops; 12 at 4; 12 at 5."));
            assertFalse(text.contains("1,000 measured queries"));
        }
    }

    @Test void studyPdfDisclosesRoundsMedianFailuresDistinctCountsAndStructure()throws Exception {
        Graph graph=new OntologyGenerator().generate(source(),1000,1,2);
        var sample=new Sample(0,3,"s","m",5,3);var metrics=Metrics.of(List.of(sample));
        var trial=new Trial(1,1,Map.of(3,2,4,2,5,2),6,Structure.of(graph),2,1,1);
        var result=new Result(1000,graph.edges().size(),graph.nodeCounts(),graph.edgeCounts(),2,3,metrics,Map.of(3,metrics),List.of(sample),trial);
        var run=new Run(UUID.randomUUID(),"admin","SUCCEEDED",Instant.now(),Instant.now(),1,List.of(1000),"hash","0.9.0","rq2-v3",6,0,2,"Completed",null,Map.of(),"rules",List.of(result),new Protocol(List.of(1L),2,1),2,true);
        try(var pdf=Loader.loadPDF(new PdfResearchReport(Path.of("../documents/research/RQ2/RULES.md")).pdf(run))) {
            String text=new PDFTextStripper().getText(pdf);
            assertTrue(text.contains("Seeds: [1]"));assertTrue(text.contains("Round 1"));assertTrue(text.contains("Median"));assertTrue(text.contains("Errors 1 (including 1 timeouts)"));assertTrue(text.contains("Failure rate 50.00%"));assertTrue(text.contains("Unique pairs by hop"));assertTrue(text.contains("Degree (in+out)"));assertTrue(text.contains("not a confidence interval"));
        }
    }

}
