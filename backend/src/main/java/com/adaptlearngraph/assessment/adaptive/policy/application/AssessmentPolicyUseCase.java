package com.adaptlearngraph.assessment.adaptive.policy.application;

import com.adaptlearngraph.assessment.adaptive.policy.domain.OrganizationAssessmentPolicy.*;
import java.util.UUID;

/** Trusted own-organization inbound capabilities, independent of catalog readiness. */
public interface AssessmentPolicyUseCase {
    void authorize();
    State read();
    Page list(int page,int size);
    Saved save(UUID commandKey,Values values);
    State activate(UUID commandKey,UUID policyVersionId,long expectedActivationRevision);
}
