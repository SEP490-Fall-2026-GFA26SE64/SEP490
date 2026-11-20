package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.QuestionBank.*;
import com.adaptlearngraph.entities.domain.RuleAssessment.Purpose;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.QuestionBankPorts.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

/** Baseline shortages are routed to the Role maintainer; Submitted content never fulfils a request. */
public final class BaselineQuestionRequestService {
    public record Create(String scopeKey,String skillId,String knowledgeLevel,int requiredTotal,int requiredMandatory) {}
    public record View(BaselineQuestionRequestStore.Row request,String status,int published,int mandatory,int ordinary,int missingMandatory,int missingOrdinary,String issue) {}
    private final Actors actors;private final Catalog people;private final AssessmentPolicyCatalog scopes;private final Neo4jCypher graph;
    private final AssessmentItemKnowledgeMappingJpaRepository bank;private final BaselineQuestionRequestStore store;private final QuestionBankUseCase questions;private final ObjectMapper json;
    public BaselineQuestionRequestService(Actors actors,Catalog people,AssessmentPolicyCatalog scopes,Neo4jCypher graph,AssessmentItemKnowledgeMappingJpaRepository bank,
            BaselineQuestionRequestStore store,QuestionBankUseCase questions,ObjectMapper json) {
        this.actors=actors;this.people=people;this.scopes=scopes;this.graph=graph;this.bank=bank;this.store=store;this.questions=questions;this.json=json;
    }
    private UUID maintainer(Actor a,String role) {
        var rows=graph.read(5,tx->tx.list("MATCH (r:TargetRole {organizationId:$org,id:$role}) WHERE NOT r.status IN ['ARCHIVED','DELETED','INACTIVE','SUPERSEDED'] RETURN r.assignedExpertId AS expert LIMIT 2",Map.of("org",a.organization().toString(),"role",role)));
        if(rows.size()!=1 || rows.getFirst().get("expert").isNull())throw new Failure(409,"Assign an active maintaining Expert to the source Role first.");
        UUID id;
        try{id=UUID.fromString(rows.getFirst().get("expert").asString());}catch(IllegalArgumentException invalid){throw new Failure(409,"Assign an active maintaining Expert to the source Role first.");}
        people.requireExpert(a,id);return id;
    }
    public List<View> list() {
        var a=actors.require();var rows=store.list(a.organization());
        if(rows.size()>1000)throw new Failure(422,"Question request capacity exceeded");
        var result=new ArrayList<View>();
        for(var r:rows) {
            UUID recipient=null;String issue=null;
            try{recipient=maintainer(a,r.roleId());}catch(Failure unavailable){issue=unavailable.getMessage();}
            if(!a.manager() && (!a.id().equals(r.recipient()) || !a.id().equals(recipient)))continue;
            var pool=bank.eligible(a.organization(),r.skillId(),r.level(),r.skillVersion(),10001);
            int mandatory=(int)pool.stream().filter(AssessmentItemKnowledgeMappingJpaRepository.Candidate::getMandatory).count(),ordinary=pool.size()-mandatory;
            int missingMandatory=Math.max(0,r.mandatory()-mandatory),missingOrdinary=Math.max(0,r.total()-r.mandatory()-ordinary);
            if(issue==null && !Objects.equals(recipient,r.recipient()))issue="Role maintainer changed. L&D must resend this request.";
            if(issue==null && !Objects.equals(people.requireKnowledge(a,r.skillId(),r.level()),r.skillVersion()))issue="Skill version changed. L&D must send a request for the current version.";
            result.add(new View(r,issue!=null?"NEEDS_ACTION":missingMandatory+missingOrdinary==0?"COMPLETED":"OPEN",pool.size(),mandatory,ordinary,missingMandatory,missingOrdinary,issue));
        }
        return List.copyOf(result);
    }
    public List<View> create(Create c) {
        var a=actors.require();if(!a.manager())throw new Failure(403,"L&D Manager required");
        if(c==null || c.requiredTotal()<1 || c.requiredTotal()>500 || c.requiredMandatory()<0 || c.requiredMandatory()>c.requiredTotal())throw new Failure(400,"Enter valid total and mandatory quotas");
        var scope=scopes.discover(a.organization(),Purpose.BASELINE).scopes().stream().filter(s->s.sharedBaseline() && s.key().equals(c.scopeKey())).findFirst().orElseThrow(()->new Failure(404,"Baseline Role scope not found"));
        var group=scope.groups().stream().filter(g->g.requirement().skillId().equals(c.skillId()) && g.requirement().knowledgeLevel().name().equals(c.knowledgeLevel())).findFirst().orElseThrow(()->new Failure(400,"Skill/level is outside this baseline Role"));
        var recipient=maintainer(a,scope.ownerId());String version=people.requireKnowledge(a,c.skillId(),c.knowledgeLevel());
        if(!Objects.equals(version,group.skillVersion()))throw new Failure(409,"Reload the current Skill version before sending");
        var previous=store.list(a.organization()).stream().filter(r->r.roleId().equals(scope.ownerId()) && r.skillId().equals(c.skillId()) && r.level().equals(c.knowledgeLevel()) && r.skillVersion().equals(version)).findFirst();
        if(previous.isPresent() && Math.max(previous.get().total()-previous.get().mandatory(),c.requiredTotal()-c.requiredMandatory())+Math.max(previous.get().mandatory(),c.requiredMandatory())>500)
            throw new Failure(422,"Combined ordinary and mandatory demand exceeds 500 questions for this request");
        store.upsert(new BaselineQuestionRequestStore.Row(UUID.randomUUID(),a.organization(),scope.ownerId(),scope.ownerName(),c.skillId(),group.skillName(),c.knowledgeLevel(),version,recipient,a.id(),c.requiredTotal(),c.requiredMandatory(),java.time.Instant.now(),0));
        return list();
    }
    public void link(UUID request,UUID question) {
        var a=actors.require();if(!a.expert())throw new Failure(403,"Maintaining Expert required");
        var r=store.list(a.organization()).stream().filter(x->x.id().equals(request)).findFirst().orElseThrow(()->new Failure(404,"Request not found"));
        if(!a.id().equals(r.recipient()) || !a.id().equals(maintainer(a,r.roleId())))throw new Failure(403,"Role maintenance responsibility changed");
        var q=questions.read().questions().stream().filter(x->x.id.equals(question)).findFirst().orElseThrow(()->new Failure(404,"Question not found"));
        var c=q.versions.getLast().content;
        if(!a.id().equals(q.owner) || !r.skillId().equals(c.skillId()) || !r.level().equals(c.knowledgeLevel()) || !r.skillVersion().equals(c.skillVersion()))throw new Failure(409,"Question must match the request Skill, level, version and responsible Expert");
        store.link(a.organization(),request,question,a.id());
    }
    public Optional<ScopedAssessmentPolicyService.BulkTemplate> template() {
        var a=actors.require();if(!a.expert())throw new Failure(403,"Expert required");
        return store.template(a.organization(),a.id()).map(body->{try{return json.readValue(body,ScopedAssessmentPolicyService.BulkTemplate.class);}catch(Exception invalid){throw new Failure(503,"Saved bulk template unavailable");}});
    }
    public void template(ScopedAssessmentPolicyService.BulkTemplate value) {
        var a=actors.require();if(!a.expert())throw new Failure(403,"Expert required");
        try{store.template(a.organization(),a.id(),json.writeValueAsString(value));}catch(com.fasterxml.jackson.core.JsonProcessingException invalid){throw new Failure(400,"Invalid bulk template");}
    }
}
