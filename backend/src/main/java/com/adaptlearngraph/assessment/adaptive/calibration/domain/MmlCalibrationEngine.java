package com.adaptlearngraph.assessment.adaptive.calibration.domain;

import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.*;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

/** Selected synthetic fixed-lower-asymptote MML/EM. Fitting never sees generating a/b/theta. */
public final class MmlCalibrationEngine {
    private final CalibrationPolicy policy;
    public MmlCalibrationEngine(CalibrationPolicy policy) { this.policy=java.util.Objects.requireNonNull(policy); }
    public Result fit(Bank bank,Dataset data,String datasetHash,String algorithmHash,CalibrationBudget budget) {
        Calibration.require(data.origin()==Origin.SYNTHETIC); // Actual pilot design/policy is deliberately unsupported until aligned.
        Map<String,List<Item>> bySkill=bank.items().stream().collect(Collectors.groupingBy(i->i.pin().skillId(),TreeMap::new,Collectors.toList()));
        var seen=new HashSet<String>(); var fits=new ArrayList<ItemFit>(); var summaries=new ArrayList<SkillFit>();
        long observations=0;
        for (SkillResponses responses:data.skills().stream().sorted(java.util.Comparator.comparing(SkillResponses::skillId)).toList()) {
            budget.check(); Calibration.require(seen.add(responses.skillId()) && bySkill.containsKey(responses.skillId()));
            List<Item> items=bySkill.get(responses.skillId()).stream().sorted(java.util.Comparator.comparing(i->i.pin().itemVersionId().toString())).toList();
            Calibration.require(responses.itemVersions().equals(items.stream().map(i->i.pin().itemVersionId()).toList()));
            int count=responses.subjects().size();
            Calibration.require(count>=policy.minimumSubjects() && count<=policy.maximumSubjects());
            observations+=(long)count*items.size();
            if (observations>policy.maximumObservations()) throw new Failure(Code.RESOURCE_LIMIT);
            int[] patterns=new int[1<<items.size()],correct=new int[items.size()]; var subjects=new HashSet<String>();
            for (Subject subject:responses.subjects()) {
                budget.check(); Calibration.require(subjects.add(subject.token()) && subject.options().size()==items.size()); int mask=0;
                for (int i=0;i<items.size();i++) {
                    String option=subject.options().get(i); Calibration.require(items.get(i).optionIds().contains(option));
                    if (items.get(i).answer().equals(option)) { mask|=1<<i; correct[i]++; }
                }
                patterns[mask]++;
            }
            for (int c:correct) if (c<policy.minimumCorrectAndWrong() || count-c<policy.minimumCorrectAndWrong()) throw new Failure(Code.DEGENERATE_ITEM);
            try { solve(items,count,patterns,correct,fits,summaries,budget); }
            catch (Failure failure) {
                var details=new TreeMap<String,Object>(failure.details()); details.put("skillId",responses.skillId());
                details.put("objectiveEvaluations",budget.evaluations()); throw new Failure(failure.code(),details);
            }
        }
        Calibration.require(seen.equals(bySkill.keySet()));
        return new Result(data.origin(),policy.algorithm(),algorithmHash,datasetHash,data.generatingHash(),data.seed(),fits,summaries,budget.evaluations());
    }
    private void solve(List<Item> items,int count,int[] patterns,int[] correct,List<ItemFit> fits,List<SkillFit> summaries,CalibrationBudget budget) {
        double[] theta=CalibrationExpectation.grid(policy),weights=CalibrationExpectation.weights(theta);
        double[] a=new double[items.size()],b=new double[items.size()]; Arrays.fill(a,1);
        var expected=CalibrationExpectation.compute(patterns,a,b,policy.fixedC(),theta,weights,budget);
        double initial=expected.logLikelihood(),relative=Double.MAX_VALUE,change=Double.MAX_VALUE; int stable=0,iteration=0;
        for (iteration=1;iteration<=policy.maxEmIterations();iteration++) {
            change=0;
            for (int i=0;i<items.size();i++) {
                var next=CalibrationMaximization.fit(a[i],b[i],expected.totals(),expected.correct()[i],theta,policy,budget);
                change=StrictMath.max(change,StrictMath.max(StrictMath.abs(a[i]-next.a()),StrictMath.abs(b[i]-next.b())));
                a[i]=next.a(); b[i]=next.b();
            }
            var next=CalibrationExpectation.compute(patterns,a,b,policy.fixedC(),theta,weights,budget);
            double delta=next.logLikelihood()-expected.logLikelihood();
            if (delta < -policy.likelihoodDecreaseTolerance()) throw new Failure(Code.NUMERICAL_FAILURE);
            relative=StrictMath.abs(delta)/(1+StrictMath.abs(expected.logLikelihood())); expected=next;
            stable=relative<=policy.relativeTolerance() && change<=policy.parameterTolerance() ? stable+1 : 0;
            if (stable>=policy.stableIterations()) break;
        }
        if (stable<policy.stableIterations()) throw new Failure(Code.NON_CONVERGENCE,Map.of("iterations",policy.maxEmIterations(),"relativeChange",relative,"parameterChange",change));
        for (int i=0;i<items.size();i++) {
            if (a[i]-policy.minA()<=policy.boundaryTolerance() || policy.maxA()-a[i]<=policy.boundaryTolerance()
                    || b[i]-policy.minB()<=policy.boundaryTolerance() || policy.maxB()-b[i]<=policy.boundaryTolerance()) throw new Failure(Code.BOUNDARY,
                            Map.of("itemVersionId",items.get(i).pin().itemVersionId().toString(),"iterations",iteration));
            double predicted=0;
            for (int k=0;k<theta.length;k++) predicted+=weights[k]*CalibrationExpectation.probability(a[i],b[i],policy.fixedC(),theta[k]);
            double empirical=(double)correct[i]/count;
            fits.add(new ItemFit(items.get(i).pin(),a[i],b[i],policy.fixedC(),count,correct[i],empirical,predicted,
                    empirical-predicted,"UNAVAILABLE_NOT_VALIDATED",false));
        }
        summaries.add(new SkillFit(items.getFirst().pin().skillId(),count,iteration,initial,expected.logLikelihood(),relative,change,true));
    }
}
