package com.adaptlearngraph.evaluation.domain;

import com.adaptlearngraph.evaluation.domain.Research.*;
import java.util.*;
import java.util.stream.Collectors;

/** Reproducible structural expansion. Metadata remains unreviewed; learner state is never generated here. */
public final class OntologyGenerator {
    private static final Map<String,List<String>> FIELDS = Map.of(
        "Occupation", List.of("code","name","jobZone","interestRealistic","interestInvestigative","interestArtistic","interestSocial","interestEnterprising","interestConventional"),
        "TargetRole", List.of("code","name","scope"), "Level", List.of("code","name","rank","context","attainmentRule"),
        "Competency", List.of("name","description","attainmentRule"), "MicroSkill", List.of("name","definition"),
        "LearningModule", List.of("title","moduleType","contentUri","contentType","contentVersion"));
    private static final Map<String,List<String>> ENDS = Map.of(
        "HAS_ROLE",List.of("Occupation","TargetRole"), "HAS_LEVEL",List.of("TargetRole","Level"),
        "HAS_COMPETENCY",List.of("Level","Competency"), "HAS_SKILL",List.of("Competency","MicroSkill"),
        "REQUIRES_SKILL",List.of("Level","MicroSkill"), "TEACHES",List.of("LearningModule","MicroSkill"),
        "HAS_SKILL_PREREQUISITE",List.of("MicroSkill","MicroSkill"));
    private static final List<String> META = List.of("id","version","status","reviewStatus","reviewedBy","reviewedAt");

