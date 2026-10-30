package com.adaptlearngraph.assessment.adaptive.calibration.application;

import com.adaptlearngraph.assessment.adaptive.calibration.application.CalibrationPorts.Grant;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.*;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

public final class PromotionPorts {
    private PromotionPorts() {}
    public record Command(Scope scope,UUID candidateId,String parameterHash,String modelConfigurationHash,String modelParameterHash,
                           long expectedRevision,UUID expectedParameterSetId,String idempotencyKey,String reason) {
        public Command {
            java.util.Objects.requireNonNull(scope); Calibration.id(candidateId); Calibration.hash(parameterHash);
            Calibration.hash(modelConfigurationHash); Calibration.hash(modelParameterHash);
            Calibration.require(expectedRevision>=0 && expectedRevision<Long.MAX_VALUE && (expectedRevision==0)==(expectedParameterSetId==null));
            if (expectedParameterSetId!=null) Calibration.id(expectedParameterSetId);
            Calibration.text(idempotencyKey); Calibration.require(idempotencyKey.length()<=200);
            Calibration.text(reason); Calibration.require(reason.length()<=1000);
        }
    }
    public record Selection(Scope scope,long revision,UUID parameterSetId,String parameterHash,UUID actorId,Instant selectedAt) {
        public Selection {
            java.util.Objects.requireNonNull(scope); Calibration.require(revision>0); Calibration.id(parameterSetId);
            Calibration.hash(parameterHash); Calibration.id(actorId); java.util.Objects.requireNonNull(selectedAt);
        }
    }
    public record Receipt(String requestHash,Selection outcome) {
        public Receipt { Calibration.hash(requestHash); java.util.Objects.requireNonNull(outcome); }
    }
    public interface Readiness {
        /** Trusted owner review/release/approved numerical policy and data rights. Hold relevant pin/permission locks until commit. */
        void requireOperational(Grant grant,Candidate candidate);
    }
    public interface Store {
        <T> T transaction(Scope scope,Supplier<T> work);
        Optional<Receipt> receipt(Grant grant,String key);
        Optional<Selection> effective(Scope scope);
        Candidate candidate(Scope scope,UUID id);
        void validatePins(Command command,Candidate candidate);
        Selection promote(Grant grant,Command command,Candidate candidate,String requestHash);
    }
    public interface UseCase { Selection promote(Command command); }
}
