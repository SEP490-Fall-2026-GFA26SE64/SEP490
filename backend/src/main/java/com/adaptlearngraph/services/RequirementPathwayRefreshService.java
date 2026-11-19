package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.OutboxEventEntity;
import com.adaptlearngraph.repository.*;
import java.util.*;
import org.springframework.transaction.support.TransactionTemplate;

/** Bounded recovery polling compares real catalog/proof state, preserving every immutable revision and original approval basis. */
public final class RequirementPathwayRefreshService {
    private static final org.slf4j.Logger LOG=org.slf4j.LoggerFactory.getLogger(RequirementPathwayRefreshService.class);
    private final RequirementPathwayRefreshJpaRepository jobs;private final RequirementPathwayJpaRepository rules;
    private final RequirementPathwayRevisions revisions;private final RequirementPathwayPlanningService planning;
    private final RequirementPathwayReviewService review;private final CurrentRoleSelectionStore selections;
    private final OutboxEventJpaRepository outbox;private final RuleAssessmentAttemptJpaRepository clock;private final TransactionTemplate tx;
    private BypassedGapService gaps;
    public RequirementPathwayRefreshService watchBypassedGaps(BypassedGapService gaps) {this.gaps=Objects.requireNonNull(gaps);return this;}
    public RequirementPathwayRefreshService(RequirementPathwayRefreshJpaRepository jobs,RequirementPathwayJpaRepository rules,RequirementPathwayRevisions revisions,
            RequirementPathwayPlanningService planning,RequirementPathwayReviewService review,CurrentRoleSelectionStore selections,
            OutboxEventJpaRepository outbox,RuleAssessmentAttemptJpaRepository clock,TransactionTemplate tx) {
        this.jobs=jobs;this.rules=rules;this.revisions=revisions;this.planning=planning;this.review=review;this.selections=selections;this.outbox=outbox;this.clock=clock;this.tx=tx;
    }
    public void runBatch() {
        tx.executeWithoutResult(status->{jobs.resumeBypasses();jobs.discover();});
        for(int i=0;i<10;i++) {
            var failed=new UUID[1];
            try {
                boolean found=Boolean.TRUE.equals(tx.execute(status->{
                    var work=jobs.next();if(work.isEmpty())return false;var job=work.get();failed[0]=job.getJobId();
                    return selections.transaction(new RoleBaselineFlow.Actor(job.getOrganizationId(),job.getLearnerId()),()->{refresh(job);return true;});
                }));
                if(!found)return;
            }catch(RuntimeException failure) {
                LOG.warn("Requirement refresh {} needs retry ({})",failed[0],failure.getClass().getSimpleName());
                if(failed[0]!=null)try{tx.executeWithoutResult(status->jobs.later(failed[0],"CATALOG_OR_EVIDENCE_REFRESH_UNAVAILABLE"));}
                catch(RuntimeException unavailable){LOG.warn("Unable to retain requirement refresh retry {}",failed[0]);}
            }
        }
    }
    private void refresh(RequirementPathwayRefreshJpaRepository.Work job) {
        var row=rules.lock(job.getOrganizationId(),job.getRequestId()).orElseThrow();
        if(!row.getLearnerId().equals(job.getLearnerId()))throw new IllegalStateException("Request job ownership changed");
        if(gaps==null)throw new IllegalStateException("Bypass provision watcher is not configured");
        boolean retainedGaps=gaps.notifyAvailable(job.getOrganizationId(),job.getLearnerId(),row.getRequestId());
        // Archived requests still watch retained gaps before a new pathway is requested.
        if(row.getArchivedAt()!=null) {
            if(retainedGaps)jobs.later(job.getJobId(),null);
            else {jobs.done(job.getJobId());jobs.receipt(job.getEventId(),row.getCurrentRevision()==null?0:row.getCurrentRevision());}
            return;
        }
        if(row.getCurrentRevision()==null) {jobs.later(job.getJobId(),null);return;}
        var original=revisions.read(row);var next=planning.refresh(row,original);var status=review.nextReview(row);
        if(!next.equals(original) || !status.status().equals(row.getReviewStatus())) {
            UUID event=UUID.randomUUID();
            outbox.insert(new OutboxEventEntity(event,"RULE_PATHWAY_CURRENT_STATE_OBSERVED",row.getRequestId(),row.getCurrentRevision(),
                    Map.of("organizationId",row.getOrganizationId(),"learnerId",row.getLearnerId(),"previousRevision",row.getCurrentRevision(),
                        "nextPlanHash",RoleBaselineFlow.hash(revisions.encode(next))),row.getRequestId(),clock.clock()));
            revisions.publish(row,next,row.getRunId(),"PROVISION",event,status.basis(),status.status(),null);
        }
        jobs.later(job.getJobId(),null);
    }
}
