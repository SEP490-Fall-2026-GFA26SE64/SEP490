package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.BaselineAuthoringDto.ActiveReleaseResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.AssessmentDraftResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.AssessmentItemResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.AssessmentVersionRefResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.AssessmentVersionSummaryResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.BlueprintDraftResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.BlueprintResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.BlueprintVersionRefResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.BlueprintVersionSummaryResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.ManagedAssessmentResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.ManagedBlueprintResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.OpenCandidateResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.RoleConfigResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.RoleResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.SeriesScopeResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.SeriesSnapshotResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.SkillConfigResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.WorkingRevisionResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.WorkspaceResponse;
import com.adaptlearngraph.entities.domain.BaselineAssessmentDraft;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.ActiveRelease;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.AssessmentVersionRef;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.BlueprintVersionRef;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.OpenCandidate;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.Scope;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.SeriesSnapshot;
import com.adaptlearngraph.entities.domain.BaselineBlueprint;
import com.adaptlearngraph.entities.domain.BaselineBlueprint.RoleConfig;
import com.adaptlearngraph.entities.domain.BaselineBlueprint.SkillConfig;
import com.adaptlearngraph.services.BaselineAssessmentManagementUseCase.AssessmentVersionSummary;
import com.adaptlearngraph.services.BaselineAssessmentManagementUseCase.BlueprintVersionSummary;
import com.adaptlearngraph.services.BaselineAssessmentManagementUseCase.WorkingRevision;
import com.adaptlearngraph.services.BaselineAssessmentManagementUseCase.Workspace;
import com.adaptlearngraph.services.BaselineBlueprintUseCase.BlueprintDraft;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Objects;
import org.modelmapper.ModelMapper;
import org.modelmapper.spi.MappingContext;

/**
 * TypeMaps for the baseline blueprint and baseline assessment management APIs. Blueprint creator, idempotency key and
 * request hash, and assessment creator and generation request hash stay server-side; the management projection also
 * omits generation seed and review actor. Stored response schemas are returned as parsed JSON.
 */
public final class BaselineAuthoringMappings implements ModelMapperRegistrar {
    private final ObjectMapper json;

