package com.adaptlearngraph.assessment.application.port.in;

import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft;
import java.util.UUID;

public interface BaselineAssessmentDraftUseCase {
    BaselineAssessmentDraft generate(UUID blueprintId, int blueprintVersion, String idempotencyKey);

    BaselineAssessmentDraft get(UUID assessmentVersionId);

    BaselineAssessmentDraft review(UUID assessmentVersionId, String expectedContentHash);

    BaselineAssessmentDraft publish(UUID assessmentVersionId, String expectedContentHash);
}
