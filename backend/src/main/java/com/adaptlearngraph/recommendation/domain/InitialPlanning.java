package com.adaptlearngraph.recommendation.domain;

import java.math.BigDecimal;
import java.util.*;

/** Frozen planning values. Eligible offers and gate definitions must come from versioned owner policies. */
public final class InitialPlanning {
    public enum InstructionLevel { FOUNDATIONAL, INTERMEDIATE, ADVANCED }
    public record Need(String skillId, boolean foundational) { public Need { RoleGap.text(skillId); } }
    public record Edge(String dependentSkillId,String prerequisiteSkillId,BigDecimal requiredScore) {
        public Edge { RoleGap.text(dependentSkillId); RoleGap.text(prerequisiteSkillId); RoleGap.unit(requiredScore); }
    }
    public record Offer(String moduleId,String title,String contentVersion,BigDecimal durationMinutes,BigDecimal priceVnd,
                        String skillId,InstructionLevel instructionLevel,int preference,boolean foundationalSuitable,
                        String suitabilityVersion,String reason) {
        public Offer {
            for(String v:List.of(moduleId,title,contentVersion,skillId,suitabilityVersion,reason)) RoleGap.text(v);
            Objects.requireNonNull(instructionLevel);
            if(durationMinutes==null || durationMinutes.signum()<=0 || priceVnd==null || priceVnd.signum()<=0 || preference<0)
                throw new IllegalArgumentException("Invalid provider metadata");
        }
    }
    public record GateDefinition(String moduleId,String dependentSkillId,String prerequisiteSkillId,
                                 String definitionId,String version,String internalGateId) {
        public GateDefinition { for(String v:List.of(moduleId,dependentSkillId,prerequisiteSkillId,definitionId,version)) RoleGap.text(v); }
    }
    public record Dependency(String moduleId,String dependentSkillId,String prerequisiteSkillId,String providerModuleId,
                             String definitionId,String version,String internalGateId) {}
    public record Problem(List<Need> needs,List<Edge> edges,List<Offer> offers,List<GateDefinition> gates,
                          Set<String> externallyReadySkills,Map<String,String> sourcePins) {
        public Problem {
            needs=List.copyOf(needs); edges=List.copyOf(edges); offers=List.copyOf(offers); gates=List.copyOf(gates);
            externallyReadySkills=Set.copyOf(externallyReadySkills); sourcePins=Map.copyOf(sourcePins);
        }
    }
    public record Module(String id,String title,String contentVersion,BigDecimal durationMinutes,BigDecimal priceVnd,
                         int ordinal,List<Offer> targets) { public Module { targets=List.copyOf(targets); } }
    public record Plan(List<Module> modules,List<Dependency> dependencies,List<String> diagnostics,Map<String,String> sourcePins) {
        public Plan { modules=List.copyOf(modules); dependencies=List.copyOf(dependencies); diagnostics=List.copyOf(diagnostics); sourcePins=Map.copyOf(sourcePins); }
        public boolean valid() { return diagnostics.isEmpty(); }
        public String contentHash(List<List<String>> overrides) {
            var content=new LinkedHashMap<String,Object>(); content.put("pins",sourcePins); content.put("overrides",overrides);
            content.put("modules",modules.stream().map(m->List.of(m.id(),m.contentVersion(),m.durationMinutes(),m.priceVnd(),m.ordinal(),
                    m.targets().stream().sorted(Comparator.comparing(Offer::skillId)).map(t->List.of(t.skillId(),t.instructionLevel(),
                            t.suitabilityVersion(),t.reason(),t.foundationalSuitable())).toList())).toList());
            content.put("dependencies",dependencies.stream().sorted(Comparator.comparing(Dependency::moduleId)
                    .thenComparing(Dependency::dependentSkillId).thenComparing(Dependency::prerequisiteSkillId))
                    .map(d->Arrays.asList(d.moduleId(),d.dependentSkillId(),d.prerequisiteSkillId(),d.providerModuleId(),
                            d.definitionId(),d.version(),d.internalGateId())).toList());
            return InitialIdentity.hash("revision",content);
        }
    }
    public static final Comparator<Offer> RANK=Comparator.comparingInt(Offer::preference)
            .thenComparing(Offer::durationMinutes).thenComparing(Offer::priceVnd).thenComparing(Offer::moduleId);
    private InitialPlanning() {}
}
