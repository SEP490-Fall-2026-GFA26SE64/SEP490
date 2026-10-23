package com.adaptlearngraph.evaluation.infrastructure;
import com.adaptlearngraph.evaluation.application.port.ResearchSource;
import com.adaptlearngraph.evaluation.domain.*;
import com.adaptlearngraph.evaluation.domain.Research.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;

public final class JsonOntologySource implements ResearchSource {
    private final Path path;private final ObjectMapper mapper;
    public JsonOntologySource(Path path,ObjectMapper mapper){this.path=path;this.mapper=mapper;}
    public Graph load(){try {
        byte[] bytes=Files.readAllBytes(path);
        Map<String,Object> json=mapper.readValue(bytes,new TypeReference<>(){});
        Map<String,String> labels=new LinkedHashMap<>();labels.put("Occupations","Occupation");labels.put("TargetRoles","TargetRole");labels.put("Levels","Level");labels.put("Competencies","Competency");labels.put("MicroSkills","MicroSkill");labels.put("LearningModules","LearningModule");
        List<Node> nodes=new ArrayList<>();List<Edge> edges=new ArrayList<>();Map<String,Integer> nc=new TreeMap<>(),ec=new TreeMap<>();
        for(var entry:labels.entrySet()) {
            List<Map<String,Object>> rows=mapper.convertValue(json.get(entry.getKey()),new TypeReference<>(){});
            for(Map<String,Object> row:rows){Map<String,Object> p=new LinkedHashMap<>(row);p.remove("occupationId");p.remove("targetRoleId");p.remove("levelId");nodes.add(new Node(entry.getValue(),p));}
            nc.put(entry.getValue(),rows.size());
        }
        List<Map<String,Object>> relations=mapper.convertValue(json.get("relationships"),new TypeReference<>(){});
        for(Map<String,Object> row:relations){Map<String,Object> p=new LinkedHashMap<>(row);String type=p.remove("type").toString(),from=p.remove("fromId").toString(),to=p.remove("toId").toString();edges.add(new Edge(type,from,to,p));ec.merge(type,1,Integer::sum);}
        String version=nodes.getFirst().properties().get("version").toString();
        if(nodes.stream().anyMatch(n->!version.equals(n.properties().get("version")))||edges.stream().anyMatch(e->!version.equals(e.properties().get("version"))))throw new IllegalArgumentException("Mixed catalog versions");
        Graph graph=new Graph(nodes,edges,List.of(),HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)),version,0,nc,ec);
        OntologyGenerator.validate(graph);return graph;
    }catch(Exception e){throw new IllegalStateException("Ontology source is unavailable or incompatible: "+e.getMessage(),e);}}
}
