package com.adaptlearngraph.repository;

import java.time.Instant;
import java.util.*;

/** Read-only saved learning targets and current catalog versions; no command or learner writes. */
public interface KnowledgeJourneyPort {
    record Target(UUID id,String roleId,String jobPositionId,String snapshot,long revision,Instant selectedAt,
                  boolean current,String frozenInput) {}
    List<Target> targets(UUID organization,UUID learner,int limit,int offset);
    Map<String,String> currentVersions(UUID organization,Set<String> skillIds);
}
