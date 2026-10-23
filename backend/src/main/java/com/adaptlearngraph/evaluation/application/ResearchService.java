package com.adaptlearngraph.evaluation.application;
import com.adaptlearngraph.evaluation.application.port.*;
import com.adaptlearngraph.evaluation.domain.*;
import com.adaptlearngraph.evaluation.domain.Research.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.Executor;

public final class ResearchService {
    private final ResearchStore store; private final ResearchSource source; private final ResearchGraphPort graph;
    private final ResearchReport report; private final Executor executor;
    public ResearchService(ResearchStore store,ResearchSource source,ResearchGraphPort graph,ResearchReport report,Executor executor) {
        this.store=store;this.source=source;this.graph=graph;this.report=report;this.executor=executor;
    }
    public Map<String,Object> catalog() {
        Graph src=source.load();
        Map<String,Object> catalog=new LinkedHashMap<>();
        catalog.put("sourceVersion",src.sourceVersion());catalog.put("sourceHash",src.sourceHash());
        catalog.put("nodeCounts",src.nodeCounts());catalog.put("edgeCounts",src.edgeCounts());catalog.put("sizes",List.of(1000,5000,10000));
        catalog.put("iterations",Research.DEFAULT_ITERATIONS);catalog.put("minIterations",Research.MIN_ITERATIONS);catalog.put("maxIterations",Research.MAX_ITERATIONS);catalog.put("warmup",Research.WARMUP);
        catalog.put("rulesVersion",Research.RULES_VERSION);catalog.put("defaultSeeds",List.of(1,2,3,4,5));
        catalog.put("defaultPairsPerHop",500);catalog.put("maxPairsPerHop",10000);catalog.put("defaultRounds",3);catalog.put("maxRounds",10);catalog.put("maxSeeds",10);catalog.put("maxTotalQueries",1000000);
        return catalog;
    }
    public Run start(String actor,long seed,List<Integer> sizes) {
        return start(actor,seed,sizes,Research.DEFAULT_ITERATIONS);
    }
    public Run start(String actor,long seed,List<Integer> sizes,int iterations) {
        if(iterations<Research.MIN_ITERATIONS||iterations>Research.MAX_ITERATIONS)
            throw new ResearchException(400,"Measured queries per size must be between "+Research.MIN_ITERATIONS+" and "+Research.MAX_ITERATIONS+".");
        if(seed<0||seed>9007199254740991L||sizes==null||sizes.isEmpty()||sizes.size()>3||new HashSet<>(sizes).size()!=sizes.size()||!List.of(1000,5000,10000).containsAll(sizes))
            throw new ResearchException(400,"Select distinct sizes from 1000, 5000, 10000 and a non-negative safe integer seed.");
        Graph src=source.load();
        Run run=new Run(UUID.randomUUID(),actor,"QUEUED",Instant.now(),null,seed,sizes.stream().sorted().toList(),
            src.sourceHash(),src.sourceVersion(),"rq2-v2-compat",iterations,Research.WARMUP,0,"Queued",null,Map.of(),report.rules(),List.of());
        store.create(run);
        try {executor.execute(()->execute(run,src));} catch(RuntimeException e) {
            store.save(run.progress("FAILED",0,"Stopped","Worker unavailable",Map.of(),List.of()));throw new ResearchException(503,"Worker unavailable");
        }
        return run;
    }
    public Run startStudy(String actor,List<Long> seeds,List<Integer> sizes,int pairsPerHop,int rounds) {
        if(seeds==null||seeds.isEmpty()||seeds.size()>10||new HashSet<>(seeds).size()!=seeds.size()||seeds.stream().anyMatch(n->n==null||n<0||n>9007199254740991L))
            throw new ResearchException(400,"Choose 1..10 distinct non-negative safe integer seeds.");
        if(sizes==null||sizes.isEmpty()||sizes.size()>3||new HashSet<>(sizes).size()!=sizes.size()||!List.of(1000,5000,10000).containsAll(sizes))
            throw new ResearchException(400,"Select distinct sizes from 1000, 5000, 10000.");
        if(pairsPerHop<1||pairsPerHop>10000||rounds<1||rounds>10||(long)pairsPerHop*3*rounds*seeds.size()*sizes.size()>1000000)
            throw new ResearchException(400,"Pairs per hop: 1..10000; rounds: 1..10; total measured attempts must not exceed 1000000.");
        Graph src=source.load();int perSeedSize=pairsPerHop*3*rounds;
        Run run=new Run(UUID.randomUUID(),actor,"QUEUED",Instant.now(),null,seeds.getFirst(),sizes.stream().sorted().toList(),src.sourceHash(),src.sourceVersion(),Research.RULES_VERSION,
            perSeedSize,0,0,"Queued",null,Map.of(),report.rules(),List.of(),new Protocol(seeds,pairsPerHop,rounds),perSeedSize*seeds.size()*sizes.size(),false);
        store.create(run);
        try { executor.execute(()->executeStudy(run,src)); }
        catch(RuntimeException e){store.save(run.progress("FAILED",0,"Stopped","Worker unavailable",Map.of(),List.of()));throw new ResearchException(503,"Worker unavailable");}
        return run;
    }
    private record Prepared(long seed,int size,double generationMs) {}
    private void executeStudy(Run initial,Graph sourceGraph) {
        Run run=initial;int completed=0;List<Result> results=new ArrayList<>();Map<String,String> environment=new TreeMap<>();
        Graph current=null;List<Sample> samples=new ArrayList<>();int round=0;double generationMs=0,importMs=0;
        try {
            environment.putAll(graph.environment());environment.put("cache","One full workload pass excluded per seed/size before measured rounds; OS caches not flushed");
            List<Prepared> prepared=new ArrayList<>();int total=0;
            // Freeze the complete workload plan before timing. Reload one saved graph at a time.
            for(long seed:run.protocol().seeds()) for(int size:run.sizes()) {
                run=run.progress("RUNNING",completed,"Planning seed "+seed+" / "+size+" nodes",null,environment,results);store.save(run);
                long began=System.nanoTime();Graph generated=new OntologyGenerator().generate(sourceGraph,size,seed,run.protocol().pairsPerHop());
                double elapsed=(System.nanoTime()-began)/1e6;store.saveGraph(run.id(),generated);
                prepared.add(new Prepared(seed,size,elapsed));total+=generated.workload().size()*run.protocol().rounds();
            }
            run=run.planned(total);store.save(run);
            for(Prepared item:prepared) {
                current=store.graph(run.id(),item.size(),item.seed());generationMs=item.generationMs();
                run=run.progress("RUNNING",completed,"Importing seed "+item.seed()+" / "+item.size()+" nodes",null,environment,results);store.save(run);
                long began=System.nanoTime();graph.replace(current);importMs=(System.nanoTime()-began)/1e6;
                run=run.progress("RUNNING",completed,"Warming up full workload: seed "+item.seed()+" / "+item.size(),null,environment,results);store.save(run);
                for(Workload w:current.workload())graph.measure(-1,w);
                for(round=1;round<=run.protocol().rounds();round++) {
                    samples=new ArrayList<>();boolean failureLogged=false;List<Workload> order=new ArrayList<>(current.workload());
                    Collections.shuffle(order,new Random(item.seed() ^ (0x9E3779B97F4A7C15L*round)));
                    String phase="Measuring seed "+item.seed()+" / "+item.size()+" nodes / round "+round;
                    run=run.progress("RUNNING",completed,phase,null,environment,results);store.save(run);
                    for(int i=0;i<order.size();i++) {
                        if(Thread.currentThread().isInterrupted())throw new IllegalStateException("Worker interrupted");
                        Workload w=order.get(i);long started=System.nanoTime();
                        try { samples.add(graph.measure(i,w)); }
                        catch(RuntimeException e) {
                            if(Thread.currentThread().isInterrupted())throw e;
                            String outcome=isTimeout(e)?"TIMEOUT":"ERROR";
                            samples.add(new Sample(i,w.hops(),w.startId(),w.moduleId(),(System.nanoTime()-started)/1e6,0,outcome,"Query failed; inspect server logs. No retry performed."));
                            if(!failureLogged){System.getLogger(ResearchService.class.getName()).log(System.Logger.Level.WARNING,"First measured failure in study "+run.id()+" seed "+item.seed()+" size "+item.size()+" round "+round,e);failureLogged=true;}
                        }
                        completed++;
                        if(samples.size()%100==0){List<Result> partial=new ArrayList<>(results);partial.add(trialResult(current,generationMs,importMs,round,samples));store.save(run.progress("RUNNING",completed,phase,null,environment,partial));}
                    }
                    results.add(trialResult(current,generationMs,importMs,round,samples));samples=new ArrayList<>();
                    run=run.progress("RUNNING",completed,phase,null,environment,results);store.save(run);
                }
                current=null;
            }
            store.save(run.progress("SUCCEEDED",completed,"Completed",null,environment,results));
        } catch(Exception e) {
            if(current!=null&&!samples.isEmpty())results.add(trialResult(current,generationMs,importMs,round,samples));
            System.getLogger(ResearchService.class.getName()).log(System.Logger.Level.ERROR,"RQ2 study failed: "+run.id(),e);
            store.save(run.progress("FAILED",completed,"Stopped","Study interrupted or dependency/warm-up failed. Partial evidence retained; inspect API logs.",environment,results));
        }
    }
    private boolean isTimeout(Throwable e) {
        for(Throwable t=e;t!=null;t=t.getCause()) {
            String message=(t.getClass().getSimpleName()+" "+Objects.toString(t.getMessage(),"")).toLowerCase(Locale.ROOT);
            if(message.contains("timeout")||message.contains("timed out"))return true;
        }
        return false;
    }
    private Result trialResult(Graph g,double generationMs,double importMs,int round,List<Sample> samples) {
        List<Sample> successful=samples.stream().filter(s->s.outcome().equals("SUCCESS")).toList();
        Map<Integer,Metrics> byHop=new TreeMap<>();Map<Integer,Integer> unique=new TreeMap<>();
        for(int h=3;h<=5;h++){final int hop=h;unique.put(hop,(int)g.workload().stream().filter(w->w.hops()==hop).count());List<Sample> subset=successful.stream().filter(s->s.hops()==hop).toList();byHop.put(hop,subset.isEmpty()?Metrics.empty():Metrics.of(subset));}
        int errors=(int)samples.stream().filter(s->!s.outcome().equals("SUCCESS")).count();int timeouts=(int)samples.stream().filter(s->s.outcome().equals("TIMEOUT")).count();
        return new Result(g.nodes().size(),g.edges().size(),g.nodeCounts(),g.edgeCounts(),generationMs,importMs,successful.isEmpty()?Metrics.empty():Metrics.of(successful),byHop,List.copyOf(samples),new Trial(g.seed(),round,unique,g.workload().size(),Structure.of(g),samples.size(),errors,timeouts));
    }
    private void execute(Run initial,Graph sourceGraph) {
        Run run=initial;int completed=0;List<Result> results=new ArrayList<>();Map<String,String> environment=Map.of();
        Graph currentGraph=null; List<Sample> samples=new ArrayList<>(); double generationMs=0,importMs=0;
        try {
            environment=graph.environment();
            for(int size:run.sizes()) {
                run=run.progress("RUNNING",completed,"Generating "+size+" nodes",null,environment,results);store.save(run);
                long began=System.nanoTime();Graph generated=new OntologyGenerator().generate(sourceGraph,size,run.seed());
                currentGraph=generated; samples=new ArrayList<>(); generationMs=(System.nanoTime()-began)/1e6;store.saveGraph(run.id(),generated);
                run=run.progress("RUNNING",completed,"Importing "+size+" nodes",null,environment,results);store.save(run);
                began=System.nanoTime();graph.replace(generated);importMs=(System.nanoTime()-began)/1e6;
                Map<Integer,List<Workload>> pools=new HashMap<>();for(int h=3;h<=5;h++){final int hop=h;pools.put(h,generated.workload().stream().filter(w->w.hops()==hop).toList());}
                run=run.progress("RUNNING",completed,"Warming up "+size+" nodes",null,environment,results);store.save(run);
                for(int i=0;i<run.warmup();i++)graph.measure(-1,choose(pools,i));
                for(int i=0;i<run.iterations();i++) {
                    if(Thread.currentThread().isInterrupted())throw new IllegalStateException("Worker interrupted");
                    samples.add(graph.measure(i,choose(pools,i)));completed++;
                    if(i%50==49){
                        List<Result> checkpoint=new ArrayList<>(results);checkpoint.add(result(generated,generationMs,importMs,samples));
                        run=run.progress("RUNNING",completed,"Measuring "+size+" nodes",null,environment,checkpoint);store.save(run);
                    }
                }
                results.add(result(generated,generationMs,importMs,samples));samples=new ArrayList<>();currentGraph=null;
                run=run.progress("RUNNING",completed,"Finished "+size+" nodes",null,environment,results);store.save(run);
            }
            store.save(run.progress("SUCCEEDED",completed,"Completed",null,environment,results));
        } catch(Exception e) {
            if(currentGraph!=null&&!samples.isEmpty())results.add(result(currentGraph,generationMs,importMs,samples));
            String reason=e instanceof IllegalArgumentException||e instanceof IllegalStateException ? e.getMessage() : "Benchmark dependency failed. Check API logs and the dedicated research database.";
            System.getLogger(ResearchService.class.getName()).log(System.Logger.Level.ERROR,"RQ2 run failed: "+run.id(),e);
            store.save(run.progress("FAILED",completed,"Stopped",reason,environment,results));
        }
    }
    private Result result(Graph graph,double generationMs,double importMs,List<Sample> samples){
        Map<Integer,Metrics> byHop=new TreeMap<>();for(int h=3;h<=5;h++){final int hop=h;var subset=samples.stream().filter(s->s.hops()==hop).toList();if(!subset.isEmpty())byHop.put(h,Metrics.of(subset));}
        return new Result(graph.nodes().size(),graph.edges().size(),graph.nodeCounts(),graph.edgeCounts(),generationMs,importMs,Metrics.of(samples),byHop,List.copyOf(samples));
    }
    private Workload choose(Map<Integer,List<Workload>> pools,int i){List<Workload> pool=pools.get(3+i%3);return pool.get((i/3)%pool.size());}
    public List<Run> list(){return store.list();}
    public Run get(UUID id){return store.get(id);}
    public Graph graph(UUID id,int size){get(id);return store.graph(id,size);}
    public Graph graph(UUID id,int size,long seed){Run run=get(id);if(run.protocol()!=null&&!run.protocol().seeds().contains(seed))throw new ResearchException(404,"Seed not in this study");return store.graph(id,size,seed);}
    public byte[] pdf(UUID id){Run run=get(id);if(!run.status().equals("SUCCEEDED"))throw new ResearchException(409,"PDF requires a completed run");return report.pdf(run);}
    public String rules(){return report.rules();}
    public String rules(UUID id){return get(id).rulesMarkdown();}
}
