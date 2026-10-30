package com.adaptlearngraph.assessment.adaptive.calibration.domain;

/** Bounded generalized M-step. Every accepted Newton/gradient step increases the expected log likelihood. */
final class CalibrationMaximization {
    record Parameters(double a,double b) {}
    static Parameters fit(double a,double b,double[] totals,double[] correct,double[] theta,
                          CalibrationPolicy p,CalibrationBudget budget) {
        double count=java.util.Arrays.stream(totals).sum();
        for (int iteration=0;iteration<p.maxItemSteps();iteration++) {
            double[] v=evaluate(a,b,totals,correct,theta,p.fixedC(),budget);
            double aa=-v[3],ab=-v[4],bb=-v[5],det=aa*bb-ab*ab;
            double da,db;
            if (aa>0 && bb>0 && det>1e-12) { da=(bb*v[1]-ab*v[2])/det; db=(aa*v[2]-ab*v[1])/det; }
            else { da=v[1]/count; db=v[2]/count; }
            if (da*v[1]+db*v[2]<=0) { da=v[1]/count; db=v[2]/count; }
            double scale=1; boolean accepted=false; double nextA=a,nextB=b;
            for (int backtrack=0;backtrack<p.maxBacktracks();backtrack++) {
                nextA=clamp(a+scale*da,p.minA(),p.maxA()); nextB=clamp(b+scale*db,p.minB(),p.maxB());
                double q=evaluate(nextA,nextB,totals,correct,theta,p.fixedC(),budget)[0];
                if (q>=v[0]) { accepted=true; break; }
                scale*=.5;
            }
            double change=StrictMath.max(StrictMath.abs(nextA-a),StrictMath.abs(nextB-b));
            if (!accepted) {
                if (StrictMath.max(StrictMath.abs(v[1]),StrictMath.abs(v[2]))/count<1e-6) return new Parameters(a,b);
                throw new Calibration.Failure(Calibration.Code.NUMERICAL_FAILURE);
            }
            a=nextA; b=nextB;
            if (change<p.innerTolerance()) break;
        }
        return new Parameters(a,b);
    }
    private static double clamp(double x,double low,double high) { return StrictMath.max(low,StrictMath.min(high,x)); }
    private static double[] evaluate(double a,double b,double[] totals,double[] correct,double[] theta,double c,CalibrationBudget budget) {
        budget.evaluation(); double[] v=new double[6];
        for (int k=0;k<theta.length;k++) {
            double x=theta[k]-b,prob=CalibrationExpectation.probability(a,b,c,theta[k]);
            double s=(prob-c)/(1-c),first=(1-c)*s*(1-s),second=first*(1-2*s);
            double yes=correct[k],no=StrictMath.max(0,totals[k]-yes);
            double score=yes/prob-no/(1-prob);
            double g=first*score,h=second*score-first*first*(yes/(prob*prob)+no/((1-prob)*(1-prob)));
            v[0]+=yes*StrictMath.log(prob)+no*StrictMath.log1p(-prob);
            v[1]+=g*x; v[2]-=g*a; v[3]+=h*x*x; v[4]+=-h*x*a-g; v[5]+=h*a*a;
        }
        Calibration.finite(v); return v;
    }
}
