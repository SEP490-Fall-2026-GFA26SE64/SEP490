package com.adaptlearngraph.assessment.adaptive.attempt.application.port.out;

import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt;
import com.adaptlearngraph.assessment.adaptive.psychometrics.AdaptiveItemSelector.Outcome;
import java.time.Instant;

/** B7 integration boundary, implemented only behind the explicit finalization gate.
 * Both methods run inside the owned B3 transaction. Caller saves returned next-revision header
 * and command receipt. Implementations must never open/nest transactions or expose protected data.
 */
public interface AdaptiveAttemptFinalizationPort {
    /** Submit accepted history only; reobserve DB time after estimation. Deadline callers auto-finalize.
     * Before deadline, insufficient evidence is a client rejection with no writes.
     */
    AdaptiveAttempt finalizeAccepted(AdaptiveAttempt attempt);
    /** Response/estimate already staged; write matching result/evidence/outbox exactly once for FINISH,
     * or audit-only/no-mastery for INVALIDATE or inconsistent trusted estimates. Return the terminal
     * header (technical INVALIDATED on inconsistency), without saving it.
     */
    AdaptiveAttempt finish(AdaptiveAttempt attempt, Outcome decision, Instant observedAt);
    /** Trusted policy/scoring/numerical failure before candidate response acceptance; preserve history,
     * emit no mastery and return technical-invalidated next header. Never used for client rejections.
     */
    AdaptiveAttempt technicalFailure(AdaptiveAttempt attempt, Instant observedAt);
}
