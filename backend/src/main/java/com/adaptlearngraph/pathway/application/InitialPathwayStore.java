package com.adaptlearngraph.pathway.application;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import java.time.Duration;
import java.util.*;

public interface InitialPathwayStore {
    record Frozen(RoleGapPreview.Prepared input,Selection selection,String planningHash,String configurationHash) {}
    record Request(UUID id,Scope scope,Selection selection,Frozen frozen,Generation generation,String reason,
                   Review review,Long revision,Validation validation,String contentHash) {}
    record Revision(UUID requestId,long revision,UUID runId,Plan plan,Set<String> selectedModules,
                    List<List<String>> overrides,String contentHash,Validation validation) {
        public Revision { selectedModules=Set.copyOf(selectedModules); overrides=overrides.stream().map(List::copyOf).toList(); }
        public static String identity(Plan plan,Set<String> selected,List<List<String>> overrides) {
            return com.adaptlearngraph.recommendation.domain.InitialIdentity.hash("revision",List.of(plan.contentHash(overrides),new TreeSet<>(selected).stream().toList()));
        }
    }
    record Claim(Request request,UUID token,int attempt,String workerVersion) {}
    Optional<Request> request(Scope scope,UUID id);
    Optional<Request> current(Scope scope);
    Optional<Request> equivalent(Scope scope,Selection selection,String planningHash);
    Request create(Scope scope,Frozen frozen,String algorithmVersion,String configurationVersion);
    Revision revision(Scope scope,UUID requestId,long revision);
    boolean approved(Scope scope,UUID requestId,long revision,String hash);
    List<Request> assigned(UUID organizationId,Set<UUID> ids,int offset,int limit);
    Optional<Scope> assignedScope(UUID organizationId,UUID requestId);
    Optional<Claim> claim(Duration lease,int maxAttempts,String workerVersion);
    /** Caller holds learner coordination. Token must still own an unexpired lease at the write. */
    boolean finish(Claim claim,Generation status,String reason,Plan plan,Duration retryAfter);
    void saveRevision(Scope scope,Revision previous,Revision next,Actor expert,Assignment assignment,String action,String moduleId,String reason);
    void approve(Scope scope,Revision revision,Actor expert,Assignment assignment);
    interface Codec {
        String encode(Object value);
        <T> T decode(String value,Class<T> type);
    }
}
