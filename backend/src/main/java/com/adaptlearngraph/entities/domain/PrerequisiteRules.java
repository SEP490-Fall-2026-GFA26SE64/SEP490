package com.adaptlearngraph.entities.domain;

import com.adaptlearngraph.exception.PrerequisiteCycleException;
import java.util.*;

public final class PrerequisiteRules {
    private PrerequisiteRules() {}
    public record Pair(String dependentSkill,KnowledgeLevel dependentLevel,String prerequisiteSkill,KnowledgeLevel prerequisiteLevel) {
        public Pair {
            Objects.requireNonNull(dependentSkill);Objects.requireNonNull(dependentLevel);
            Objects.requireNonNull(prerequisiteSkill);Objects.requireNonNull(prerequisiteLevel);
            if(dependentSkill.equals(prerequisiteSkill) && dependentLevel==prerequisiteLevel)
                throw new IllegalArgumentException("A requirement cannot require itself");
        }
        String from(){return dependentSkill+"\n"+dependentLevel;}
        String to(){return prerequisiteSkill+"\n"+prerequisiteLevel;}
    }
    public static void assertAddition(List<Pair> active,Pair added) {
        if(active.contains(added))throw new IllegalArgumentException("Duplicate prerequisite skill-level pair");
        var next=new HashMap<String,List<String>>();
        for(var edge:active)next.computeIfAbsent(edge.from(),key->new ArrayList<>()).add(edge.to());
        var pending=new ArrayDeque<String>();var visited=new HashSet<String>();pending.add(added.to());
        while(!pending.isEmpty()) {
            var current=pending.removeFirst();
            if(current.equals(added.from()))throw new PrerequisiteCycleException("This exact prerequisite creates a cycle");
            if(visited.add(current))pending.addAll(next.getOrDefault(current,List.of()));
        }
    }
}
