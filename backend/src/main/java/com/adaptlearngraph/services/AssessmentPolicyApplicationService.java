package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.AssessmentPolicyDto.ActivateRequest;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.PageResponse;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.SaveRequest;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.SavedResponse;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.StateResponse;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.Values;
import java.util.Objects;
import org.modelmapper.ModelMapper;

/** DTO boundary of the assessment policy API; the organization and actor always come from trusted context. */
public class AssessmentPolicyApplicationService {
    private final AssessmentPolicyUseCase policies;
    private final ModelMapper mapper;

    public AssessmentPolicyApplicationService(AssessmentPolicyUseCase policies, ModelMapper mapper) {
        this.policies = Objects.requireNonNull(policies, "policies");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public void authorize() {
        policies.authorize();
    }

    public StateResponse read() {
        return map(policies.read(), StateResponse.class);
    }

    public PageResponse list(int page, int size) {
        return map(policies.list(page, size), PageResponse.class);
    }

    public SavedResponse save(SaveRequest request) {
        var values = new Values(request.stopSe(), request.highConfidenceSe(), request.mediumConfidenceSe(), request.k());
        return map(policies.save(request.commandKey(), values), SavedResponse.class);
    }

    public StateResponse activate(ActivateRequest request) {
        return map(policies.activate(request.commandKey(), request.policyVersionId(), request.expectedActivationRevision()),
                StateResponse.class);
    }

    private <D> D map(Object source, Class<D> type) {
        return source == null ? null : mapper.map(source, type);
    }
}