package com.adaptlearngraph.assessment.adaptive.calibration.application;

import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.*;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

public final class CalibrationPorts {
    private CalibrationPorts() {}
    public enum Action { CALIBRATE, READ, PROMOTE }
    /** Owner-supplied trusted identity and exact bank/model grants. Never constructed from request principal fields. */
    public record Grant(UUID actorId, Scope scope) {
        public Grant { com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.id(actorId); java.util.Objects.requireNonNull(scope); }
    }
    public interface Authorization {
        /** All actions require the owner's trusted System Administrator permission, not legacy role aliases. */
        Grant require(Scope scope, Action action);
        /** Called inside the storage transaction; implementation must hold revocation-coordination locks until commit. */
        void recheck(Grant grant, Action action);
        /** Trusted current organization; no client organization/actor/role field is accepted by the HTTP adapter. */
        default Scope currentScope(UUID bankId,UUID modelId) { throw new Failure(Code.UNAUTHENTICATED); }
    }
    public interface InputSource {
        Input load(Grant grant, Request request);
        /** Recheck exact immutable model/content/data pins inside the completion transaction. */
        void revalidate(Grant grant, Request request, Input input);
    }
    public interface DatasetSource {
        /** Only a server-approved immutable reference; enforce grant, raw-byte/hash and preallocation size bounds. */
        Dataset load(Grant grant, String reference, String expectedHash);
    }
    public interface Encoding {
        String hash(Object value);
        String algorithmHash();
    }
    public interface Decoding { <T> T read(String body,Class<T> type); }
    public interface Store {
        <T> T transaction(Scope scope, Supplier<T> work);
        Optional<Run> find(Scope scope, UUID runId);
        Run reserve(Envelope envelope);
        Run claim(Scope scope, UUID runId, UUID workerToken);
        Run complete(Scope scope, UUID runId, UUID workerToken, Result result);
        Run fail(Scope scope, UUID runId, UUID workerToken, Code reason,java.util.Map<String,Object> diagnostics);
        Run recoverExpired(Scope scope, UUID runId);
        Run cancel(Scope scope, UUID runId);
        Candidate candidate(Scope scope, UUID candidateId);
        /** Global one-worker DB session lock, outside long transactions. No-op leases are not valid implementations. */
        WorkerLease acquireWorker();
    }
    public interface WorkerLease extends AutoCloseable { @Override void close(); }
    public interface UseCase {
        Run execute(Request request);
        Run read(Scope scope, UUID runId);
        Candidate candidate(Scope scope, UUID candidateId);
        Run recoverExpired(Scope scope, UUID runId);
        Run cancel(Scope scope, UUID runId);
    }
}
