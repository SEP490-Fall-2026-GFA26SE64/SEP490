package com.adaptlearngraph.pathway.application;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPathwayStore.*;
import com.adaptlearngraph.pathway.application.InitialPlanningPorts.Limits;
import com.adaptlearngraph.recommendation.domain.InitialIdentity;
import java.util.*;
import java.util.function.Supplier;

/** REQ-001-F02 handoff: retained replay first; selection+snapshot+intent+receipt share one UoW. */
public final class InitialPathwayAdmission {
    public static final String ALGORITHM=com.adaptlearngraph.recommendation.domain.InitialPathwayPlanner.VERSION;
    public record Confirm(String roleId,String levelId,UUID expectedSelectionId,Long expectedSelectionRevision,String expectedGapInputHash) {}
    public record Accepted(UUID requestId,UUID selectionId,long selectionRevision,String planningInputHash,String displayState) {}
    private final Actors actors; private final Coordination coordination; private final Bindings bindings;
    private final RoleGapPreview preview; private final InitialPathwayStore store; private final Receipts receipts;
    private final Codec codec; private final Supplier<Limits> settings;
    public InitialPathwayAdmission(Actors actors,Coordination coordination,Bindings bindings,RoleGapPreview preview,
                                  InitialPathwayStore store,Receipts receipts,Codec codec,Supplier<Limits> settings) {
        this.actors=actors;this.coordination=coordination;this.bindings=bindings;this.preview=preview;
        this.store=store;this.receipts=receipts;this.codec=codec;this.settings=settings;
    }
    public Receipt confirm(String key,Confirm command) {
        var actor=actors.require(); var scope=Scope.own(actor); InitialPathwayPorts.commandKey(key);
        if(command==null)throw new Failure(400,"INVALID_REQUEST");
        InitialPathwayPorts.text(command.roleId());InitialPathwayPorts.text(command.levelId());
        if(command.expectedGapInputHash()==null || !command.expectedGapInputHash().matches("[0-9a-f]{64}")
                || (command.expectedSelectionId()==null)!=(command.expectedSelectionRevision()==null)
                || command.expectedSelectionRevision()!=null && command.expectedSelectionRevision()<1)throw new Failure(400,"INVALID_REQUEST");
        String bodyHash=InitialIdentity.hash("command",Arrays.asList("CONFIRM_ROLE_LEVEL",command.roleId(),command.levelId(),command.expectedSelectionId(),
                command.expectedSelectionRevision(),command.expectedGapInputHash()));
        var replay=coordination.transaction(scope,()->replay(actor,key,bodyHash));
        if(replay.isPresent())return replay.get();
        var input=preview.prepare(actor,command.roleId(),command.levelId());
        if(input.preview().result().need()==com.adaptlearngraph.recommendation.domain.RoleGap.Need.LEARNING_REQUIRED)
            requirePlanningVersions(input.binding());
        var preparedSelection=coordination.prepare(scope,input.binding());
        var config=settings.get(); String configHash=configurationHash(config);
        return coordination.transaction(scope,()->{
            var retained=replay(actor,key,bodyHash); if(retained.isPresent())return retained.get();
            var current=coordination.current(scope);
            if(!Objects.equals(current.map(Selection::id).orElse(null),command.expectedSelectionId())
                    || !Objects.equals(current.map(Selection::revision).orElse(null),command.expectedSelectionRevision()))throw new Failure(409,"STALE_SELECTION");
            if(!input.preview().gapInputHash().equals(command.expectedGapInputHash()))throw new Failure(409,"STALE_GAP_INPUT");
            if(current.filter(s->s.roleId().equals(input.binding().roleId()) && Objects.equals(s.levelId(),input.binding().levelId())).isEmpty() && coordination.assessmentActive(scope))throw new Failure(409,"ASSESSMENT_IN_PROGRESS");
            bindings.assertCurrent(scope,input.binding());
            var selected=preparedSelection.commit(key,bodyHash);
            if(!selected.roleId().equals(command.roleId()) || !Objects.equals(selected.levelId(),command.levelId()))throw new Failure(503,"SELECTION_LEVEL_MISMATCH");
            String planningHash=InitialIdentity.hash("planning",List.of(input.preview().gapInputHash(),selected.id(),selected.revision(),
                    selected.roleId(),selected.levelId(),input.binding().releaseToken(),input.binding().versions(),ALGORITHM,configHash));
            var request=store.equivalent(scope,selected,planningHash).orElseGet(()->store.create(scope,
                    new Frozen(input,selected,planningHash,configHash),ALGORITHM,config.version()));
            var response=new Accepted(request.id(),selected.id(),selected.revision(),planningHash,
                    com.adaptlearngraph.pathway.domain.InitialPathwayState.display(request.generation(),request.review(),request.validation()));
            var result=new Receipt(202,bodyHash,codec.encode(response));
            receipts.save(actor,"CONFIRM_ROLE","ROLE_CONFIRMATION",key,result);return result;
        });
    }
    private Optional<Receipt> replay(Actor actor,String key,String hash) {
        if(!actor.equals(actors.require()))throw new Failure(403,"FORBIDDEN");
        // Resource is part of body hash; fixed resource avoids hiding a same-key/different-Role conflict.
        var found=receipts.find(actor,"CONFIRM_ROLE","ROLE_CONFIRMATION",key);
        if(found.isPresent() && !found.get().bodyHash().equals(hash))throw new Failure(409,"IDEMPOTENCY_CONFLICT");
        return found;
    }
    public static String configurationHash(Limits c) { return InitialIdentity.hash("search-configuration",List.of(c.version(),c.maxClosureNodes(),c.maxClosureEdges(),c.maxProviders(),c.batchSize(),c.maxSearchStates())); }
    public static void requirePlanningVersions(Binding binding) {
        for(String key:List.of("suitability","readiness")) {
            var version=binding.versions().get(key);
            if(version==null || version.isBlank())throw new Failure(503,"PLANNING_POLICY_NOT_CONFIGURED",false);
        }
    }
}
