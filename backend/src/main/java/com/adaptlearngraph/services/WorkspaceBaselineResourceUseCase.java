package com.adaptlearngraph.services;

import java.util.UUID;

/** L&D-only explicit provisioning of an existing authorized JobPosition grant; no learner-state writes. */
public interface WorkspaceBaselineResourceUseCase {
    record Tuple(UUID bankId, UUID modelId, UUID mappingId) {
        public boolean complete() { return bankId != null && modelId != null && mappingId != null; }
    }
    Tuple read(String jobPositionId);
    Tuple configure(String jobPositionId, Tuple expected, Tuple desired);
    final class Failure extends RuntimeException {
        public final int status; public final String code;
        public Failure(int status, String code) { super(code); this.status=status; this.code=code; }
    }
}
