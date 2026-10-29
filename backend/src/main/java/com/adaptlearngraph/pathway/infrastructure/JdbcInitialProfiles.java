package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.recommendation.domain.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Read-only V25 origin. Corruption/missing original results never become UNKNOWN. */
public final class JdbcInitialProfiles implements Profiles {
    private final NamedParameterJdbcTemplate jdbc; private final ObjectMapper json;
    public JdbcInitialProfiles(NamedParameterJdbcTemplate jdbc,ObjectMapper json) { this.jdbc=jdbc; this.json=json; }
    @Override public Profile require(Scope scope,String occupation) {
        var key=Map.of("org",scope.organizationId(),"learner",scope.learnerId(),"occupation",occupation);
        var found=jdbc.query("""
                SELECT p.*,a.state,a.model_version_id,a.mastery_mapping_version_id,a.parameter_set_id,
                    a.catalog_fingerprint AS attempt_fingerprint,a.blueprint_id AS attempt_blueprint,
                    a.blueprint_version AS attempt_blueprint_version
                FROM platform.employee_occupation_profile p
                LEFT JOIN platform.baseline_adaptive_attempt a ON a.attempt_id=p.attempt_id
                    AND a.organization_id=p.organization_id AND a.learner_id=p.learner_id AND a.occupation_id=p.occupation_id
                WHERE p.organization_id=:org AND p.learner_id=:learner AND p.occupation_id=:occupation
                """,key,(rs,n) -> {
            try {
                if (!Set.of("SUBMITTED","AUTO_SUBMITTED").contains(Objects.toString(rs.getString("state"),""))
                        || !rs.getString("catalog_fingerprint").equals(rs.getString("attempt_fingerprint"))
                        || !rs.getObject("blueprint_id").equals(rs.getObject("attempt_blueprint"))
                        || rs.getInt("blueprint_version")!=rs.getInt("attempt_blueprint_version")) throw new Failure(503,"PROFILE_INTEGRITY_FAILURE");
                UUID attempt=rs.getObject("attempt_id",UUID.class);
                var required=json.readTree(rs.getString("required_skills")); var mastery=json.readTree(rs.getString("mastery"));
                if (!required.isArray() || required.isEmpty() || !mastery.isObject()) throw new Failure(503,"PROFILE_INTEGRITY_FAILURE");
                Set<String> ids=new TreeSet<>();
                for (var id : required) if (!id.isTextual() || id.asText().isBlank() || !ids.add(id.asText())) throw new Failure(503,"PROFILE_INTEGRITY_FAILURE");
                if (ids.size()!=mastery.size()) throw new Failure(503,"PROFILE_INTEGRITY_FAILURE");
                var evidence=new TreeMap<String,RoleGap.Evidence>();
                jdbc.query("""
                        SELECT micro_skill_id,mastery,confidence_label,mastery_mapping_version_id
                        FROM platform.baseline_attempt_skill_result WHERE organization_id=:org AND attempt_id=:attempt
                        """,Map.of("org",scope.organizationId(),"attempt",attempt),(row,i) -> {
                    String id=row.getString("micro_skill_id"); var value=mastery.get(id);
                    if (!ids.contains(id) || value==null || !value.isNumber()
                            || value.decimalValue().compareTo(row.getBigDecimal("mastery"))!=0
                            || !row.getObject("mastery_mapping_version_id").equals(rs.getObject("mastery_mapping_version_id")))
                        throw new Failure(503,"PROFILE_INTEGRITY_FAILURE");
                    evidence.put(id,new RoleGap.Evidence(value.decimalValue(),row.getString("confidence_label"))); return id;
                });
                if (!ids.equals(evidence.keySet())) throw new Failure(503,"PROFILE_INTEGRITY_FAILURE");
                var pins=Map.of("blueprint",rs.getString("blueprint_id"),"blueprintVersion",rs.getString("blueprint_version"),
                        "model",rs.getString("model_version_id"),"mapping",rs.getString("mastery_mapping_version_id"),"parameters",rs.getString("parameter_set_id"));
                var values=new TreeMap<String,Object>(); evidence.forEach((id,e)->values.put(id,e.mastery()));
                String fingerprint=rs.getString("catalog_fingerprint");
                String hash=InitialIdentity.hash("profile",List.of(scope.organizationId(),scope.learnerId(),occupation,attempt,fingerprint,pins,values));
                return new Profile(attempt,hash,fingerprint,pins,evidence);
            } catch (Failure failure) { throw failure; }
            catch (Exception invalid) { throw new Failure(503,"PROFILE_INTEGRITY_FAILURE"); }
        });
        if (found.size()==1) return found.getFirst();
        boolean expected=Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM platform.baseline_adaptive_attempt
                    WHERE organization_id=:org AND learner_id=:learner AND occupation_id=:occupation AND state IN ('SUBMITTED','AUTO_SUBMITTED'))
                """,key,Boolean.class));
        throw new Failure(expected?503:422,expected?"PROFILE_UNAVAILABLE":"BASELINE_REQUIRED");
    }
}
