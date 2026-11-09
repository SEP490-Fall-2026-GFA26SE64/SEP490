package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.AssessmentPolicyScope.*;
import com.adaptlearngraph.entities.domain.RuleAssessment.Purpose;
import java.util.*;

public interface AssessmentPolicyCatalog {
    List<Scope> scopes(UUID organization,Purpose purpose);
    default Discovery discover(UUID organization,Purpose purpose){return new Discovery(scopes(organization,purpose),List.of());}
}