    public BaselineAuthoringMappings(ObjectMapper json) {
        this.json = Objects.requireNonNull(json, "json");
    }

    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(SkillConfig.class, SkillConfigResponse.class).setConverter(context -> {
            SkillConfig source = context.getSource();
            return new SkillConfigResponse(source.microSkillId(), source.microSkillNameSnapshot(),
                    source.easyQuestionCount(), source.mediumQuestionCount(), source.hardQuestionCount());
        });
        mapper.typeMap(RoleConfig.class, RoleConfigResponse.class).setConverter(context -> {
            RoleConfig source = context.getSource();
            return new RoleConfigResponse(source.roleId(), source.roleNameSnapshot(), source.enabled(),
                    source.easyScoreWeight(), source.mediumScoreWeight(), source.hardScoreWeight(),
                    list(context, source.skills(), SkillConfigResponse.class));
        });
        mapper.typeMap(RoleConfig.class, RoleResponse.class).setConverter(context -> {
            RoleConfig source = context.getSource();
            return new RoleResponse(source.roleId(), source.roleNameSnapshot(), source.enabled(), source.totalQuestionCount(),
                    source.easyScoreWeight(), source.mediumScoreWeight(), source.hardScoreWeight(),
                    list(context, source.skills(), SkillConfigResponse.class));
        });
        mapper.typeMap(BaselineBlueprint.class, BlueprintResponse.class).setConverter(context -> {
            BaselineBlueprint source = context.getSource();
            return new BlueprintResponse(source.blueprintId(), source.version(), source.name(), source.jobPositionId(),
                    source.jobPositionNameSnapshot(), source.createdAt(), list(context, source.roles(), RoleResponse.class));
        });
        mapper.typeMap(BaselineBlueprint.class, ManagedBlueprintResponse.class).setConverter(context -> {
            BaselineBlueprint source = context.getSource();
            return new ManagedBlueprintResponse(source.blueprintId(), source.version(), source.name(), source.jobPositionId(),
                    source.jobPositionNameSnapshot(), source.createdAt(), list(context, source.roles(), RoleConfigResponse.class));
        });
        mapper.typeMap(BaselineAssessmentDraft.Item.class, AssessmentItemResponse.class).setConverter(context -> {
            BaselineAssessmentDraft.Item source = context.getSource();
            return new AssessmentItemResponse(source.position(), source.itemVersionId(), source.roleId(),
                    source.roleNameSnapshot(), source.microSkillId(), source.microSkillNameSnapshot(), source.difficulty(),
                    source.scoringWeight(), source.prompt(), parse(source.responseSchemaJson()));
        });
        mapper.typeMap(BaselineAssessmentDraft.class, AssessmentDraftResponse.class).setConverter(context -> {
            BaselineAssessmentDraft source = context.getSource();
            return new AssessmentDraftResponse(source.assessmentVersionId(), source.assessmentId(), source.version(),
                    source.title(), source.blueprintId(), source.blueprintVersion(), source.generationSeed(),
                    source.createdAt(), source.contentHash(), source.draftRevision(), source.publicationState().name(),
                    source.reviewedBy(), source.reviewedAt(), source.reviewedContentHash(),
                    list(context, source.items(), AssessmentItemResponse.class));
        });
        mapper.typeMap(BaselineAssessmentDraft.class, ManagedAssessmentResponse.class).setConverter(context -> {
            BaselineAssessmentDraft source = context.getSource();
            return new ManagedAssessmentResponse(source.assessmentVersionId(), source.assessmentId(), source.version(),
                    source.title(), source.blueprintId(), source.blueprintVersion(), source.createdAt(),
                    source.contentHash(), source.draftRevision(), source.publicationState().name(), source.reviewedAt(),
                    list(context, source.items(), AssessmentItemResponse.class));
        });
        mapper.typeMap(BlueprintDraft.class, BlueprintDraftResponse.class).setConverter(context -> {
            BlueprintDraft source = context.getSource();
            return new BlueprintDraftResponse(source.name(), source.jobPositionId(), source.jobPositionNameSnapshot(),
                    list(context, source.roles(), RoleConfigResponse.class));
        });
        mapper.typeMap(WorkingRevision.class, WorkingRevisionResponse.class).setConverter(context -> {
            WorkingRevision source = context.getSource();
            return new WorkingRevisionResponse(source.workingRevisionId(), source.blueprintId(), source.baseVersion(),
                    source.revision(), nested(context, source.draft(), BlueprintDraftResponse.class), source.updatedAt());
        });
        mapper.typeMap(Scope.class, SeriesScopeResponse.class).setConverter(context ->
                new SeriesScopeResponse(context.getSource().organizationId(), context.getSource().jobPositionId()));
        mapper.typeMap(BlueprintVersionRef.class, BlueprintVersionRefResponse.class).setConverter(context ->
                new BlueprintVersionRefResponse(context.getSource().blueprintId(), context.getSource().version()));
        mapper.typeMap(AssessmentVersionRef.class, AssessmentVersionRefResponse.class).setConverter(context -> {
            AssessmentVersionRef source = context.getSource();
            return new AssessmentVersionRefResponse(source.assessmentVersionId(), source.version(),
                    nested(context, source.blueprint(), BlueprintVersionRefResponse.class));
        });
        mapper.typeMap(OpenCandidate.class, OpenCandidateResponse.class).setConverter(context -> {
            OpenCandidate source = context.getSource();
            return new OpenCandidateResponse(nested(context, source.assessment(), AssessmentVersionRefResponse.class),
                    source.state() == null ? null : source.state().name(), source.draftRevision(), source.contentHash());
        });
        mapper.typeMap(ActiveRelease.class, ActiveReleaseResponse.class).setConverter(context ->
                new ActiveReleaseResponse(nested(context, context.getSource().assessment(), AssessmentVersionRefResponse.class)));
        mapper.typeMap(SeriesSnapshot.class, SeriesSnapshotResponse.class).setConverter(context -> {
            SeriesSnapshot source = context.getSource();
            return new SeriesSnapshotResponse(nested(context, source.scope(), SeriesScopeResponse.class), source.blueprintId(),
                    source.seriesRevision(), source.workingRevisionId(),
                    nested(context, source.pendingBlueprint(), BlueprintVersionRefResponse.class),
                    nested(context, source.openCandidate(), OpenCandidateResponse.class),
                    nested(context, source.activeRelease(), ActiveReleaseResponse.class));
        });
        mapper.typeMap(BlueprintVersionSummary.class, BlueprintVersionSummaryResponse.class).setConverter(context -> {
            BlueprintVersionSummary source = context.getSource();
            return new BlueprintVersionSummaryResponse(source.blueprintId(), source.version(), source.name(),
                    source.projection(), source.createdAt());
        });
        mapper.typeMap(AssessmentVersionSummary.class, AssessmentVersionSummaryResponse.class).setConverter(context -> {
            AssessmentVersionSummary source = context.getSource();
            return new AssessmentVersionSummaryResponse(source.assessmentVersionId(), source.version(),
                    source.blueprintVersion(), source.effectiveState(), source.contentHash(), source.createdAt());
        });
        mapper.typeMap(Workspace.class, WorkspaceResponse.class).setConverter(context -> {
            Workspace source = context.getSource();
            return new WorkspaceResponse(source.jobPositionId(), source.jobPositionName(),
                    nested(context, source.lifecycle(), SeriesSnapshotResponse.class),
                    nested(context, source.workingRevision(), WorkingRevisionResponse.class),
                    list(context, source.blueprintVersions(), BlueprintVersionSummaryResponse.class),
                    list(context, source.assessmentVersions(), AssessmentVersionSummaryResponse.class));
        });
    }

    private JsonNode parse(String value) {
        try {
            return json.readTree(value);
        } catch (JsonProcessingException invalid) {
            throw new IllegalStateException("Stored response schema is invalid JSON", invalid);
        }
    }

    private static <D> D nested(MappingContext<?, ?> context, Object source, Class<D> type) {
        return source == null ? null : context.getMappingEngine().map(context.create(source, type));
    }

    private static <D> List<D> list(MappingContext<?, ?> context, List<?> source, Class<D> type) {
        return source == null ? null : source.stream().map(item -> nested(context, item, type)).toList();
    }
}