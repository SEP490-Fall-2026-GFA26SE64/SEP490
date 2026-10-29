package com.adaptlearngraph.recommendation.domain;

import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import java.math.BigDecimal;
import java.util.*;

/** Whole-path lexical objective; amounts are counted once per selected module. */
public final class InitialPlanObjective {
    public static Quality quality(List<InitialPlanning.Module> modules) {
        int supporting=0,second=0,first=0;var duration=BigDecimal.ZERO;var price=BigDecimal.ZERO;
        var benefits=new TreeSet<String>();var supportingCoverage=new HashSet<String>();
        for(var module:modules) {
            duration=duration.add(module.durationMinutes());price=price.add(module.priceVnd());
            for(var offer:module.targets()) {
                if(offer.coverageRole()==CoverageRole.COVERAGE) {
                    if(offer.teachingFocus()==TeachingFocus.SUPPORTING){supporting++;supportingCoverage.add(offer.skillId());}
                    if(offer.preference()==2)second++;else if(offer.preference()==1)first++;
                }else if(offer.teachingFocus()==TeachingFocus.SUPPORTING && offer.preferredDifficulty()!=null)benefits.add(offer.skillId());
            }
        }
        benefits.removeAll(supportingCoverage);
        return new Quality(supporting,second,first,duration,price,List.copyOf(benefits),modules.size());
    }
    public static int compare(Plan left,Plan right) {
        var a=left.quality();var b=right.quality();
        int value=Integer.compare(a.supportingFallbacks(),b.supportingFallbacks());
        if(value==0)value=Integer.compare(a.secondFallbacks(),b.secondFallbacks());
        if(value==0)value=Integer.compare(a.firstFallbacks(),b.firstFallbacks());
        if(value==0)value=a.durationMinutes().compareTo(b.durationMinutes());
        if(value==0)value=a.priceVnd().compareTo(b.priceVnd());
        if(value==0)value=Integer.compare(b.supportingBeneficiaries().size(),a.supportingBeneficiaries().size());
        if(value==0)value=Integer.compare(a.moduleCount(),b.moduleCount());
        if(value==0)value=lexical(ids(left),ids(right));
        if(value==0)value=lexical(assignments(left),assignments(right));return value;
    }
    private static List<String> ids(Plan plan){return plan.modules().stream().map(InitialPlanning.Module::id).sorted().toList();}
    private static List<String> assignments(Plan plan){return plan.modules().stream().flatMap(m->m.targets().stream())
            .filter(t->t.coverageRole()==CoverageRole.COVERAGE).map(t->t.skillId()+"\u0000"+t.moduleId()).sorted().toList();}
    private static int lexical(List<String> a,List<String> b) {
        for(int i=0;i<Math.min(a.size(),b.size());i++){int v=a.get(i).compareTo(b.get(i));if(v!=0)return v;}
        return Integer.compare(a.size(),b.size());
    }
    static String contentHash(Plan plan,List<List<String>> overrides) {
        var content=new TreeMap<String,Object>();content.put("format",2);content.put("pins",plan.sourcePins());content.put("overrides",overrides);
        content.put("warnings",plan.warnings());
        content.put("needs",plan.needs().stream().sorted(Comparator.comparing(Need::skillId))
                .map(n->Arrays.asList(n.skillId(),n.mastery(),n.unknownReason())).toList());
        content.put("modules",plan.modules().stream().map(m->List.of(m.id(),m.contentVersion(),m.durationMinutes(),m.priceVnd(),m.ordinal(),
                m.targets().stream().sorted(Comparator.comparing(Offer::skillId)).map(t->Arrays.asList(t.skillId(),t.teachingFocus(),t.difficultyLevel(),
                        t.preferredDifficulty(),t.coverageRole(),t.preference(),t.suitabilityVersion(),t.reason(),t.expertAttention(),t.attentionReason())).toList())).toList());
        content.put("dependencies",plan.dependencies().stream().sorted(Comparator.comparing(Dependency::moduleId).thenComparing(Dependency::dependentSkillId)
                .thenComparing(Dependency::prerequisiteSkillId)).map(d->Arrays.asList(d.moduleId(),d.dependentSkillId(),d.prerequisiteSkillId(),
                        d.providerModuleId(),d.definitionId(),d.version(),d.internalGateId())).toList());
        var q=plan.quality();content.put("quality",List.of(q.supportingFallbacks(),q.secondFallbacks(),q.firstFallbacks(),q.durationMinutes(),q.priceVnd(),q.supportingBeneficiaries(),q.moduleCount()));
        // Execution counts/scope differ when revalidating an unchanged revision; they are immutable run metadata, not approved learning content.
        return InitialIdentity.hash("revision-content-v2",content);
    }
    private InitialPlanObjective(){}
}
