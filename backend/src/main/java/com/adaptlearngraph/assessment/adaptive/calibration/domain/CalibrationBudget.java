package com.adaptlearngraph.assessment.adaptive.calibration.domain;

import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.Code;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.Failure;

/** Per-run monotonic resource budget; no database clock or learner timer is changed. */
public final class CalibrationBudget {
    private final long deadline;
    private final long maximumEvaluations;
    private long evaluations;
    private java.util.function.BooleanSupplier cancellation=()->false;
    private long nextCancellationCheck;
    public CalibrationBudget(CalibrationPolicy policy) {
        deadline = System.nanoTime() + policy.maximumSeconds() * 1_000_000_000L;
        maximumEvaluations = policy.maximumEvaluations();
        nextCancellationCheck=System.nanoTime();
    }
    public void check() {
        if (Thread.currentThread().isInterrupted()) throw new Failure(Code.CANCELLED);
        long now=System.nanoTime();
        if (now - deadline >= 0) throw new Failure(Code.TIMEOUT);
        if (now-nextCancellationCheck>=0) {
            nextCancellationCheck=now+500_000_000L;
            if (cancellation.getAsBoolean()) throw new Failure(Code.CANCELLED);
        }
    }
    public void evaluation() {
        check();
        if (++evaluations > maximumEvaluations) throw new Failure(Code.RESOURCE_LIMIT);
    }
    public long evaluations() { return evaluations; }
    public void cancellation(java.util.function.BooleanSupplier probe) { cancellation=java.util.Objects.requireNonNull(probe); }
}
