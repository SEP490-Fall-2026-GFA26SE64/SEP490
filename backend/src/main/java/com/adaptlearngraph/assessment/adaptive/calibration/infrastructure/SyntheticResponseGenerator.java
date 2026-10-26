package com.adaptlearngraph.assessment.adaptive.calibration.infrastructure;

import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.*;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.CalibrationBudget;
import java.util.ArrayList;
import java.util.List;
import java.util.SplittableRandom;
import java.util.TreeMap;
import java.util.stream.Collectors;

/** Explicitly invoked file-only simulation. Subject tokens have no platform identity or learner history. */
public final class SyntheticResponseGenerator {
    public static final String VERSION="SPLITTABLE_RANDOM_BOXMULLER_COMPLETE_V1";
    public static final long SEED=20261022L;
    public record GeneratingItem(ItemPin pin,double a,double b,double c) {}
    public record Ability(String syntheticSubject,double theta) {}
    public record GeneratingSkill(String skillId,List<GeneratingItem> items,List<Ability> abilities) {}
    public record Generating(String origin,String generator,long seed,String population,List<GeneratingSkill> skills) {}
    public record Generated(Dataset dataset,Generating generating) {}
    public Generated generate(Bank bank,CalibrationJson json,CalibrationBudget budget) {
        var random=new SplittableRandom(SEED); var groups=new ArrayList<SkillResponses>(); var generation=new ArrayList<GeneratingSkill>();
        var skills=bank.items().stream().collect(Collectors.groupingBy(i->i.pin().skillId(),TreeMap::new,Collectors.toList()));
        for (var entry:skills.entrySet()) {
            var items=entry.getValue().stream().sorted(java.util.Comparator.comparing(i->i.pin().itemVersionId().toString())).toList();
            var parameters=new ArrayList<GeneratingItem>();
            for (Item item:items) parameters.add(new GeneratingItem(item.pin(),.7+1.1*random.nextDouble(),-2+4*random.nextDouble(),.25));
            var abilities=new ArrayList<Ability>(); var responses=new ArrayList<Subject>();
            for (int subject=0;subject<2000;subject++) {
                budget.check(); String token="synthetic-"+entry.getKey()+"-"+subject;
                double theta=StrictMath.sqrt(-2*StrictMath.log(1-random.nextDouble()))*StrictMath.cos(2*StrictMath.PI*random.nextDouble());
                abilities.add(new Ability(token,theta)); var options=new ArrayList<String>();
                for (int i=0;i<items.size();i++) {
                    var p=parameters.get(i); var item=items.get(i);
                    double probability=p.c()+(1-p.c())/(1+StrictMath.exp(-p.a()*(theta-p.b())));
                    options.add(random.nextDouble()<probability ? item.answer()
                            : item.optionIds().stream().filter(o->!o.equals(item.answer())).toList().get(random.nextInt(3)));
                }
                responses.add(new Subject(token,options));
            }
            generation.add(new GeneratingSkill(entry.getKey(),List.copyOf(parameters),List.copyOf(abilities)));
            groups.add(new SkillResponses(entry.getKey(),items.stream().map(i->i.pin().itemVersionId()).toList(),responses));
        }
        var generating=new Generating("SYNTHETIC",VERSION,SEED,"Independent per-skill N(0,1); generating a~U(.7,1.8),b~U(-2,2),c=.25; D=1",List.copyOf(generation));
        return new Generated(new Dataset(Origin.SYNTHETIC,VERSION,SEED,json.hash(generating),groups),generating);
    }
}
