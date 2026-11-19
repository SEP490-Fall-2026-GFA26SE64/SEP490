package com.adaptlearngraph.entities.domain;

import com.adaptlearngraph.exception.PrerequisiteCycleException;
import java.util.*;

public final class PrerequisiteRules {
    private PrerequisiteRules() {}
    public record Pair(String dependentSkill,KnowledgeLevel dependentLevel,String prerequisiteSkill,KnowledgeLevel prerequisiteLevel) {
        public Pair(String dependentSkill,String prerequisiteSkill) {
            this(dependentSkill,null,prerequisiteSkill,null);
        }
        public Pair {
            Objects.requireNonNull(dependentSkill);
            Objects.requireNonNull(prerequisiteSkill);
            if((dependentLevel == null) != (prerequisiteLevel == null))
                throw new IllegalArgumentException("Both prerequisite knowledge levels must be omitted or provided together");
            if(dependentSkill.equals(prerequisiteSkill) && Objects.equals(dependentLevel,prerequisiteLevel))
                throw new IllegalArgumentException("A requirement cannot require itself");
        }
        String from(){return dependentLevel==null?dependentSkill:dependentSkill+"\n"+dependentLevel;}
        String to(){return prerequisiteLevel==null?prerequisiteSkill:prerequisiteSkill+"\n"+prerequisiteLevel;}
    }
    public static void assertAddition(List<Pair> active,Pair added) {
        if(added.dependentLevel()==null) {
            if(active.stream().anyMatch(e->e.dependentSkill().equals(added.dependentSkill()) && e.prerequisiteSkill().equals(added.prerequisiteSkill())))
                throw new IllegalArgumentException("Duplicate prerequisite relationship");
            var next=new HashMap<String,List<String>>();
            for(var edge:active)next.computeIfAbsent(edge.dependentSkill(),key->new ArrayList<>()).add(edge.prerequisiteSkill());
            var pending=new ArrayDeque<String>();var visited=new HashSet<String>();pending.add(added.prerequisiteSkill());
            while(!pending.isEmpty()) {
                var current=pending.removeFirst();
                if(current.equals(added.dependentSkill()))throw new PrerequisiteCycleException("This prerequisite creates a cycle");
                if(visited.add(current))pending.addAll(next.getOrDefault(current,List.of()));
            }
            return;
        }
        if(active.contains(added))throw new IllegalArgumentException("Duplicate prerequisite skill-level pair");
        var next=new HashMap<String,List<String>>();
        for(var edge:active)if(edge.dependentLevel()!=null)next.computeIfAbsent(edge.from(),key->new ArrayList<>()).add(edge.to());
        var pending=new ArrayDeque<String>();var visited=new HashSet<String>();pending.add(added.to());
        while(!pending.isEmpty()) {
            var current=pending.removeFirst();
            if(current.equals(added.from()))throw new PrerequisiteCycleException("This exact prerequisite creates a cycle");
            if(visited.add(current))pending.addAll(next.getOrDefault(current,List.of()));
        }
    }
}
