package com.adaptlearngraph.assessment.adaptive.calibration.application;

import com.adaptlearngraph.assessment.adaptive.calibration.application.CalibrationPorts.*;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.*;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.*;
import java.util.Map;
import java.util.UUID;

/** Explicit synchronous command, bounded single worker, short claim/completion transactions; no startup job. */
public final class CalibrationService implements UseCase {
    private final Authorization authorization;
    private final InputSource inputs;
    private final Store store;
    private final CalibrationEnginePort engine;
    private final Encoding encoding;
    private final CalibrationPolicy policy=CalibrationPolicy.syntheticV1();
    public CalibrationService(Authorization authorization,InputSource inputs,Store store,CalibrationEnginePort engine,Encoding encoding) {
        this.authorization=java.util.Objects.requireNonNull(authorization); this.inputs=java.util.Objects.requireNonNull(inputs);
        this.store=java.util.Objects.requireNonNull(store); this.engine=java.util.Objects.requireNonNull(engine); this.encoding=java.util.Objects.requireNonNull(encoding);
    }
    @Override public Run execute(Request request) {
        var grant=authorization.require(request.scope(),Action.CALIBRATE);
        if (!grant.scope().equals(request.scope())) throw new Failure(Code.FORBIDDEN);
        Calibration.require(request.algorithmHash().equals(encoding.algorithmHash()));
        var existing=store.transaction(request.scope(),()->{
            authorization.recheck(grant,Action.CALIBRATE);
            var found=store.find(request.scope(),request.runId()); found.ifPresent(run->sameRequest(grant,request,run)); return found;
        });
        if (existing.isPresent() && existing.get().status()!=Status.PENDING) return existing.get();
        var budget=new CalibrationBudget(policy);
        // Bound expensive dataset parsing/preflight as well as fitting across all application instances.
        try (var lease=store.acquireWorker()) {
        Input input=inputs.load(grant,request); budget.check();
        Calibration.require(input.bank().source().equals(request.source()) && input.datasetHash().equals(request.datasetHash())
                && input.modelConfigurationHash().equals(request.modelConfigurationHash()) && input.modelParameterHash().equals(request.modelParameterHash())
                && input.dataset().origin()==Origin.SYNTHETIC && encoding.hash(input.dataset()).equals(request.datasetHash()));
        var envelope=new Envelope(1,grant.actorId(),request,input.bank().pins(),input.dataset().origin(),input.dataset().generatingHash(),input.dataset().seed(),input.modelPin());
        UUID worker=UUID.randomUUID();
            Run claimed=store.transaction(request.scope(),()->{
                authorization.recheck(grant,Action.CALIBRATE); inputs.revalidate(grant,request,input);
                Run run=store.find(request.scope(),request.runId()).orElseGet(()->store.reserve(envelope));
                sameRequest(grant,request,run);
                if (!encoding.hash(run.envelope()).equals(encoding.hash(envelope))) throw new Failure(Code.CONFLICT);
                return run.status()==Status.PENDING ? store.claim(request.scope(),request.runId(),worker) : run;
            });
            if (claimed.status()!=Status.RUNNING || !worker.toString().equals(claimed.diagnostics().get("workerToken"))) return claimed;
            try {
                budget.cancellation(()->store.transaction(request.scope(),()->{
                    Run state=store.find(request.scope(),request.runId()).orElseThrow(()->new Failure(Code.NOT_FOUND));
                    return state.status()!=Status.RUNNING || Boolean.TRUE.equals(state.diagnostics().get("cancelRequested"));
                }));
                Result result=engine.fit(input.bank(),input.dataset(),input.datasetHash(),encoding.algorithmHash(),budget);
                CalibrationAdmission.validate(envelope,result,policy); budget.check();
                return store.transaction(request.scope(),()->{
                    authorization.recheck(grant,Action.CALIBRATE); inputs.revalidate(grant,request,input); budget.check();
                    return store.complete(request.scope(),request.runId(),worker,result);
                });
            } catch (RuntimeException failure) {
                // A completion may have committed before connection failure: fail() must reconcile terminal state first.
                Code reason=failure instanceof Failure known ? known.code() : Code.DEPENDENCY_UNAVAILABLE;
                Map<String,Object> diagnostics=Map.of("objectiveEvaluations",budget.evaluations(),
                        "failureDetails",failure instanceof Failure known ? known.details() : Map.of());
                return store.transaction(request.scope(),()->store.fail(request.scope(),request.runId(),worker,reason,diagnostics));
            }
        }
    }
    @Override public Run read(Scope scope,UUID runId) {
        var grant=authorization.require(scope,Action.READ);
        if (!grant.scope().equals(scope)) throw new Failure(Code.FORBIDDEN);
        return store.transaction(scope,()->{
            authorization.recheck(grant,Action.READ);
            return store.find(scope,runId).orElseThrow(()->new Failure(Code.NOT_FOUND));
        });
    }
    @Override public Candidate candidate(Scope scope,UUID id) {
        var grant=authorization.require(scope,Action.READ);
        if (!grant.scope().equals(scope)) throw new Failure(Code.FORBIDDEN);
        return store.transaction(scope,()->{ authorization.recheck(grant,Action.READ); return store.candidate(scope,id); });
    }
    @Override public Run recoverExpired(Scope scope,UUID runId) {
        var grant=authorization.require(scope,Action.CALIBRATE);
        if (!grant.scope().equals(scope)) throw new Failure(Code.FORBIDDEN);
        try (var lease=store.acquireWorker()) {
            return store.transaction(scope,()->{ authorization.recheck(grant,Action.CALIBRATE); return store.recoverExpired(scope,runId); });
        }
    }
    @Override public Run cancel(Scope scope,UUID runId) {
        var grant=authorization.require(scope,Action.CALIBRATE);
        if (!grant.scope().equals(scope)) throw new Failure(Code.FORBIDDEN);
        return store.transaction(scope,()->{ authorization.recheck(grant,Action.CALIBRATE); return store.cancel(scope,runId); });
    }
    private void sameRequest(Grant grant,Request request,Run run) {
        if (!run.envelope().actorId().equals(grant.actorId()) || !encoding.hash(run.envelope().request()).equals(encoding.hash(request))) throw new Failure(Code.CONFLICT);
    }
}
