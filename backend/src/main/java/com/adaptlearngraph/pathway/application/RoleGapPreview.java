package com.adaptlearngraph.pathway.application;

import com.adaptlearngraph.recommendation.domain.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import java.util.*;

/** REQ-041-F02: no writes, including no learner audit/snapshot on preview. */
public final class RoleGapPreview {
    public record Preview(String businessRoleId, String roleId, String levelId, String roleName, String levelName,
                          UUID expectedSelectionId, Long expectedSelectionRevision,
                          String gapInputHash, Map<String,String> versions, RoleGap.Result result) {}
    public record Prepared(Binding binding, Profile profile, Preview preview) {}
    private final Actors actors; private final Bindings bindings; private final Profiles profiles;
    private final Semantics semantics; private final Coordination coordination;
    public RoleGapPreview(Actors actors, Bindings bindings, Profiles profiles, Semantics semantics, Coordination coordination) {
        this.actors=actors; this.bindings=bindings; this.profiles=profiles; this.semantics=semantics; this.coordination=coordination;
    }
    public Preview preview(String roleId,String levelId) { return prepare(actors.require(),roleId,levelId).preview(); }
    public Prepared prepare(Actor actor,String roleId,String levelId) {
        actor.require(Role.EMPLOYEE);InitialPathwayPorts.text(roleId);InitialPathwayPorts.text(levelId);var scope=Scope.own(actor);
        var binding=bindings.require(actor,roleId,levelId);
        if (!binding.roleId().equals(roleId) || !binding.levelId().equals(levelId)
                || !binding.businessRoleId().equals(InitialCatalogPort.choiceId(roleId,levelId))) throw new Failure(503,"INVALID_ROLE_BINDING");
        var profile=profiles.require(scope,binding.occupationId());
        var compatible=semantics.resolve(binding,profile);
        if (!compatible.version().equals(binding.versions().get("compatibility"))) throw new Failure(503,"INCOHERENT_SOURCE");
        // A semantics adapter cannot replace stored mastery, relabel an original absence as corruption,
        // or turn a known record into a different numeric evidence value.
        compatible.compatible().forEach((id,e) -> {
            if (!e.equals(profile.evidence().get(id))) throw new Failure(503,"INVALID_COMPATIBILITY_RESULT");
        });
        var result=RoleGap.calculate(binding.requirements(),compatible.compatible(),compatible.unknownReasons());
        var requirements=binding.requirements().stream().sorted(Comparator.comparing(RoleGap.Requirement::skillId))
                .map(r -> List.of(r.skillId(),r.requiredScore(),r.mandatory())).toList();
        var evidence=result.skills().stream().map(r -> Arrays.asList(r.skillId(),r.evidenceState(),r.mastery(),r.unknownReason())).toList();
        var gapVersions=new TreeMap<String,String>();
        for(String key:List.of("catalog","binding","publication","requirements","compatibility"))gapVersions.put(key,binding.versions().get(key));
        String hash=InitialIdentity.hash("gap",List.of(scope.organizationId(),scope.learnerId(),binding.businessRoleId(),
                binding.roleId(),binding.levelId(),binding.releaseToken(),gapVersions,profile.attemptId(),profile.profileHash(),
                "stored-conservative-gap-v1",requirements,evidence));
        bindings.assertCurrent(scope,binding);
        var selection=coordination.current(scope);
        return new Prepared(binding,profile,new Preview(binding.businessRoleId(),binding.roleId(),binding.levelId(),binding.roleName(),binding.levelName(),
                selection.map(Selection::id).orElse(null),selection.map(Selection::revision).orElse(null),hash,Map.copyOf(gapVersions),result));
    }
}
