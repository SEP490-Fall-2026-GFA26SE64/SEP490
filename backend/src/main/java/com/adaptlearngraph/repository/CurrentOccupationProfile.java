package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AuditEventEntity;
import com.adaptlearngraph.services.RoleBaselineFlow.*;
import com.adaptlearngraph.entities.AdaptiveBlueprint;
import com.adaptlearngraph.entities.AdaptiveAttempt;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;

/** TMP-REQ002-13 local profile-owner substitute; only real sufficient-evidence outcomes initialize it. */
public final class CurrentOccupationProfile implements Baseline {
    private final EmployeeOccupationProfileJpaRepository profiles; private final AuditEventJpaRepository audit; private final ObjectMapper json;
    private final AdaptiveAttemptStore attempts; private final AdaptiveBlueprintStore blueprints;
    private final com.adaptlearngraph.repository.AdaptiveBlueprintEligibilityPort eligibility;
    public CurrentOccupationProfile(EmployeeOccupationProfileJpaRepository profiles,AuditEventJpaRepository audit,ObjectMapper json,
            AdaptiveAttemptStore attempts,AdaptiveBlueprintStore blueprints,com.adaptlearngraph.repository.AdaptiveBlueprintEligibilityPort eligibility) {
        this.profiles=profiles;this.audit=audit;this.json=json;this.attempts=attempts;this.blueprints=blueprints;this.eligibility=eligibility;
    }
    public void initialize(AdaptiveAttemptOutcomePort.Completion completion) {
        var a=completion.terminal();
        if(!a.masteryProducing()) return;
        if(!a.snapshot().microSkillIds().equals(completion.skills().keySet()) || completion.skills().isEmpty())
            throw new IllegalStateException("Incomplete mastery cannot initialize profile");
        Map<String,BigDecimal> mastery=new TreeMap<>();
        completion.skills().forEach((id,s)-> { if(s.mastery()==null || s.mastery().signum()<0 || s.mastery().compareTo(BigDecimal.ONE)>0)
            throw new IllegalStateException("Invalid mastery"); mastery.put(id,s.mastery()); });
        var version=a.snapshot().blueprint();var scope=a.scope();var time=a.finishedAt().orElseThrow();
        int inserted=profiles.insertIfAbsent(scope.organizationId(),scope.learnerId(),scope.occupationId(),a.id(),version.id().blueprintId(),
                version.id().version(),version.catalogFingerprint(),write(new TreeSet<>(mastery.keySet())),write(mastery),time);
        if(inserted==1) audit.insert(new AuditEventEntity(UUID.randomUUID(),null,"local-occupation-profile","BASELINE_PROFILE_INITIALIZED",
                a.id(),"1",time,"SUCCEEDED",a.id()));
    }
    @Override public List<MasteryProfile> mastery(Actor actor) {
        var rows=profiles.mastery(actor.organizationId(),actor.learnerId());
        if(rows.isEmpty()) return new ArrayList<>();
        Map<UUID,List<EmployeeOccupationProfileJpaRepository.MasterySkillRow>> skills=new HashMap<>();
        try {
            // One batched read for every profile's evidence; names come from each profile's own blueprint version.
            for(var skill:profiles.masterySkills(actor.organizationId(),actor.learnerId(),rows.stream().map(r->r.attemptId()).toList()))
                skills.computeIfAbsent(skill.attemptId(),id->new ArrayList<>()).add(skill);
        } catch(Exception e) { throw new IllegalStateException("Profile unavailable",e); }
        var result=new ArrayList<MasteryProfile>();
        for(var row:rows) {
            try {
                var values=json.readTree(row.mastery());
                attempts.findOwned(actor.organizationId(),actor.learnerId(),row.attemptId()).orElseThrow(()->new IllegalStateException("Profile attempt unavailable"));
                var list=new ArrayList<MasterySkill>();
                for(var skill:skills.getOrDefault(row.attemptId(),List.of())) {
                    var value=values.get(skill.microSkillId());
                    if(value==null || !value.isNumber()) throw new IllegalStateException("Profile mastery missing");
                    list.add(new MasterySkill(skill.microSkillId(),skill.name(),value.doubleValue(),skill.confidenceLabel()));
                }
                if(list.size()!=values.size()) throw new IllegalStateException("Profile evidence incomplete");
                result.add(new MasteryProfile(row.occupationId(),row.occupationName(),row.attemptId(),row.blueprintVersion(),row.initializedAt(),list));
            } catch(Exception e) { throw new IllegalStateException("Profile unavailable",e); }
        }
        return result;
    }
    @Override public Optional<Progress> active(Actor actor) {
        var ids=profiles.inProgressAttempts(actor.organizationId(),actor.learnerId(),new OffsetPage(0,1));
        return ids.stream().findFirst().flatMap(id->attempts.findOwned(actor.organizationId(),actor.learnerId(),id))
                .map(a->new Progress("RESUME",a.snapshot().microSkillIds().size(),0,a.id(),a.snapshot().blueprint().id().version()));
    }
    @Override public Progress progress(Actor actor,Role role,Set<String> requiredSkills) {
        var scope=new AdaptiveAttempt.Scope(actor.organizationId(),actor.learnerId(),role.occupationId());
        var profile=profiles.progress(scope.organizationId(),scope.learnerId(),scope.occupationId()).stream().map(row-> {
                    try {
                        var required=json.readTree(row.requiredSkills());var mastery=json.readTree(row.mastery());int covered=0;
                        attempts.findOwned(actor.organizationId(),actor.learnerId(),row.attemptId()).orElseThrow(()->new IllegalStateException("Profile attempt unavailable"));
                        for(var id:required) { var value=mastery.get(id.asText()); if(value!=null && value.isNumber()
                                && value.decimalValue().signum()>=0 && value.decimalValue().compareTo(BigDecimal.ONE)<=0) covered++; }
                        return new Progress(covered==required.size()?"COMPLETE":"PROFILE_INCOMPLETE",required.size(),covered,row.attemptId(),row.blueprintVersion());
                    }catch(Exception e){throw new IllegalStateException("Profile invalid",e);}
                }).toList();
        if(!profile.isEmpty()) return profile.getFirst();
        var prior=attempts.findLatest(scope);
        if(prior.isPresent()) {
            var a=prior.get();int required=a.snapshot().microSkillIds().size();
            return new Progress(a.masteryProducing()?"PROFILE_PENDING":a.status()==AdaptiveAttempt.Status.IN_PROGRESS?"RESUME":"BASELINE_REQUIRED",
                    required,0,a.status()==AdaptiveAttempt.Status.IN_PROGRESS?a.id():null,a.snapshot().blueprint().id().version());
        }
        var catalogScope=new AdaptiveBlueprint.Scope(actor.organizationId(),role.occupationId());
        var current=blueprints.findActivation(catalogScope).flatMap(AdaptiveBlueprint.Activation::current).flatMap(id->blueprints.findVersion(catalogScope,id));
        // Catalog role carries its own levels; current baseline snapshot owns the complete Occupation union.
        if(current.isEmpty()) return new Progress("NO_BASELINE",requiredSkills.size(),0,null,null);
        var v=current.get();int required=(int)v.roles().values().stream().flatMap(r->r.skills().keySet().stream()).distinct().count();
        var eligible=eligibility.resolvePinned(catalogScope,v.pins());
        boolean ready=eligible.filter(e->e.catalogFingerprint().equals(v.catalogFingerprint())
                && e.roles().entrySet().stream().collect(java.util.stream.Collectors.toMap(Map.Entry::getKey,r->r.getValue().role())).equals(v.roles())
                && new com.adaptlearngraph.services.AdaptiveBlueprintValidator().shortages(v.configuration(),e).isEmpty()).isPresent();
        return new Progress(ready && v.configuration().occupationBounds()!=null?"BASELINE_REQUIRED":"BASELINE_UNAVAILABLE",required,0,null,v.id().version());
    }
    public boolean exists(AdaptiveAttempt.Scope scope) {
        return profiles.exists(scope.organizationId(),scope.learnerId(),scope.occupationId());
    }
    private String write(Object value) { try{return json.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException(e);} }
}
