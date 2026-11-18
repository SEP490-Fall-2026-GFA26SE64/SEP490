package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.RiasecRules;
import com.adaptlearngraph.entities.domain.RiasecRules.Failure;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.RiasecStore.*;
import java.util.*;

public final class RiasecService {
    public record View(Workspace draft,List<Result> results,UUID currentId,Set<String> activePositionIds,boolean catalogAvailable) {}
    public record Edit(UUID editorId,UUID draftId,long revision,Map<String,Integer> answers) {}
    private final RoleBaselineFlow.Identity identity;private final RiasecStore store;private final RiasecCatalog catalog;
    public RiasecService(RoleBaselineFlow.Identity identity,RiasecStore store,RiasecCatalog catalog) {
        this.identity=identity;this.store=store;this.catalog=catalog;
    }
    private Owner owner(){var a=identity.requireEmployee();return new Owner(a.organizationId(),a.learnerId());}
    private static Result current(List<Result> results){return results.stream().filter(r->r.deletedAt()==null).findFirst().orElse(null);}
    private static boolean running(Result r){return r!=null && Set.of("QUEUED","PROCESSING").contains(r.aiStatus());}
    private void idle(Owner o){store.expire(o);if(store.results(o).stream().anyMatch(RiasecService::running))throw new Failure(409,"AI_RUNNING");}
    public View view() {
        var o=owner();var active=new HashSet<String>();boolean available=true;
        try {catalog.positions(o.organizationId(),true).forEach(p->active.add(p.id()));}
        catch(org.springframework.dao.DataAccessException unavailable){available=false;}
        boolean catalogAvailable=available;
        return store.transaction(()->{store.lock(o);store.expire(o);var results=store.results(o);var current=current(results);
            return new View(store.read(o),results,current==null?null:current.id(),Set.copyOf(active),catalogAvailable);});
    }
    public Workspace start(UUID editor) {
        var o=owner();if(editor==null)throw new Failure(400,"INVALID_EDITOR");
        return store.transaction(()->{var draft=store.lock(o);idle(o);if(draft.draftId()==null)store.draft(o,UUID.randomUUID(),editor);return store.read(o);});
    }
    public Workspace claim(Edit edit,boolean takeover) {
        var o=owner();return store.transaction(()->{var d=store.lock(o);sameDraft(d,edit);
            if(edit.editorId()==null)throw new Failure(400,"INVALID_EDITOR");
            if(d.revision()!=edit.revision())throw new Failure(409,"DRAFT_CHANGED");
            if(!takeover && d.editorId()!=null && !d.editorId().equals(edit.editorId()))throw new Failure(409,"EDITING_ELSEWHERE");
            store.claim(o,edit.editorId());return store.read(o);});
    }
    public Workspace save(Edit edit) {
        var o=owner();RiasecRules.validateAnswers(edit.answers(),false);
        return store.transaction(()->{var draft=store.lock(o);editable(draft,edit);store.save(o,edit.answers());return store.read(o);});
    }
    public UUID submit(Edit edit) {
        var o=owner();return store.transaction(()->{var draft=store.lock(o);
            // Replayed submit uses the draft UUID as a stable receipt, never creates another result.
            var existing=store.results(o).stream().filter(r->r.id().equals(edit.draftId())).findFirst();if(existing.isPresent())return existing.get().id();
            idle(o);editable(draft,edit);var scores=RiasecRules.score(draft.answers());store.submit(o,draft.draftId(),draft.answers(),scores);return draft.draftId();});
    }
    public void delete(UUID id) {var o=owner();store.transaction(()->{store.lock(o);store.expire(o);if(running(find(o,id)))throw new Failure(409,"AI_RUNNING");store.delete(o,id);return null;});}
    public void restore(UUID id) {var o=owner();store.transaction(()->{store.lock(o);idle(o);find(o,id);store.restore(o,id);return null;});}
    public void purge(UUID id) {
        var o=owner();store.transaction(()->{store.lock(o);store.expire(o);var r=find(o,id);
            if(r.deletedAt()==null)throw new Failure(409,"RESULT_NOT_INACTIVE");
            if(running(r))throw new Failure(409,"AI_RUNNING");
            store.purge(o,id);return null;});
    }
    public void retry(UUID id) {
        var o=owner();store.transaction(()->{store.lock(o);idle(o);var r=find(o,id);var current=current(store.results(o));
            if(current==null || !current.id().equals(id) || !r.aiStatus().equals("FAILED"))throw new Failure(409,"NOT_RETRYABLE");
            store.retry(o,id);return null;});
    }
    private Result find(Owner o,UUID id){return store.results(o).stream().filter(r->r.id().equals(id)).findFirst().orElseThrow(()->new Failure(404,"RESULT_NOT_FOUND"));}
    private static void sameDraft(Workspace d,Edit e){if(d.draftId()==null || !d.draftId().equals(e.draftId()))throw new Failure(409,"DRAFT_CHANGED");}
    private static void editable(Workspace d,Edit e){sameDraft(d,e);if(d.revision()!=e.revision())throw new Failure(409,"DRAFT_CHANGED");
        if(e.editorId()==null || !e.editorId().equals(d.editorId()))throw new Failure(409,"EDITING_ELSEWHERE");}
}
