package com.adaptlearngraph.services;


import com.adaptlearngraph.entities.Calibration;
import com.adaptlearngraph.entities.CalibrationBudget;
import com.adaptlearngraph.entities.CalibrationPolicy;
/** Exact response-pattern aggregation for the selected complete nine-item unidimensional design. */
public final class CalibrationExpectation {
    record Pattern(String answers,int count){}
    record Step(double logLikelihood, double[] totals, double[][] correct) {}
    static double[] grid(CalibrationPolicy p) {
        double[] theta = new double[p.quadraturePoints()];
        for (int k=0;k<theta.length;k++) theta[k]=p.thetaLower()+k*(p.thetaUpper()-p.thetaLower())/(theta.length-1);
        return theta;
    }
    static double[] weights(double[] theta) {
        double[] weights=new double[theta.length]; double sum=0;
        for (int k=0;k<theta.length;k++) { weights[k]=StrictMath.exp(-theta[k]*theta[k]/2); sum+=weights[k]; }
        for (int k=0;k<theta.length;k++) weights[k]/=sum;
        return weights;
    }
    static double probability(double a,double b,double c,double theta) {
        double z=a*(theta-b);
        double s=z>=0 ? 1/(1+StrictMath.exp(-z)) : StrictMath.exp(z)/(1+StrictMath.exp(z));
        return c+(1-c)*s;
    }
    static Step compute(int[] patterns,double[] a,double[] b,double c,double[] theta,double[] weights,CalibrationBudget budget) {
        int size=a.length, points=theta.length;
        double[][] yes=new double[size][points],no=new double[size][points];
        for (int i=0;i<size;i++) for (int k=0;k<points;k++) {
            double p=probability(a[i],b[i],c,theta[k]);
            yes[i][k]=StrictMath.log(p); no[i][k]=StrictMath.log1p(-p);
        }
        double[] totals=new double[points], log=new double[points];
        double[][] correct=new double[size][points]; double ll=0;
        for (int mask=0;mask<patterns.length;mask++) {
            if (patterns[mask]==0) continue;
            budget.check(); double max=Double.NEGATIVE_INFINITY;
            for (int k=0;k<points;k++) {
                log[k]=StrictMath.log(weights[k]);
                for (int i=0;i<size;i++) log[k]+=((mask & (1<<i))!=0 ? yes[i][k] : no[i][k]);
                max=StrictMath.max(max,log[k]);
            }
            double sum=0;
            for (int k=0;k<points;k++) sum+=StrictMath.exp(log[k]-max);
            ll+=patterns[mask]*(max+StrictMath.log(sum));
            for (int k=0;k<points;k++) {
                double expected=patterns[mask]*StrictMath.exp(log[k]-max)/sum;
                totals[k]+=expected;
                for (int i=0;i<size;i++) if ((mask & (1<<i))!=0) correct[i][k]+=expected;
            }
        }
        Calibration.finite(ll);
        return new Step(ll,totals,correct);
    }
    static Step compute(java.util.List<Pattern> patterns,double[] a,double[] b,double c,double[] theta,double[] weights,CalibrationBudget budget){
        int size=a.length,points=theta.length;
        double[][] yes=new double[size][points],no=new double[size][points],correct=new double[size][points];
        for(int i=0;i<size;i++)for(int k=0;k<points;k++){
            budget.check();double p=probability(a[i],b[i],c,theta[k]);
            if(!Double.isFinite(p) || p<=0 || p>=1)throw new Calibration.Failure(Calibration.Code.NUMERICAL_FAILURE);
            yes[i][k]=StrictMath.log(p);no[i][k]=StrictMath.log1p(-p);
        }
        double[] totals=new double[points],log=new double[points];double ll=0;
        for(var pattern:patterns){
            budget.check();Calibration.require(pattern.answers().length()==size && pattern.count()>0);double max=Double.NEGATIVE_INFINITY;
            for(int k=0;k<points;k++){
                log[k]=StrictMath.log(weights[k]);
                for(int i=0;i<size;i++){budget.check();log[k]+=pattern.answers().charAt(i)=='1'?yes[i][k]:no[i][k];}
                max=StrictMath.max(max,log[k]);
            }
            double sum=0;for(int k=0;k<points;k++)sum+=StrictMath.exp(log[k]-max);
            ll+=pattern.count()*(max+StrictMath.log(sum));
            for(int k=0;k<points;k++){
                double expected=pattern.count()*StrictMath.exp(log[k]-max)/sum;totals[k]+=expected;
                for(int i=0;i<size;i++)if(pattern.answers().charAt(i)=='1')correct[i][k]+=expected;
            }
        }
        Calibration.finite(ll);return new Step(ll,totals,correct);
    }
}