    public Graph generate(Graph source, int target, long seed) {
        return generate(source,target,seed,256);
    }
    public Graph generate(Graph source, int target, long seed, int pairsPerHop) {
        if(pairsPerHop<1||pairsPerHop>10000)throw new IllegalArgumentException("Pairs per hop must be 1..10000");
        validate(source);
        if (!List.of(1000,5000,10000).contains(target) || source.nodes().size() > target)
            throw new IllegalArgumentException("Supported graph sizes: 1000, 5000, 10000; source must fit");
        Random random = new Random(seed);
        List<Node> nodes = new ArrayList<>(source.nodes());
        List<Edge> edges = new ArrayList<>(source.edges());
        Map<String,List<Node>> groups = source.nodes().stream().collect(Collectors.groupingBy(Node::label));
        Map<String,List<String>> skillCopies = new LinkedHashMap<>();
        for (Node skill: groups.get("MicroSkill")) skillCopies.put(skill.id(),new ArrayList<>(List.of(skill.id())));
        double expansion = (double)target/source.nodes().size()-1;
        int addedSkills = (int)Math.floor(groups.get("MicroSkill").size()*expansion);
        for (int i=0;i<addedSkills;i++) {
            Node original=groups.get("MicroSkill").get(i%groups.get("MicroSkill").size());
            Node clone=cloneNode(original,"SYN-S-"+i);
            nodes.add(clone); skillCopies.get(original.id()).add(clone.id());
            // New skills depend only on the original acyclic foundation graph.
            for (Edge e: source.edges()) if (e.type().equals("HAS_SKILL_PREREQUISITE") && e.fromId().equals(original.id()))
                edges.add(cloneEdge(e,clone.id(),e.toId(),edges.size()));
        }
        Map<String,List<String>> occupationCopies=new LinkedHashMap<>();
        for(Node occupation:groups.get("Occupation"))occupationCopies.put(occupation.id(),new ArrayList<>(List.of(occupation.id())));
        int extraOccupations=(int)Math.floor(groups.get("Occupation").size()*expansion);
        for(int i=0;i<extraOccupations;i++) {
            Node original=groups.get("Occupation").get(i%groups.get("Occupation").size());
            Node clone=cloneNode(original,"SYN-O-"+i);
            nodes.add(clone);occupationCopies.get(original.id()).add(clone.id());
        }
        Map<String,List<Edge>> outgoing=source.edges().stream().collect(Collectors.groupingBy(Edge::fromId));
        Map<String,Node> originalNodes=source.nodes().stream().collect(Collectors.toMap(Node::id,n->n));
        int desiredModules=(int)Math.ceil((double)groups.get("LearningModule").size()*target/source.nodes().size());
        int reservedModules=desiredModules-groups.get("LearningModule").size();
        int roleIndex=0;
        List<Node> roles=new ArrayList<>(groups.get("TargetRole")); Collections.shuffle(roles,random);
        while(true) {
            Node role=roles.get(roleIndex%roles.size());
            List<Node> pack=new ArrayList<>(List.of(role));
            for(Edge e: outgoing.getOrDefault(role.id(),List.of())) if(e.type().equals("HAS_LEVEL")) {
                Node level=originalNodes.get(e.toId()); pack.add(level);
                for(Edge c:outgoing.getOrDefault(level.id(),List.of())) if(c.type().equals("HAS_COMPETENCY")) pack.add(originalNodes.get(c.toId()));
            }
            if(nodes.size()+pack.size()+reservedModules>target) break;
            Map<String,String> mapping=new HashMap<>();
            for(Node n:pack) {
                Node clone=cloneNode(n,"SYN-R"+roleIndex+"-"+n.id());
                nodes.add(clone);mapping.put(n.id(),clone.id());
            }
            for(var entry:skillCopies.entrySet()) mapping.put(entry.getKey(),entry.getValue().get(random.nextInt(entry.getValue().size())));
            Edge ownership=source.edges().stream().filter(e->e.type().equals("HAS_ROLE")&&e.toId().equals(role.id())).findFirst().orElseThrow();
            List<String> matchingOccupations=occupationCopies.get(ownership.fromId());
            edges.add(cloneEdge(ownership,matchingOccupations.get(random.nextInt(matchingOccupations.size())),mapping.get(role.id()),edges.size()));
            for(Node n:pack) for(Edge e:outgoing.getOrDefault(n.id(),List.of()))
                edges.add(cloneEdge(e,mapping.get(e.fromId()),mapping.get(e.toId()),edges.size()));
            roleIndex++;
        }
        int moduleIndex=0;
        while(nodes.size()<target) {
            Node original=groups.get("LearningModule").get(moduleIndex%groups.get("LearningModule").size());
            Node clone=cloneNode(original,"SYN-M-"+moduleIndex);nodes.add(clone);
            for(Edge e:outgoing.getOrDefault(original.id(),List.of())) {
                List<String> copies=skillCopies.get(e.toId());
                String skill=copies.get(random.nextInt(copies.size()));
                edges.add(cloneEdge(e,clone.id(),skill,edges.size()));
            }
            moduleIndex++;
        }
        // Guarantee every added skill has a teaching provider preserving its source skill/content mapping.
        Set<String> taught=edges.stream().filter(e->e.type().equals("TEACHES")).map(Edge::toId).collect(Collectors.toSet());
        for(var entry:skillCopies.entrySet()) for(String skill:entry.getValue()) if(!taught.contains(skill)) {
            Edge provider=source.edges().stream().filter(e->e.type().equals("TEACHES")&&e.toId().equals(entry.getKey())).findFirst().orElseThrow();
            edges.add(cloneEdge(provider,provider.fromId(),skill,edges.size()));
        }
        Map<String,Integer> nc=new TreeMap<>(),ec=new TreeMap<>();
        nodes.forEach(n->nc.merge(n.label(),1,Integer::sum));edges.forEach(e->ec.merge(e.type(),1,Integer::sum));
        Graph generated=new Graph(List.copyOf(nodes),List.copyOf(edges),workload(edges,seed,pairsPerHop),source.sourceHash(),source.sourceVersion(),seed,nc,ec);
        validate(generated);return generated;
    }
    private Node cloneNode(Node original,String id) {
        Map<String,Object> props=new LinkedHashMap<>(original.properties());props.put("id",id);
        if(props.containsKey("code")&&!original.label().equals("Level")) props.put("code",id);
        props.put("reviewStatus","NEEDS_EXPERT_REVIEW");props.put("reviewedBy",null);props.put("reviewedAt",null);
        return new Node(original.label(),props);
    }
    private Edge cloneEdge(Edge original,String from,String to,int i) {
        Map<String,Object> props=new LinkedHashMap<>(original.properties());props.put("id","SYN-E-"+i);
        props.put("reviewStatus","NEEDS_EXPERT_REVIEW");props.put("reviewedBy",null);props.put("reviewedAt",null);
        return new Edge(original.type(),from,to,props);
    }
    public static List<Workload> workload(List<Edge> edges,long seed) {
        return workload(edges,seed,256);
    }
    public static List<Workload> workload(List<Edge> edges,long seed,int pairsPerHop) {
        Map<String,String> compLevel=new HashMap<>(),levelRole=new HashMap<>(),roleOcc=new HashMap<>();
        Map<String,List<String>> providers=new HashMap<>();
        for(Edge e:edges) switch(e.type()) {
            case "HAS_COMPETENCY" -> compLevel.put(e.toId(),e.fromId());
            case "HAS_LEVEL" -> levelRole.put(e.toId(),e.fromId());
            case "HAS_ROLE" -> roleOcc.put(e.toId(),e.fromId());
            case "TEACHES" -> providers.computeIfAbsent(e.toId(),k->new ArrayList<>()).add(e.fromId());
            default -> { }
        }
        List<Workload> result=new ArrayList<>();Random random=new Random(seed);
        for(int hops=3;hops<=5;hops++) {
            Set<Workload> unique=new LinkedHashSet<>();
            for(Edge e:edges) if(e.type().equals("HAS_SKILL")) {
                String start=compLevel.get(e.fromId());if(hops>=4)start=levelRole.get(start);if(hops==5)start=roleOcc.get(start);
                for(String module:providers.getOrDefault(e.toId(),List.of())) unique.add(new Workload(hops,start,module));
            }
            List<Workload> pool=new ArrayList<>(unique);Collections.shuffle(pool,random);
            if(pool.isEmpty())throw new IllegalArgumentException("Missing workload for "+hops+" hops");
            result.addAll(pool.subList(0,Math.min(pairsPerHop,pool.size())));
        }
        return List.copyOf(result);
    }
    public static void validate(Graph graph) {
        Map<String,Node> nodes=new HashMap<>();Set<String> ids=new HashSet<>(),pairs=new HashSet<>(),codes=new HashSet<>();
        Map<String,Set<String>> childSkills=new HashMap<>(),required=new HashMap<>(),dag=new HashMap<>();
        Map<String,String> owners=new HashMap<>();Set<String> teachingModules=new HashSet<>(),taught=new HashSet<>();
        for(Node n:graph.nodes()) {
            if(!FIELDS.containsKey(n.label())||nodes.put(n.id(),n)!=null)throw new IllegalArgumentException("Invalid node type or duplicate id");
            Set<String> expected=new HashSet<>(META);expected.addAll(FIELDS.get(n.label()));
            checkFields(n.properties(),expected);
            if(Set.of("Occupation","TargetRole").contains(n.label())&&!codes.add(n.label()+":"+n.properties().get("code")))throw new IllegalArgumentException("Duplicate catalog code");
            if(n.label().equals("Level")) {
                String code=n.properties().get("code").toString();
                if(!Map.of("J",1,"M",2,"S",3).containsKey(code)||!(n.properties().get("rank") instanceof Number rank)||rank.intValue()!=Map.of("J",1,"M",2,"S",3).get(code)||!"ALL_MANDATORY_SKILLS".equals(n.properties().get("attainmentRule")))throw new IllegalArgumentException("Invalid Level definition");
            }
            if(n.label().equals("Competency")&&!"ALL_MEMBER_SKILLS_AT_OWNING_LEVEL".equals(n.properties().get("attainmentRule")))throw new IllegalArgumentException("Invalid competency rule");
            if(n.label().equals("Occupation")) for(String f:FIELDS.get("Occupation")) if(f.startsWith("interest")) score(n.properties().get(f));
        }
        for(Edge e:graph.edges()) {
            if(!ENDS.containsKey(e.type())||!nodes.containsKey(e.fromId())||!nodes.containsKey(e.toId()))throw new IllegalArgumentException("Dangling relationship");
            if(!List.of(nodes.get(e.fromId()).label(),nodes.get(e.toId()).label()).equals(ENDS.get(e.type())))throw new IllegalArgumentException("Relationship endpoint type mismatch");
            if(!ids.add(e.properties().get("id").toString())||!pairs.add(e.type()+":"+e.fromId()+":"+e.toId()))throw new IllegalArgumentException("Duplicate relationship");
            Set<String> expected=new HashSet<>(META);
            if(e.type().equals("REQUIRES_SKILL")||e.type().equals("HAS_SKILL_PREREQUISITE")) {expected.add("requiredScore");score(e.properties().get("requiredScore"));}
            if(e.type().equals("REQUIRES_SKILL")) {expected.add("isMandatory");if(!(e.properties().get("isMandatory") instanceof Boolean))throw new IllegalArgumentException("Invalid mandatory flag");}
            checkFields(e.properties(),expected);
            switch(e.type()) {
                case "HAS_ROLE","HAS_LEVEL","HAS_COMPETENCY" -> {if(owners.put(e.toId(),e.fromId())!=null)throw new IllegalArgumentException("Multiple owners");}
                case "HAS_SKILL" -> childSkills.computeIfAbsent(e.fromId(),k->new HashSet<>()).add(e.toId());
                case "REQUIRES_SKILL" -> required.computeIfAbsent(e.fromId(),k->new HashSet<>()).add(e.toId());
                case "TEACHES" -> {teachingModules.add(e.fromId());taught.add(e.toId());}
                case "HAS_SKILL_PREREQUISITE" -> dag.computeIfAbsent(e.fromId(),k->new HashSet<>()).add(e.toId());
                default -> { }
            }
        }
        Set<String> levelCodes=new HashSet<>();
        for(Node n:graph.nodes()) {
            if(n.label().equals("Level")&&!levelCodes.add(owners.get(n.id())+":"+n.properties().get("code")))throw new IllegalArgumentException("Duplicate Level code within role");
            if(Set.of("TargetRole","Level","Competency").contains(n.label())&&!owners.containsKey(n.id()))throw new IllegalArgumentException("Missing owner");
            if(n.label().equals("Level")&&!required.containsKey(n.id()))throw new IllegalArgumentException("Missing level requirements");
            if(n.label().equals("Competency")) {
                Set<String> skills=childSkills.getOrDefault(n.id(),Set.of());
                if(skills.size()<2||!required.getOrDefault(owners.get(n.id()),Set.of()).containsAll(skills))throw new IllegalArgumentException("Competency membership mismatch");
            }
            if(n.label().equals("LearningModule")&&!teachingModules.contains(n.id()))throw new IllegalArgumentException("Module without skill");
            if(n.label().equals("MicroSkill")&&!taught.contains(n.id()))throw new IllegalArgumentException("Skill without module");
        }
        Set<String> visited=new HashSet<>();for(String id:dag.keySet())visit(id,dag,visited,new HashSet<>());
    }
    private static void visit(String id,Map<String,Set<String>> dag,Set<String> visited,Set<String> stack) {
        if(stack.contains(id))throw new IllegalArgumentException("Cyclic prerequisite");if(visited.contains(id))return;
        stack.add(id);for(String next:dag.getOrDefault(id,Set.of()))visit(next,dag,visited,stack);stack.remove(id);visited.add(id);
    }
    private static void checkFields(Map<String,Object> props,Set<String> expected) {
        if(!props.keySet().equals(expected))throw new IllegalArgumentException("Schema field mismatch: "+props.keySet());
        for(String f:expected)if(!Set.of("reviewedBy","reviewedAt").contains(f)&&(props.get(f)==null||props.get(f).toString().isBlank()))throw new IllegalArgumentException("Empty field: "+f);
        if(!Set.of("DRAFT","ACTIVE","ARCHIVED").contains(props.get("status"))||!Set.of("NEEDS_EXPERT_REVIEW","APPROVED","REJECTED").contains(props.get("reviewStatus")))throw new IllegalArgumentException("Invalid lifecycle metadata");
        if("APPROVED".equals(props.get("reviewStatus"))&&(props.get("reviewedBy")==null||props.get("reviewedAt")==null))throw new IllegalArgumentException("Missing approval evidence");
    }
    private static void score(Object value) {
        if(!(value instanceof Number n)||!Double.isFinite(n.doubleValue())||n.doubleValue()<0||n.doubleValue()>1)throw new IllegalArgumentException("Score outside [0,1]");
    }
}
