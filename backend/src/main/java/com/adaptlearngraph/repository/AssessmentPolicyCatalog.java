package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.AssessmentPolicyScope.*;
import com.adaptlearngraph.entities.domain.RuleAssessment.Purpose;
import java.util.*;

public interface AssessmentPolicyCatalog {
    /** Server-owned Role membership; a null Expert selects all live Role memberships for learner resolution. */
    default Map<String,Set<String>> roleSkills(UUID organization,UUID expert){return Map.of();}
    List<Scope> scopes(UUID organization,Purpose purpose);
    default Discovery discover(UUID organization,Purpose purpose){return new Discovery(scopes(organization,purpose),List.of());}
    /** Configuration authority only. Learner paper discovery must keep the full catalog. */
    default Discovery discoverForEditor(UUID organization,Purpose purpose,UUID expert) {
        return purpose==Purpose.BASELINE?discover(organization,purpose):new Discovery(List.of(),List.of());
    }
}
