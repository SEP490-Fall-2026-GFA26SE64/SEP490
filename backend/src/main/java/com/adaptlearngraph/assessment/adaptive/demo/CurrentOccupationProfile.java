package com.adaptlearngraph.assessment.adaptive.demo;

import com.adaptlearngraph.learning.application.RoleBaselineFlow.*;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintStore;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.*;
import org.springframework.jdbc.core.namedparam.*;

/** TMP-REQ002-13 local profile-owner substitute; only real sufficient-evidence outcomes initialize it. */
public final class CurrentOccupationProfile implements Baseline {
    private final NamedParameterJdbcTemplate jdbc; private final ObjectMapper json;
    private final AdaptiveAttemptStore attempts; private final AdaptiveBlueprintStore blueprints;
    private final com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintEligibilityPort eligibility;
    public CurrentOccupationProfile(NamedParameterJdbcTemplate jdbc,ObjectMapper json,AdaptiveAttemptStore attempts,AdaptiveBlueprintStore blueprints,
            com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintEligibilityPort eligibility) {
        this.jdbc=jdbc;this.json=json;this.attempts=attempts;this.blueprints=blueprints;this.eligibility=eligibility;
    }
    public void initialize(AdaptiveAttemptOutcomePort.Completion completion) {
        var a=completion.terminal();
        if(!a.masteryProducing()) return;
        if(!a.snapshot().microSkillIds().equals(completion.skills().keySet()) || completion.skills().isEmpty())
            throw new IllegalStateException("Incomplete mastery cannot initialize profile");
        Map<String,BigDecimal> mastery=new TreeMap<>();
        completion.skills().forEach((id,s)-> { if(s.mastery()==null || s.mastery().signum()<0 || s.mastery().compareTo(BigDecimal.ONE)>0)
            throw new IllegalStateException("Invalid mastery"); mastery.put(id,s.mastery()); });
        var version=a.snapshot().blueprint();
        var p=key(a.scope()).addValue("attempt",a.id()).addValue("blueprint",version.id().blueprintId()).addValue("version",version.id().version())
                .addValue("fingerprint",version.catalogFingerprint()).addValue("skills",write(new TreeSet<>(mastery.keySet())))
                .addValue("mastery",write(mastery)).addValue("time",Timestamp.from(a.finishedAt().orElseThrow()));
        int inserted=jdbc.update("""
                INSERT INTO platform.employee_occupation_profile(organization_id,learner_id,occupation_id,attempt_id,blueprint_id,
                    blueprint_version,catalog_fingerprint,required_skills,mastery,initialized_at)
                VALUES(:org,:learner,:occupation,:attempt,:blueprint,:version,:fingerprint,CAST(:skills AS jsonb),CAST(:mastery AS jsonb),:time)
                ON CONFLICT(organization_id,learner_id,occupation_id) DO NOTHING
                """,p);
        if(inserted==1) jdbc.update("""
                INSERT INTO platform.audit_event(audit_event_id,service_name,action,resource_id,resource_revision,occurred_at,outcome,correlation_id)
                VALUES(:audit,'local-occupation-profile','BASELINE_PROFILE_INITIALIZED',:attempt,'1',:time,'SUCCEEDED',:attempt)
                """,p.addValue("audit",UUID.randomUUID()));
    }
    @Override public List<MasteryProfile> mastery(Actor actor) {
        return jdbc.query("""
                SELECT p.*,v.occupation_name_snapshot FROM platform.employee_occupation_profile p
                JOIN platform.baseline_adaptive_blueprint_version v
                  ON v.blueprint_id=p.blueprint_id AND v.version=p.blueprint_version
                 AND v.organization_id=p.organization_id AND v.occupation_id=p.occupation_id
                WHERE p.organization_id=:org AND p.learner_id=:learner
                ORDER BY p.initialized_at DESC,p.occupation_id
                """,Map.of("org",actor.organizationId(),"learner",actor.learnerId()),(rs,n)-> {
            try {
                var values=json.readTree(rs.getString("mastery"));
                var skills=jdbc.query("""
                        SELECT s.micro_skill_id,s.confidence_label,
                          (SELECT MIN(b.micro_skill_name_snapshot) FROM platform.baseline_adaptive_blueprint_skill b
                           WHERE b.blueprint_id=:blueprint AND b.blueprint_version=:version
                             AND b.micro_skill_id=s.micro_skill_id) AS name
                        FROM platform.baseline_attempt_skill_result s
                        WHERE s.organization_id=:org AND s.attempt_id=:attempt ORDER BY s.micro_skill_id
                        """,Map.of("org",actor.organizationId(),"attempt",rs.getObject("attempt_id",UUID.class),
                                "blueprint",rs.getObject("blueprint_id",UUID.class),"version",rs.getInt("blueprint_version")),
                        (skill,i)-> {
                            var value=values.get(skill.getString("micro_skill_id"));
                            if(value==null || !value.isNumber()) throw new IllegalStateException("Profile mastery missing");
                            return new MasterySkill(skill.getString("micro_skill_id"),skill.getString("name"),
                                    value.doubleValue(),skill.getString("confidence_label"));
                        });
                if(skills.size()!=values.size()) throw new IllegalStateException("Profile evidence incomplete");
                return new MasteryProfile(rs.getString("occupation_id"),rs.getString("occupation_name_snapshot"),
                        rs.getObject("attempt_id",UUID.class),rs.getInt("blueprint_version"),rs.getTimestamp("initialized_at").toInstant(),skills);
            } catch(java.sql.SQLException e) { throw e; }
            catch(Exception e) { throw new IllegalStateException("Profile unavailable",e); }
        });
    }
    @Override public Optional<Progress> active(Actor actor) {
        var ids=jdbc.query("""
                SELECT attempt_id FROM platform.baseline_adaptive_attempt
                WHERE organization_id=:org AND learner_id=:learner AND state='IN_PROGRESS'
                ORDER BY started_at,attempt_id LIMIT 1
                """,Map.of("org",actor.organizationId(),"learner",actor.learnerId()),(rs,n)->rs.getObject(1,UUID.class));
        return ids.stream().findFirst().flatMap(id->attempts.findOwned(actor.organizationId(),actor.learnerId(),id))
                .map(a->new Progress("RESUME",a.snapshot().microSkillIds().size(),0,a.id(),a.snapshot().blueprint().id().version()));
    }
    @Override public Progress progress(Actor actor,Role role,Set<String> requiredSkills) {
        var scope=new AdaptiveAttempt.Scope(actor.organizationId(),actor.learnerId(),role.occupationId());
        var profile=jdbc.query("""
                SELECT required_skills,mastery,blueprint_version,attempt_id FROM platform.employee_occupation_profile
                WHERE organization_id=:org AND learner_id=:learner AND occupation_id=:occupation
                """,key(scope),(rs,n)-> {
                    try {
                        var required=json.readTree(rs.getString(1));var mastery=json.readTree(rs.getString(2));int covered=0;
                        for(var id:required) { var value=mastery.get(id.asText()); if(value!=null && value.isNumber()
                                && value.decimalValue().signum()>=0 && value.decimalValue().compareTo(BigDecimal.ONE)<=0) covered++; }
                        return new Progress(covered==required.size()?"COMPLETE":"PROFILE_INCOMPLETE",required.size(),covered,rs.getObject(4,UUID.class),rs.getInt(3));
                    }catch(Exception e){throw new IllegalStateException("Profile invalid",e);}
                });
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
                && new com.adaptlearngraph.assessment.adaptive.application.AdaptiveBlueprintValidator().shortages(v.configuration(),e).isEmpty()).isPresent();
        return new Progress(ready && v.configuration().occupationBounds()!=null?"BASELINE_REQUIRED":"BASELINE_UNAVAILABLE",required,0,null,v.id().version());
    }
    public boolean exists(AdaptiveAttempt.Scope scope) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.employee_occupation_profile WHERE organization_id=:org AND learner_id=:learner AND occupation_id=:occupation)",key(scope),Boolean.class));
    }
    private MapSqlParameterSource key(AdaptiveAttempt.Scope s) { return new MapSqlParameterSource("org",s.organizationId()).addValue("learner",s.learnerId()).addValue("occupation",s.occupationId()); }
    private String write(Object value) { try{return json.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException(e);} }
}
