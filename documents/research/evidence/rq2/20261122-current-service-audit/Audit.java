import com.adaptlearngraph.services.PlatformGraphBenchmarkService;
import com.adaptlearngraph.dtos.GraphBenchmarkDto.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.neo4j.driver.*;
import java.nio.file.*;
import java.util.*;
import java.time.*;
public class Audit {
 public static void main(String[] args) throws Exception {
  Path out=Path.of("/private/tmp/sep490-rq2-audit"); var json=new ObjectMapper();
  try(var driver=GraphDatabase.driver("bolt://127.0.0.1:7687",AuthTokens.basic(System.getenv("RQ2_USER"),System.getenv("RQ2_PASSWORD")))) {
   driver.verifyConnectivity();var beans=new DefaultListableBeanFactory();beans.registerSingleton("auditDriver",driver);
   var service=new PlatformGraphBenchmarkService(beans.getBeanProvider(Driver.class),json);
   var overview=service.overview();json.writerWithDefaultPrettyPrinter().writeValue(out.resolve("overview.json").toFile(),overview);
   System.out.println("ACTUAL nodes="+overview.totalNodes()+" relationships="+overview.totalRelationships()+" version="+overview.neo4jVersion());
   String query="""
     MATCH (start), (target)
     WHERE (start.id = $startId OR start.code = $startId)
       AND (target.id = $targetId OR target.code = $targetId)
     MATCH p = shortestPath((start)-[:HAS_JOB_POSITION|HAS_ROLE|HAS_LEVEL|HAS_COMPETENCY|HAS_SKILL|REQUIRES_SKILL|TEACHES|HAS_SKILL_PREREQUISITE*1..5]-(target))
     RETURN length(p) AS hops LIMIT 1
     """;
   List<Map<String,Object>> validations=new ArrayList<>();
   try(var session=driver.session()) {
    for(int set=1;set<=3;set++) {
     int missing=0,wrong=0,mismatch=0;Map<Integer,Integer> counts=new TreeMap<>();
     for(var pair:service.getFixturePairs("1k",set,100)) {
      var row=new LinkedHashMap<String,Object>();row.put("set",set);row.put("startId",pair.startId());row.put("targetId",pair.targetId());row.put("fixtureHops",pair.hops());
      var records=session.run(query,Map.of("startId",pair.startId(),"targetId",pair.targetId()),TransactionConfig.builder().withTimeout(Duration.ofSeconds(5)).build()).list();
      if(records.isEmpty()){missing++;row.put("actualHops",null);}else{int h=records.getFirst().get("hops").asInt();row.put("actualHops",h);counts.merge(h,1,Integer::sum);if(h<3||h>5)wrong++;if(h!=pair.hops())mismatch++;}
      validations.add(row);
     }
     System.out.println("FIXTURE set="+set+" tested=100 missing="+missing+" outside3to5="+wrong+" hopMismatch="+mismatch+" actualHops="+counts);
    }
   }
   json.writerWithDefaultPrettyPrinter().writeValue(out.resolve("fixture-validation.json").toFile(),validations);
   for(String scale:List.of("1k","5k","10k")) {
    var r=service.runBenchmark(new BenchmarkRequest(scale,1,100,50,3,5,true));
    json.writerWithDefaultPrettyPrinter().writeValue(out.resolve("run-"+scale+".json").toFile(),r);
    System.out.println("RUN scale="+scale+" reportedNodes="+r.catalogNodes()+" runs="+r.totalRuns()+" mean="+r.meanLatencyMs()+" p95="+r.p95LatencyMs()+" exportedTimings="+r.recentRuns().size()+" sampleHops="+r.samplePaths().stream().map(PathSample::hops).toList());
   }
   var after=service.overview();System.out.println("AFTER nodes="+after.totalNodes()+" relationships="+after.totalRelationships());
  }
 }
}
