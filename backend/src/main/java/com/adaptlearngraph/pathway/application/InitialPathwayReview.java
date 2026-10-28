package com.adaptlearngraph.pathway.application;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPathwayStore.*;
import com.adaptlearngraph.pathway.application.InitialPlanningPorts.Limits;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.*;
import com.adaptlearngraph.recommendation.domain.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import java.util.*;
import java.util.function.Supplier;

/** Assigned Expert only; exact receipts precede current-revision checks on every mutation. */
public final class InitialPathwayReview {
    public record Expected(Long expectedRevision,String expectedContentHash) {}
    public record Edit(String moduleId,Long expectedRevision,String expectedContentHash,String reason) {}
    public record Summary(UUID id,long revision,String contentHash,Review reviewStatus,Validation validationStatus,String roleName,String levelName) {}
    public record Detail(Summary summary,RoleGap.Result gaps,Revision revision,List<Offer> candidates) {}
    public record Checked(Validation validationStatus,List<String> diagnostics,String revisionContentHash,List<String> warnings,Quality quality,Search search) {}
    private final Actors actors;private final ReviewAssignments assignments;private final InitialPathwayStore store;
    private final Coordination coordination;private final Bindings bindings;private final InitialProblemBuilder builder;
    private final Receipts receipts;private final Codec codec;private final Supplier<Limits> settings;
    private final InitialPathwayPlanner planner=new InitialPathwayPlanner();
    public InitialPathwayReview(Actors actors,ReviewAssignments assignments,InitialPathwayStore store,Coordination coordination,
            Bindings bindings,InitialProblemBuilder builder,Receipts receipts,Codec codec,Supplier<Limits> settings) {
        this.actors=actors;this.assignments=assignments;this.store=store;this.coordination=coordination;this.bindings=bindings;
        this.builder=builder;this.receipts=receipts;this.codec=codec;this.settings=settings;
    }
    private Actor expert() { var a=actors.require();a.require(Role.DOMAIN_EXPERT);return a; }
    private Scope scope(Actor a,UUID id) {
        var assignment=assignments.require(a,id);
        if(!assignment.expertId().equals(a.accountId()))throw new Failure(404,"PATHWAY_NOT_FOUND");
        return store.assignedScope(a.organizationId(),id).orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND"));
    }
    private Request request(Scope s,UUID id) { return store.request(s,id).orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND")); }
    private Summary summary(Request r) {
        if(r.revision()==null)throw new Failure(409,"PROPOSAL_NOT_AVAILABLE");
        var b=r.frozen().input().binding();return new Summary(r.id(),r.revision(),r.contentHash(),r.review(),r.validation(),b.roleName(),b.levelName());
    }
    public List<Summary> queue(int offset,int limit) {
        var a=expert();if(offset<0 || limit<1 || limit>100)throw new Failure(400,"INVALID_PAGING");
        var ids=assignments.assignedPathways(a);
        return store.assigned(a.organizationId(),ids,offset,limit).stream().map(r->{scope(a,r.id());return summary(r);}).toList();
    }
    private Problem problem(Request r) {
        var c=settings.get();if(!r.frozen().configurationHash().equals(InitialPathwayAdmission.configurationHash(c)))throw new Failure(503,"CONFIGURATION_VERSION_UNAVAILABLE");
        bindings.assertCurrent(r.scope(),r.frozen().input().binding());
        return builder.build(r.scope(),r.frozen().input().binding(),r.frozen().input().preview().result(),r.frozen().planningHash());
    }
    public Detail detail(UUID id) {
        var a=expert();var s=scope(a,id);var r=request(s,id);var brief=summary(r);
        var revision=store.revision(s,id,r.revision()); var p=problem(r);scope(a,id);
        return new Detail(brief,r.frozen().input().preview().result(),revision,p.offers());
    }
    public Checked validate(UUID id) {
        var a=expert();var s=scope(a,id);var r=request(s,id);summary(r);var previous=store.revision(s,id,r.revision());
        var plan=planner.review(problem(r),previous.selectedModules(),settings.get().maxSearchStates());scope(a,id);
        String hash=Revision.identity(plan,previous.selectedModules(),previous.overrides());
        return new Checked(!hash.equals(previous.contentHash())?Validation.STALE:plan.valid()?Validation.VALID:Validation.UNRESOLVED,
                plan.diagnostics(),hash,plan.warnings(),plan.quality(),plan.search());
    }
    public Receipt edit(UUID id,String key,Edit command,boolean include) {
        if(command==null)throw new Failure(400,"INVALID_REQUEST");InitialPathwayPorts.text(command.moduleId());
        if(command.reason()!=null && command.reason().length()>2000)throw new Failure(400,"INVALID_REQUEST");
        String operation=include?"INCLUDE":"EXCLUDE";
        return mutate(id,key,new Expected(command.expectedRevision(),command.expectedContentHash()),operation,command.moduleId(),command.reason());
    }
    public Receipt confirm(UUID id,String key,Expected expected) { return mutate(id,key,expected,"CONFIRM",null,null); }
    private Receipt mutate(UUID id,String key,Expected expected,String operation,String moduleId,String reason) {
        var a=expert();var s=scope(a,id);InitialPathwayPorts.commandKey(key);
        if(expected==null || expected.expectedRevision()==null || expected.expectedRevision()<1 || expected.expectedContentHash()==null
                || !expected.expectedContentHash().matches("[0-9a-f]{64}"))throw new Failure(400,"INVALID_REQUEST");
        String bodyHash=InitialIdentity.hash("command",Arrays.asList(operation,id,expected.expectedRevision(),expected.expectedContentHash(),moduleId,reason));
        var replay=coordination.transaction(s,()->receipt(a,id,key,operation,bodyHash));if(replay.isPresent())return replay.get();
        var before=request(s,id);check(before,expected);var old=store.revision(s,id,before.revision());
        boolean noOp=operation.equals("INCLUDE") && old.selectedModules().contains(moduleId) || operation.equals("EXCLUDE") && !old.selectedModules().contains(moduleId);
        var selected=new TreeSet<>(old.selectedModules());var overrides=new ArrayList<>(old.overrides());Plan plan=old.plan();
        if(!noOp) {
            var p=problem(before);
            if(operation.equals("INCLUDE")) {
                if(p.offers().stream().noneMatch(o->o.moduleId().equals(moduleId) && o.canCover()))throw new Failure(422,"MODULE_NOT_ELIGIBLE");
                selected.add(moduleId);
            }else if(operation.equals("EXCLUDE"))selected.remove(moduleId);
            if(!operation.equals("CONFIRM"))overrides.add(List.of(operation,moduleId,Objects.toString(reason,"")));
            plan=planner.review(p,selected,settings.get().maxSearchStates());
        }
        final var validated=plan;
        return coordination.transaction(s,()->{
            var retained=receipt(a,id,key,operation,bodyHash);if(retained.isPresent())return retained.get();
            var r=request(s,id);check(r,expected);bindings.assertCurrent(s,r.frozen().input().binding());
            if(!coordination.current(s).filter(r.selection()::equals).isPresent())throw new Failure(409,"STALE_SELECTION");
            var assignment=assignments.require(a,id);Revision next=old;
            if(!assignment.expertId().equals(a.accountId()))throw new Failure(404,"PATHWAY_NOT_FOUND");
            if(operation.equals("CONFIRM")) {
                if(!validated.valid())throw new Failure(422,"INVALID_PATHWAY_DRAFT");
                if(!Revision.identity(validated,selected,overrides).equals(old.contentHash()))throw new Failure(409,"VALIDATION_CHANGED");
                store.approve(s,old,a,assignment);
            }else if(!noOp) {
                next=new Revision(id,old.revision()+1,old.runId(),validated,selected,overrides,Revision.identity(validated,selected,overrides),
                        validated.valid()?Validation.VALID:Validation.UNRESOLVED);
                store.saveRevision(s,old,next,a,assignment,operation,moduleId,reason);
            }
            var result=new Receipt(200,bodyHash,codec.encode(Map.of("pathwayId",id,"revision",next.revision(),"revisionContentHash",next.contentHash(),
                    "reviewStatus",operation.equals("CONFIRM")?Review.APPROVED:Review.AWAITING_EXPERT_REVIEW,"validationStatus",next.validation(),"diagnostics",next.plan().diagnostics())));
            receipts.save(a,operation,id.toString(),key,result);return result;
        });
    }
    private void check(Request r,Expected expected) {
        if(r.review()!=Review.AWAITING_EXPERT_REVIEW || !Objects.equals(r.revision(),expected.expectedRevision()) || !Objects.equals(r.contentHash(),expected.expectedContentHash()))throw new Failure(409,"STALE_REVISION");
    }
    private Optional<Receipt> receipt(Actor a,UUID id,String key,String operation,String hash) {
        if(!a.equals(expert()))throw new Failure(403,"FORBIDDEN");scope(a,id);
        var found=receipts.find(a,operation,id.toString(),key);
        if(found.isPresent() && !found.get().bodyHash().equals(hash))throw new Failure(409,"IDEMPOTENCY_CONFLICT");return found;
    }
}
