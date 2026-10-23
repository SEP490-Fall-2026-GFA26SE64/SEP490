package com.adaptlearngraph.evaluation.api;

import com.adaptlearngraph.evaluation.application.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.adaptlearngraph.evaluation.domain.Research;
import com.adaptlearngraph.evaluation.domain.Research.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/v1/admin/research")
@ConditionalOnProperty(name="research.enabled",havingValue="true")
public class ResearchController {
    private final ResearchService service;
    public ResearchController(ResearchService service){this.service=service;}
    @GetMapping("/session") public Map<String,String> session(Principal principal,CsrfToken csrf){return Map.of("username",principal.getName(),"csrfToken",csrf.getToken(),"csrfHeader",csrf.getHeaderName());}
    @GetMapping("/catalog") public Map<String,Object> catalog(){return service.catalog();}
    @GetMapping("/runs") public List<Run> list(){return service.list().stream().map(this::withoutSamples).toList();}
    @PostMapping("/runs") public ResponseEntity<Run> start(@RequestBody JsonNode request,Principal principal){
        if(request.has("seeds")) {
            if(request.has("seed")||request.has("iterations"))throw new ResearchException(400,"Do not mix study and legacy configuration");
            JsonNode seeds=request.path("seeds"),sizes=request.path("sizes"),pairs=request.path("pairsPerHop"),rounds=request.path("rounds");
            if(!seeds.isArray()||!sizes.isArray()||!pairs.isIntegralNumber()||!pairs.canConvertToInt()||!rounds.isIntegralNumber()||!rounds.canConvertToInt())throw new ResearchException(400,"Seeds, sizes, pairsPerHop and rounds must be integers");
            List<Long> seedValues=new ArrayList<>();for(JsonNode n:seeds){if(!n.isIntegralNumber()||!n.canConvertToLong())throw new ResearchException(400,"Seeds must be integers");seedValues.add(n.longValue());}
            List<Integer> sizeValues=new ArrayList<>();for(JsonNode n:sizes){if(!n.isIntegralNumber()||!n.canConvertToInt())throw new ResearchException(400,"Sizes must be integers");sizeValues.add(n.intValue());}
            return ResponseEntity.status(202).body(service.startStudy(principal.getName(),seedValues,sizeValues,pairs.intValue(),rounds.intValue()));
        }
        JsonNode seed=request.path("seed"),sizes=request.path("sizes");
        if(!seed.isIntegralNumber()||!seed.canConvertToLong()||!sizes.isArray())throw new ResearchException(400,"Seed and sizes must be integers");
        List<Integer> values=new ArrayList<>();for(JsonNode size:sizes){if(!size.isIntegralNumber()||!size.canConvertToInt())throw new ResearchException(400,"Sizes must be integers");values.add(size.intValue());}
        JsonNode iterations=request.get("iterations");
        if(iterations!=null&&(!iterations.isIntegralNumber()||!iterations.canConvertToInt()))
            throw new ResearchException(400,"Measured queries per size must be an integer");
        return ResponseEntity.status(202).body(service.start(principal.getName(),seed.longValue(),values,
            iterations==null?Research.DEFAULT_ITERATIONS:iterations.intValue()));
    }
    @GetMapping("/runs/{id}") public Run get(@PathVariable UUID id){return withoutSamples(service.get(id));}
    @GetMapping("/runs/{id}/raw") public ResponseEntity<Run> raw(@PathVariable UUID id){return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\"rq2-"+id+".json\"").body(service.get(id));}
    @GetMapping("/runs/{id}/datasets/{size}") public ResponseEntity<Graph> graph(@PathVariable UUID id,@PathVariable int size,@RequestParam(required=false) Long seed){return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\"rq2-"+id+"-"+size+".json\"").body(seed==null?service.graph(id,size):service.graph(id,size,seed));}
    @GetMapping("/runs/{id}/samples.csv") public ResponseEntity<String> csv(@PathVariable UUID id){
        Run run=service.get(id);StringBuilder csv=new StringBuilder("seed,round,nodes,iteration,hops,start_id,module_id,latency_ms,returned_hops,outcome,error\n");
        for(Result r:run.results())for(Sample sample:r.samples())csv.append(String.format(Locale.ROOT,"%d,%d,%d,%d,%d,%s,%s,%.9f,%d,%s,%s%n",
            r.trial()==null?run.seed():r.trial().seed(),r.trial()==null?1:r.trial().round(),r.nodeCount(),sample.iteration(),sample.hops(),cell(sample.startId()),cell(sample.moduleId()),sample.latencyMs(),sample.returnedHops(),sample.outcome(),cell(Objects.toString(sample.error(),""))));
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/csv;charset=UTF-8")).header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\"rq2-"+id+".csv\"").body(csv.toString());
    }
    private String cell(String value){String safe=value.matches("^[=+@-].*")?"'"+value:value;return "\""+safe.replace("\"","\"\"")+"\"";}
    @GetMapping("/runs/{id}/report.pdf") public ResponseEntity<byte[]> pdf(@PathVariable UUID id){return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\"rq2-"+id+".pdf\"").body(service.pdf(id));}
    @GetMapping("/rules.md") public ResponseEntity<String> rules(){return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/markdown;charset=UTF-8")).header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\"rq2-rules.md\"").body(service.rules());}
    @GetMapping("/runs/{id}/rules.md") public ResponseEntity<String> frozenRules(@PathVariable UUID id){return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/markdown;charset=UTF-8")).header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=rules-"+id+".md").body(service.rules(id));}
    private Run withoutSamples(Run r){return new Run(r.id(),r.createdBy(),r.status(),r.createdAt(),r.finishedAt(),r.seed(),r.sizes(),r.sourceHash(),r.sourceVersion(),r.rulesVersion(),r.iterations(),r.warmup(),r.completedQueries(),r.phase(),r.failure(),r.environment(),r.rulesMarkdown(),r.results().stream().map(Result::summary).toList(),r.protocol(),r.totalQueries(),r.planReady());}
    @ExceptionHandler(ResearchException.class) ResponseEntity<Map<String,String>> researchError(ResearchException e){return ResponseEntity.status(e.status()).body(Map.of("message",e.getMessage()));}
    @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<Map<String,String>> invalid(IllegalArgumentException e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}
    @ExceptionHandler(IllegalStateException.class) ResponseEntity<Map<String,String>> unavailable(IllegalStateException e){return ResponseEntity.status(503).body(Map.of("message","Research is unavailable. Check the ontology source and research services."));}
}
