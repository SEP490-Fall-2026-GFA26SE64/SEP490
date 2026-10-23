package com.adaptlearngraph.evaluation.infrastructure;
import com.adaptlearngraph.evaluation.application.port.ResearchReport;
import com.adaptlearngraph.evaluation.domain.Research.*;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;

public final class PdfResearchReport implements ResearchReport {
    private final Path rulesPath;
    public PdfResearchReport(Path rulesPath){this.rulesPath=rulesPath;}
    public String rules(){try{return Files.readString(rulesPath);}catch(IOException e){throw new IllegalStateException("Research rules unavailable",e);}}
    public byte[] pdf(Run run){
        List<String> lines=new ArrayList<>();
        lines.add("ADAPT-LEARN-GRAPH | RESEARCH REPORT");lines.add("RQ2 - Ontology traversal latency");lines.add("");
        lines.add("Run: "+run.id());lines.add("Status: "+run.status()+" | Created by: "+run.createdBy());
        lines.add("Started: "+run.createdAt());lines.add("Finished: "+run.finishedAt());
        lines.add("Catalog: "+run.sourceVersion()+" | Rules: "+run.rulesVersion()+" | Seed: "+run.seed());
        lines.add("Source SHA-256: "+run.sourceHash());lines.add("");
        lines.add("MEASUREMENT PROTOCOL");
        if(run.protocol()==null) {
            lines.add(String.format(Locale.ROOT,"%,d measured queries per size: %,d at 3 hops; %,d at 4; %,d at 5.",run.iterations(),(run.iterations()+2)/3,(run.iterations()+1)/3,run.iterations()/3));
            lines.add(run.warmup()+" warm-up queries per size excluded. Concurrency: 1. Warm cache.");
        } else {
            lines.add("Seeds: "+run.protocol().seeds()+" | Requested distinct pairs per hop: "+run.protocol().pairsPerHop());
            lines.add("Measured rounds per seed/size: "+run.protocol().rounds()+" | Attempts: "+run.completedQueries()+" / "+run.totalQueries());
            lines.add("One full workload warm-up per seed/size, excluded. Concurrency: 1.");
            lines.add("Each round uses the same distinct pairs in reproducibly shuffled order.");
            lines.add("Actual pair counts can be below the request; never padded by repetitions.");
        }
        lines.add("Client wall time includes driver execution and complete result consumption.");
        lines.add("Mean = sum / n; Median = middle value(s); P95 = ceil(0.95 * n), one-based.");
        lines.add("Generation/import excluded. No retries. Latency metrics use successes only.");lines.add("");
        lines.add("RESULTS (milliseconds)");
        for(Result result:run.results()) {
            if(result.trial()!=null) {
                Trial trial=result.trial();
                lines.add("Seed "+trial.seed()+" | Round "+trial.round()+" | Nodes "+result.nodeCount()+" | Edges "+result.edgeCount());
                lines.add("Unique pairs by hop: "+trial.uniqueByHop()+" | Excluded warm-up: "+trial.warmupQueries());
                lines.add(String.format(Locale.ROOT,"Attempts %d | Success %d | Errors %d (including %d timeouts) | Failure rate %.2f%%",trial.attempted(),result.overall().count(),trial.errors(),trial.timeouts(),100.0*trial.errors()/Math.max(1,trial.attempted())));
                lines.add(String.format(Locale.ROOT,"Degree (in+out): average %.3f; max %d",trial.structure().averageDegree(),trial.structure().maxDegree()));
            } else lines.add("Nodes "+result.nodeCount()+" | Edges "+result.edgeCount());
            lines.add(String.format(Locale.ROOT,"%-8s %-10s %-12s %-12s %-12s","Hops","Success N","Mean","Median","P95"));
            lines.add(row(result.nodeCount(),result.edgeCount(),"all",result.overall()));
            result.byHop().forEach((hop,m)->lines.add(row(result.nodeCount(),result.edgeCount(),hop.toString(),m)));
            lines.add(String.format(Locale.ROOT,"Generation %.2f ms | Import %.2f ms (once per seed/size)",result.generationMs(),result.importMs()));lines.add("");
        }
        if(run.protocol()!=null) {
            lines.add("VARIATION OF ROUND MEANS (descriptive, not a confidence interval)");
            for(int size:run.sizes()) {
                double[] means=run.results().stream().filter(r->r.nodeCount()==size&&r.overall().count()>0).mapToDouble(r->r.overall().meanMs()).toArray();
                if(means.length>0) {
                    double mean=Arrays.stream(means).average().orElseThrow();
                    double sd=means.length>1?Math.sqrt(Arrays.stream(means).map(v->(v-mean)*(v-mean)).sum()/(means.length-1)):0;
                    lines.add(String.format(Locale.ROOT,"%d nodes | %d seed/round observations | mean %.3f | SD %s | range %.3f..%.3f ms",size,means.length,mean,means.length>1?String.format(Locale.ROOT,"%.3f",sd):"N/A",Arrays.stream(means).min().orElseThrow(),Arrays.stream(means).max().orElseThrow()));
                }
            }
            lines.add("P95 is reported per seed/round; percentiles are not averaged into a pooled P95.");
        }
        lines.add("");lines.add("ENVIRONMENT");run.environment().forEach((k,v)->{if(!k.equals("query"))lines.add(k+": "+v);});
        lines.add("");lines.add("WORKLOAD");lines.add(run.environment().getOrDefault("query","Unavailable"));
        lines.add("3 hops: Level - Competency - MicroSkill - LearningModule.");
        lines.add("4 hops: TargetRole - Level - Competency - MicroSkill - LearningModule.");
        lines.add("5 hops: Occupation - TargetRole - Level - Competency - MicroSkill - Module.");
        lines.add("");lines.add("DATASET COUNTS");for(Result r:run.results()){if(r.trial()==null||r.trial().round()==1){lines.add((r.trial()==null?"":"Seed "+r.trial().seed()+" | ")+r.nodeCount()+" nodes: "+r.nodeCounts());lines.add("Relationships: "+r.edgeCounts());}}
        lines.add("");lines.add("INTERPRETATION AND LIMITATIONS");
        lines.add("Synthetic structural pathfinding; not a validated learning recommendation algorithm.");
        lines.add("Catalog definitions remain NEEDS_EXPERT_REVIEW. No expert approval is inferred.");
        lines.add("150 ms is a reference threshold, not an automatic NFR pass/fail verdict.");
        lines.add("CPU/network/cache and graph branching affect these measurements.");
        lines.add("Use raw JSON/CSV and the frozen dataset for independent verification.");
        lines.add("RQ1 and RQ3 were not executed. Results do not demonstrate learning gains.");
        try(PDDocument doc=new PDDocument();ByteArrayOutputStream output=new ByteArrayOutputStream()) {
            var font=new PDType1Font(Standard14Fonts.FontName.COURIER);
            List<String> wrapped=new ArrayList<>();for(String line:lines) for(String paragraph:line.split("\n",-1)) {
                String safe=paragraph.replaceAll("[^\\x20-\\x7E]","?");
                while(safe.length()>88){int split=safe.lastIndexOf(' ',88);if(split<30)split=88;wrapped.add(safe.substring(0,split));safe=safe.substring(split).stripLeading();}wrapped.add(safe);
            }
            List<List<String>> pageLines=new ArrayList<>();List<String> currentPage=new ArrayList<>();
            for(int i=0;i<wrapped.size();i++) {
                String line=wrapped.get(i);int keep=1;
                if((line.startsWith("Seed ")&&line.contains("| Round "))||Set.of("WORKLOAD","DATASET COUNTS","INTERPRETATION AND LIMITATIONS").contains(line)) {
                    keep=0;for(int j=i;j<wrapped.size()&&!wrapped.get(j).isEmpty();j++)keep++;
                } else if(Set.of("MEASUREMENT PROTOCOL","RESULTS (milliseconds)","ENVIRONMENT","WORKLOAD","DATASET COUNTS","INTERPRETATION AND LIMITATIONS").contains(line)||line.startsWith("VARIATION OF ROUND MEANS"))keep=3;
                if(!currentPage.isEmpty()&&(currentPage.size()>=48||currentPage.size()+Math.min(48,keep)>48)) {pageLines.add(currentPage);currentPage=new ArrayList<>();}
                if(!currentPage.isEmpty()||!line.isEmpty())currentPage.add(line);
            }
            if(!currentPage.isEmpty())pageLines.add(currentPage);
            int pages=pageLines.size();
            for(int pageIndex=0;pageIndex<pages;pageIndex++) {
                PDPage page=new PDPage(PDRectangle.A4);doc.addPage(page);
                try(PDPageContentStream stream=new PDPageContentStream(doc,page)) {
                    stream.beginText();stream.setFont(font,9);stream.setLeading(14);stream.newLineAtOffset(38,790);
                    for(String line:pageLines.get(pageIndex)){stream.showText(line);stream.newLine();}stream.endText();
                    stream.beginText();stream.setFont(font,8);stream.newLineAtOffset(38,30);stream.showText("RQ2 | "+run.id()+" | Page "+(pageIndex+1)+" / "+pages);stream.endText();
                }
            }
            doc.save(output);return output.toByteArray();
        }catch(IOException e){throw new IllegalStateException("Cannot export PDF",e);}
    }
    private String row(int nodes,int edges,String hops,Metrics m){
        if(m.count()==0)return String.format(Locale.ROOT,"%-8s %-10d %-12s %-12s %-12s",hops,0,"N/A","N/A","N/A");
        return String.format(Locale.ROOT,"%-8s %-10d %-12.3f %-12s %-12.3f",hops,m.count(),m.meanMs(),m.medianMs()==null?"N/A":String.format(Locale.ROOT,"%.3f",m.medianMs()),m.p95Ms());
    }
}
