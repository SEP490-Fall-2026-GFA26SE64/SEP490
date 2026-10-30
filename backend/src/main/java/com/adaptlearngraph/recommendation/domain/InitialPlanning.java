package com.adaptlearngraph.recommendation.domain;

import java.math.BigDecimal;
import java.util.*;

/** Frozen planning values. Eligible offers and gate definitions must come from versioned owner policies. */
public final class InitialPlanning {
    /** Historical format1 only. Never translate these labels into the v0.11 teaching contract. */
    public enum InstructionLevel { FOUNDATIONAL, INTERMEDIATE, ADVANCED }
    public enum TeachingFocus { PRIMARY, SUPPORTING, INCIDENTAL }
    public enum Difficulty { LOW, MEDIUM, HIGH }
    public enum CoverageRole { COVERAGE, ANCILLARY }
    public record Need(String skillId,boolean foundational,BigDecimal mastery,String unknownReason) {
        public Need {
            RoleGap.text(skillId);
            if(mastery!=null){RoleGap.unit(mastery);if(unknownReason!=null)throw new IllegalArgumentException("Ambiguous need evidence");}
        }
        public Need(String skillId,boolean foundational){this(skillId,foundational,null,null);}
    }
    public record Edge(String dependentSkillId,String prerequisiteSkillId,BigDecimal requiredScore) {
        public Edge { RoleGap.text(dependentSkillId); RoleGap.text(prerequisiteSkillId); RoleGap.unit(requiredScore); }
    }
    public record Offer(String moduleId,String title,String contentVersion,BigDecimal durationMinutes,BigDecimal priceVnd,
                        String skillId,InstructionLevel instructionLevel,int preference,boolean foundationalSuitable,
                        String suitabilityVersion,String reason,TeachingFocus teachingFocus,Difficulty difficultyLevel,
                        Difficulty preferredDifficulty,CoverageRole coverageRole,Boolean expertAttention,String attentionReason) {
        public Offer {
            for(String v:List.of(moduleId,title,contentVersion,skillId,suitabilityVersion,reason)) RoleGap.text(v);
            if(instructionLevel==null) {
                Objects.requireNonNull(teachingFocus);Objects.requireNonNull(difficultyLevel);Objects.requireNonNull(coverageRole);
                if(preference>2 || expertAttention==null || expertAttention && (attentionReason==null || attentionReason.isBlank()))
                    throw new IllegalArgumentException("Invalid teaching suitability");
                if(coverageRole==CoverageRole.COVERAGE && (preferredDifficulty==null || teachingFocus==TeachingFocus.INCIDENTAL))
                    throw new IllegalArgumentException("Invalid coverage assignment");
            }else if(teachingFocus!=null || difficultyLevel!=null)throw new IllegalArgumentException("Mixed teaching formats");
            if(durationMinutes==null || durationMinutes.signum()<=0 || priceVnd==null || priceVnd.signum()<=0 || preference<0)
                throw new IllegalArgumentException("Invalid provider metadata");
        }
        public Offer(String moduleId,String title,String contentVersion,BigDecimal durationMinutes,BigDecimal priceVnd,
                     String skillId,InstructionLevel instructionLevel,int preference,boolean foundationalSuitable,String suitabilityVersion,String reason) {
            this(moduleId,title,contentVersion,durationMinutes,priceVnd,skillId,instructionLevel,preference,foundationalSuitable,
                    suitabilityVersion,reason,null,null,null,null,null,null);
        }
        public boolean canCover(){return teachingFocus!=null && teachingFocus!=TeachingFocus.INCIDENTAL && preferredDifficulty!=null;}
        public Offer assigned(boolean coverage) {
            boolean attention=coverage && (teachingFocus==TeachingFocus.SUPPORTING || preference>0);
            String note=attention?(teachingFocus==TeachingFocus.SUPPORTING?"SUPPORTING_COVERAGE_FALLBACK":"DIFFICULTY_FALLBACK")
                    +":"+preferredDifficulty+"->"+difficultyLevel:null;
            return new Offer(moduleId,title,contentVersion,durationMinutes,priceVnd,skillId,null,preference,foundationalSuitable,
                    suitabilityVersion,reason,teachingFocus,difficultyLevel,preferredDifficulty,
                    coverage?CoverageRole.COVERAGE:CoverageRole.ANCILLARY,attention,note);
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
    public record Quality(int supportingFallbacks,int secondFallbacks,int firstFallbacks,BigDecimal durationMinutes,
                          BigDecimal priceVnd,List<String> supportingBeneficiaries,int moduleCount) {
        public Quality { supportingBeneficiaries=List.copyOf(supportingBeneficiaries); }
    }
    public record Search(String scope,boolean complete,String optimality,long visitedStates) {}
    public record Plan(List<Module> modules,List<Dependency> dependencies,List<String> diagnostics,Map<String,String> sourcePins,
                       Integer formatVersion,List<String> warnings,Quality quality,Search search,List<Need> needs) {
        public Plan {
            modules=List.copyOf(modules);dependencies=List.copyOf(dependencies);diagnostics=List.copyOf(diagnostics);sourcePins=Map.copyOf(sourcePins);
            warnings=warnings==null?List.of():List.copyOf(warnings);
            needs=needs==null?List.of():List.copyOf(needs);
            if(formatVersion!=null && formatVersion!=2)throw new IllegalArgumentException("Unsupported plan format");
            if(formatVersion!=null)Objects.requireNonNull(quality);
        }
        public Plan(List<Module> modules,List<Dependency> dependencies,List<String> diagnostics,Map<String,String> sourcePins) {
            this(modules,dependencies,diagnostics,sourcePins,null,List.of(),null,null,List.of());
        }
        public boolean valid() {
            return diagnostics.isEmpty() && (search==null || search.complete()
                    && (!"GENERATION".equals(search.scope()) || "PROVEN".equals(search.optimality())));
        }
        public Plan searched(Search value){return new Plan(modules,dependencies,diagnostics,sourcePins,formatVersion,warnings,quality,value,needs);}
        public String contentHash(List<List<String>> overrides) {
            if(formatVersion!=null)return InitialPlanObjective.contentHash(this,overrides);
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
