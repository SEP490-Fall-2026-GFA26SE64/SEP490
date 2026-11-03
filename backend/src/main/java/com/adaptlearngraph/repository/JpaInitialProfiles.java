package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.InitialIdentity;
import com.adaptlearngraph.entities.domain.RoleGap;
import com.adaptlearngraph.repository.EmployeeOccupationProfileJpaRepository.OriginRow;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

/** Read-only V25 origin. Corruption/missing original results never become UNKNOWN. */
public final class JpaInitialProfiles implements Profiles {
    private final EmployeeOccupationProfileJpaRepository profiles; private final ObjectMapper json;
    public JpaInitialProfiles(EmployeeOccupationProfileJpaRepository profiles,ObjectMapper json) { this.profiles=profiles; this.json=json; }
    @Override public Profile require(Scope scope,String occupation) {
        var found=profiles.origin(scope.organizationId(),scope.learnerId(),occupation).stream().map(row->profile(scope,occupation,row)).toList();
        if (found.size()==1) return found.getFirst();
        boolean expected=profiles.hasSubmittedAttempt(scope.organizationId(),scope.learnerId(),occupation);
        throw new Failure(expected?503:422,expected?"PROFILE_UNAVAILABLE":"BASELINE_REQUIRED");
    }
    private Profile profile(Scope scope,String occupation,OriginRow row) {
        try {
            if (!Set.of("SUBMITTED","AUTO_SUBMITTED").contains(Objects.toString(row.state(),""))
                    || !row.catalogFingerprint().equals(row.attemptFingerprint())
                    || !row.blueprintId().equals(row.attemptBlueprint())
                    || row.blueprintVersion().intValue()!=row.attemptBlueprintVersion().intValue()) throw new Failure(503,"PROFILE_INTEGRITY_FAILURE");
            UUID attempt=row.attemptId();
            var policy=com.adaptlearngraph.helper.AssessmentPolicyProvenance.read(row.policyMode(),row.policyVersionId(),row.policyHash(),
                    row.policySnapshot(),json,scope.organizationId());
            var required=json.readTree(row.requiredSkills()); var mastery=json.readTree(row.mastery());
            if (!required.isArray() || required.isEmpty() || !mastery.isObject()) throw new Failure(503,"PROFILE_INTEGRITY_FAILURE");
            Set<String> ids=new TreeSet<>();
            for (var id : required) if (!id.isTextual() || id.asText().isBlank() || !ids.add(id.asText())) throw new Failure(503,"PROFILE_INTEGRITY_FAILURE");
            if (ids.size()!=mastery.size()) throw new Failure(503,"PROFILE_INTEGRITY_FAILURE");
            var evidence=new TreeMap<String,RoleGap.Evidence>();
            for (var skill : profiles.originSkills(scope.organizationId(),attempt)) {
                String id=skill.microSkillId(); var value=mastery.get(id);
                if (!ids.contains(id) || value==null || !value.isNumber()
                        || value.decimalValue().compareTo(skill.mastery())!=0
                        || !skill.masteryMappingVersionId().equals(row.masteryMappingVersionId())
                        || !Objects.equals(skill.policyVersionId(),policy.map(p->p.versionId()).orElse(null))
                        || !Objects.equals(skill.policyHash(),policy.map(p->p.hash()).orElse(null))
                        || !Objects.equals(skill.evidencePolicy(),skill.policyVersionId())
                        || !Objects.equals(skill.evidenceHash(),skill.policyHash()))
                    throw new Failure(503,"PROFILE_INTEGRITY_FAILURE");
                evidence.put(id,new RoleGap.Evidence(value.decimalValue(),skill.confidenceLabel()));
            }
            if (!ids.equals(evidence.keySet())) throw new Failure(503,"PROFILE_INTEGRITY_FAILURE");
            Map<String,String> pins=new TreeMap<>(Map.of("blueprint",text(row.blueprintId()),"blueprintVersion",text(row.blueprintVersion()),
                    "model",text(row.modelVersionId()),"mapping",text(row.masteryMappingVersionId()),"parameters",text(row.parameterSetId())));
            policy.ifPresent(p->{pins.put("assessmentPolicy",p.versionId().toString());pins.put("assessmentPolicyHash",p.hash());});
            var values=new TreeMap<String,Object>(); evidence.forEach((id,e)->values.put(id,e.mastery()));
            String fingerprint=row.catalogFingerprint();
            String hash=InitialIdentity.hash("profile",List.of(scope.organizationId(),scope.learnerId(),occupation,attempt,fingerprint,pins,values));
            return new Profile(attempt,hash,fingerprint,pins,evidence);
        } catch (Failure failure) { throw failure; }
        catch (Exception invalid) { throw new Failure(503,"PROFILE_INTEGRITY_FAILURE"); }
    }
    /** Database text form of a column value; null stays null. */
    private static String text(Object value) { return value==null?null:value.toString(); }
}
