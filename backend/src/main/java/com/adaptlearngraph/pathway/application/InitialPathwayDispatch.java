package com.adaptlearngraph.pathway.application;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPathwayStore.*;
import com.adaptlearngraph.pathway.application.InitialPlanningPorts.Limits;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.Generation;
import com.adaptlearngraph.recommendation.domain.InitialPathwayPlanner;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.Plan;
import com.adaptlearngraph.recommendation.domain.RoleGap.Need;
import java.time.Duration;
import java.util.*;

/** One bounded dispatch invocation. Persistence owns database time and claim-token fencing. */
public final class InitialPathwayDispatch {
    public record Settings(String version,Limits limits,Duration lease,int maxAttempts,Duration minimumBackoff,Duration maximumBackoff) {
        public Settings {
            com.adaptlearngraph.recommendation.domain.RoleGap.text(version);Objects.requireNonNull(limits);
            if(lease==null || lease.isZero() || lease.isNegative() || maxAttempts<1 || minimumBackoff==null || minimumBackoff.isZero()
                    || minimumBackoff.isNegative() || maximumBackoff==null || maximumBackoff.compareTo(minimumBackoff)<0)
                throw new IllegalArgumentException("Explicit bounded worker settings required");
        }
        Duration backoff(int attempt) {
            long value=minimumBackoff.toMillis(),cap=maximumBackoff.toMillis();
            for(int i=1;i<attempt && value<cap;i++)value=value>cap/2?cap:value*2;
            return Duration.ofMillis(Math.min(value,cap));
        }
        String identity() { return version+":"+com.adaptlearngraph.recommendation.domain.InitialIdentity.hash("worker-configuration",
                List.of(version,lease.toMillis(),maxAttempts,minimumBackoff.toMillis(),maximumBackoff.toMillis())); }
    }
    private final InitialPathwayStore store;private final Coordination coordination;private final Bindings bindings;
    private final InitialProblemBuilder builder;private final Settings settings;private final InitialPathwayPlanner planner=new InitialPathwayPlanner();
    public InitialPathwayDispatch(InitialPathwayStore store,Coordination coordination,Bindings bindings,InitialProblemBuilder builder,Settings settings) {
        this.store=store;this.coordination=coordination;this.bindings=bindings;this.builder=builder;this.settings=settings;
    }
    public void runOne() {
        var claim=store.claim(settings.lease(),settings.maxAttempts(),settings.identity()); if(claim.isEmpty())return;
        var c=claim.get();var r=c.request();Generation status;String reason=null;Plan plan=null;
        try {
            if(!r.frozen().configurationHash().equals(InitialPathwayAdmission.configurationHash(settings.limits())))throw new Failure(422,"CONFIGURATION_VERSION_UNAVAILABLE");
            bindings.assertCurrent(r.scope(),r.frozen().input().binding());
            if(r.frozen().input().preview().result().need()==Need.NO_LEARNING_REQUIRED)status=Generation.NO_LEARNING_REQUIRED;
            else {
                var problem=builder.build(r.scope(),r.frozen().input().binding(),r.frozen().input().preview().result(),r.frozen().planningHash());
                plan=planner.generate(problem,settings.limits().maxSearchStates());status=plan.valid()?Generation.SUCCEEDED:Generation.UNRESOLVED;
                if(!plan.valid())reason=plan.diagnostics().getFirst().split(":",2)[0];
            }
        }catch(Failure failure) {
            reason=failure.code();status=failure.status()==409?Generation.STALE:
                    failure.status()==503 && !reason.endsWith("NOT_CONFIGURED")?Generation.FAILED_RETRYABLE:Generation.BLOCKED;
            if(status==Generation.FAILED_RETRYABLE && c.attempt()>=settings.maxAttempts()) {status=Generation.BLOCKED;reason="RETRY_EXHAUSTED";}
        }catch(IllegalArgumentException invalid) {status=Generation.BLOCKED;reason="INVALID_PLANNING_INPUT";}
        final var outcome=status;final var code=reason;final var proposal=plan;
        coordination.transaction(r.scope(),()->{
            var selection=coordination.current(r.scope());
            if(selection.isEmpty() || !selection.get().equals(r.selection()))return store.finish(c,Generation.STALE,"SELECTION_CHANGED",null,Duration.ZERO);
            if(outcome==Generation.SUCCEEDED || outcome==Generation.NO_LEARNING_REQUIRED)bindings.assertCurrent(r.scope(),r.frozen().input().binding());
            return store.finish(c,outcome,code,proposal,settings.backoff(c.attempt()));
        });
    }
}
