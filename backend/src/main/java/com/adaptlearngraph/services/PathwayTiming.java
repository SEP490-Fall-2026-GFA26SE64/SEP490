package com.adaptlearngraph.services;

import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.Failure;
import java.time.*;
import java.util.*;

/** First approval owns the clock; caller holds the request and learner locks. */
public final class PathwayTiming {
    public record View(String state,Integer durationMonths,Instant startedAt,Instant deadlineAt,
                       Instant completedAt,Boolean onTime,Instant observedAt) {}
    private final RequirementPathwayJpaRepository rules;
    private final RuleAssessmentAttemptJpaRepository clock;
    public PathwayTiming(RequirementPathwayJpaRepository rules,RuleAssessmentAttemptJpaRepository clock) {
        this.rules=rules;this.clock=clock;
    }
    public Instant firstApproval(RequirementPathwayJpaRepository.Row row,RoleBaselineFlow.Role role,String levelId,
                              RequirementPathwayRevisions revisions) {
        if(row.getTimingStartedAt()!=null || row.getPreviouslyApproved())return clock.clock();
        var level=role.levels().stream().filter(l->l.id().equals(levelId)).findFirst()
                .orElseThrow(()->new Failure(422,"PATHWAY_DURATION_UNAVAILABLE"));
        String raw=level.duration();
        var parsed=java.util.regex.Pattern.compile("(?i)^([1-9][0-9]{0,8})(?:\\s+months?)?$").matcher(raw==null?"":raw.strip());
        if(!parsed.matches() || role.roleVersion()==null || role.roleVersion().isBlank())
            throw new Failure(422,"PATHWAY_DURATION_UNAVAILABLE");
        int months=Integer.parseInt(parsed.group(1));Instant start=clock.clock(),deadline;
        try{deadline=start.atZone(ZoneOffset.UTC).plusMonths(months).toInstant();}
        catch(DateTimeException invalid){throw new Failure(422,"PATHWAY_DURATION_UNAVAILABLE");}
        String basis=revisions.encode(Map.of("roleId",role.id(),"roleVersion",role.roleVersion(),"levelId",levelId,
                "catalogVersion",role.catalogVersion(),"catalogFingerprint",role.fingerprint(),"durationMonths",months,"zone","UTC"));
        if(rules.startTiming(row.getOrganizationId(),row.getLearnerId(),row.getRequestId(),months,basis,start,deadline)!=1)
            throw new Failure(409,"PATHWAY_TIMING_CONFLICT");
        return start;
    }
    public View view(RequirementPathwayJpaRepository.Row row) {
        Instant now=clock.clock();
        String state=row.getTimingCompletedAt()!=null?"COMPLETED":row.getTimingStartedAt()==null?
                (row.getPreviouslyApproved()?"LEGACY_UNTIMED":"NOT_STARTED"):
                now.isAfter(row.getTimingDeadlineAt())?"OVERDUE":"IN_PROGRESS";
        return new View(state,row.getTimingDurationMonths(),row.getTimingStartedAt(),row.getTimingDeadlineAt(),
                row.getTimingCompletedAt(),row.getTimingOnTime(),now);
    }
}
