package com.adaptlearngraph.assessment.adaptive.calibration.application;

import com.adaptlearngraph.assessment.adaptive.calibration.application.CalibrationPorts.*;
import com.adaptlearngraph.assessment.adaptive.calibration.application.PromotionPorts.*;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.*;
import java.util.Map;
import java.util.Objects;

/** Trusted Admin only, explicit compare-and-set and authorized exact replay; no implicit promotion. */
public final class PromotionService implements PromotionPorts.UseCase {
    private final Authorization authorization;
    private final PromotionPorts.Store store;
    private final Readiness readiness;
    private final Encoding encoding;
    public PromotionService(Authorization authorization,PromotionPorts.Store store,Readiness readiness,Encoding encoding) {
        this.authorization=Objects.requireNonNull(authorization); this.store=Objects.requireNonNull(store);
        this.readiness=Objects.requireNonNull(readiness); this.encoding=Objects.requireNonNull(encoding);
    }
    @Override public Selection promote(Command command) {
        var grant=authorization.require(command.scope(),Action.PROMOTE);
        if (!grant.scope().equals(command.scope())) throw new Failure(Code.FORBIDDEN);
        String hash=encoding.hash(Map.of("operation","IRT_PROMOTE_V1","command",command));
        return store.transaction(command.scope(),()->{
            authorization.recheck(grant,Action.PROMOTE);
            var receipt=store.receipt(grant,command.idempotencyKey());
            if (receipt.isPresent()) {
                if (!receipt.get().requestHash().equals(hash)) throw new Failure(Code.CONFLICT);
                return receipt.get().outcome(); // Original selection, even after a later real promotion.
            }
            var selected=store.effective(command.scope());
            if (selected.map(Selection::revision).orElse(0L)!=command.expectedRevision()
                    || !Objects.equals(selected.map(Selection::parameterSetId).orElse(null),command.expectedParameterSetId())) throw new Failure(Code.CONFLICT);
            Candidate candidate=store.candidate(command.scope(),command.candidateId());
            if (!candidate.status().equals("CANDIDATE") || !candidate.source().equals("CALIBRATED")
                    || !candidate.parameterHash().equals(command.parameterHash())) throw new Failure(Code.CONFLICT);
            // CALIBRATED never hides synthetic origin. No owner adapter can bypass this gate.
            if (candidate.result().origin()!=Origin.ACTUAL_PILOT || candidate.envelope().origin()!=Origin.ACTUAL_PILOT) throw new Failure(Code.NOT_READY);
            if (!candidate.envelope().request().scope().equals(command.scope())
                    || !candidate.envelope().request().modelConfigurationHash().equals(command.modelConfigurationHash())
                    || !candidate.envelope().request().modelParameterHash().equals(command.modelParameterHash())) throw new Failure(Code.CONFLICT);
            store.validatePins(command,candidate); readiness.requireOperational(grant,candidate);
            return store.promote(grant,command,candidate,hash);
        });
    }
}
