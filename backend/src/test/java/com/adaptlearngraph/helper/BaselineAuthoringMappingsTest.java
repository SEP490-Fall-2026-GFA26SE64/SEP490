package com.adaptlearngraph.helper;

import static org.assertj.core.api.Assertions.assertThat;

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
import com.adaptlearngraph.entities.domain.BaselineAssessmentDraft.Item;
import com.adaptlearngraph.entities.domain.BaselineAssessmentDraft.PublicationState;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.ActiveRelease;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.AssessmentVersionRef;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.BlueprintVersionRef;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.CandidateState;
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
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.RecordComponent;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;

/** Blueprint/assessment audit identity and request hashes never reach the baseline authoring responses. */
class BaselineAuthoringMappingsTest {
    private static final UUID ORGANIZATION = uuid(1);
    private static final UUID BLUEPRINT = uuid(2);
    private static final UUID CREATOR = UUID.fromString("c0ffee00-0000-4000-8000-00000000c0de");
    private static final UUID REVIEWER = UUID.fromString("feed0000-0000-4000-8000-00000000beef");
    private static final UUID ASSESSMENT_VERSION = uuid(4);
    private static final UUID ASSESSMENT = uuid(5);
    private static final UUID ITEM_VERSION = uuid(6);
    private static final String IDEMPOTENCY_KEY = "secret-idempotency-key";
    private static final String REQUEST_HASH = "b".repeat(64);
    private static final String GENERATION_HASH = "d".repeat(64);
    private static final String CONTENT_HASH = "a".repeat(64);
    private static final long SEED = 987654321L;
    private static final Instant CREATED = Instant.parse("2026-10-14T15:00:00Z");
    private static final Instant REVIEWED = Instant.parse("2026-10-15T09:30:00Z");

    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    private final ModelMapper mapper = ModelMapperFactory.create(List.of(new BaselineAuthoringMappings(json)));

    @Test
    void legacyBlueprintIncludesTotalsButNoAuditIdentity() throws Exception {
        var response = mapper.map(blueprint(), BlueprintResponse.class);

        assertThat(response).isEqualTo(new BlueprintResponse(BLUEPRINT, 3, "Java baseline", "occupation-java",
                "Java Engineer", CREATED, List.of(new RoleResponse("role-java", "Java Backend Engineer", true, 6,
                        new BigDecimal("0.3"), new BigDecimal("0.4"), new BigDecimal("0.3"), List.of(skill())))));
        assertNoAuditIdentity(BlueprintResponse.class, json.writeValueAsString(response));
    }

    @Test
    void managedBlueprintKeepsRoleConfigurationShapeWithoutAuditIdentity() throws Exception {
        var response = mapper.map(blueprint(), ManagedBlueprintResponse.class);

        assertThat(response).isEqualTo(new ManagedBlueprintResponse(BLUEPRINT, 3, "Java baseline", "occupation-java",
                "Java Engineer", CREATED, List.of(role())));
        String body = json.writeValueAsString(response);
        assertNoAuditIdentity(ManagedBlueprintResponse.class, body);
        assertThat(body).doesNotContain("totalQuestionCount", "participates");
    }

    @Test
    void legacyAssessmentDraftKeepsReviewMetadataButNeverCreatorOrGenerationRequest() throws Exception {
        var response = mapper.map(assessment(), AssessmentDraftResponse.class);

        assertThat(response).isEqualTo(new AssessmentDraftResponse(ASSESSMENT_VERSION, ASSESSMENT, 2, "Java baseline",
                BLUEPRINT, 3, SEED, CREATED, CONTENT_HASH, 4, "PUBLISHED", REVIEWER, REVIEWED, CONTENT_HASH, List.of(item())));
        String body = json.writeValueAsString(response);
        assertThat(components(AssessmentDraftResponse.class)).doesNotContain("createdBy", "generationRequestHash");
        assertThat(components(AssessmentItemResponse.class)).doesNotContain("protectedKey", "answerKey", "correctOptionId");
        assertThat(body).doesNotContain(CREATOR.toString(), GENERATION_HASH, "protectedKey", "answerKey")
                .contains("\"responseSchema\":{\"options\":[\"A\",\"B\"]}");
    }

    @Test
    void managedAssessmentOmitsSeedReviewerAndGenerationRequest() throws Exception {
        var response = mapper.map(assessment(), ManagedAssessmentResponse.class);

        assertThat(response).isEqualTo(new ManagedAssessmentResponse(ASSESSMENT_VERSION, ASSESSMENT, 2, "Java baseline",
                BLUEPRINT, 3, CREATED, CONTENT_HASH, 4, "PUBLISHED", REVIEWED, List.of(item())));
        String body = json.writeValueAsString(response);
        assertThat(components(ManagedAssessmentResponse.class)).doesNotContain("createdBy", "generationRequestHash",
                "generationSeed", "reviewedBy", "reviewedContentHash");
        assertThat(body).doesNotContain(CREATOR.toString(), REVIEWER.toString(), GENERATION_HASH, Long.toString(SEED));
    }

    @Test
    void workspaceMapsLifecycleWorkingRevisionAndVersionSummaries() throws Exception {
        UUID working = uuid(7);
        UUID openVersion = uuid(8);
        var pending = new BlueprintVersionRef(BLUEPRINT, 4);
        var lifecycle = new SeriesSnapshot(new Scope(ORGANIZATION, "occupation-java"), BLUEPRINT, 9, null, pending,
                new OpenCandidate(new AssessmentVersionRef(openVersion, 3, pending), CandidateState.REVIEWED, 5, CONTENT_HASH),
                new ActiveRelease(new AssessmentVersionRef(ASSESSMENT_VERSION, 2, new BlueprintVersionRef(BLUEPRINT, 3))));
        var draft = new BlueprintDraft("Java baseline", "occupation-java", "Java Engineer", List.of(roleConfig()));
        var workspace = new Workspace("occupation-java", "Java Engineer", lifecycle,
                new WorkingRevision(working, BLUEPRINT, 3, 6, draft, REVIEWED),
                List.of(new BlueprintVersionSummary(BLUEPRINT, 3, "Java baseline", "ACTIVE_SOURCE", CREATED)),
                List.of(new AssessmentVersionSummary(ASSESSMENT_VERSION, 2, 3, "ACTIVE", CONTENT_HASH, CREATED)));

        var response = mapper.map(workspace, WorkspaceResponse.class);

        var pendingRef = new BlueprintVersionRefResponse(BLUEPRINT, 4);
        assertThat(response).isEqualTo(new WorkspaceResponse("occupation-java", "Java Engineer",
                new SeriesSnapshotResponse(new SeriesScopeResponse(ORGANIZATION, "occupation-java"), BLUEPRINT, 9, null,
                        pendingRef,
                        new OpenCandidateResponse(new AssessmentVersionRefResponse(openVersion, 3, pendingRef), "REVIEWED", 5,
                                CONTENT_HASH),
                        new ActiveReleaseResponse(new AssessmentVersionRefResponse(ASSESSMENT_VERSION, 2,
                                new BlueprintVersionRefResponse(BLUEPRINT, 3)))),
                new WorkingRevisionResponse(working, BLUEPRINT, 3, 6,
                        new BlueprintDraftResponse("Java baseline", "occupation-java", "Java Engineer", List.of(role())),
                        REVIEWED),
                List.of(new BlueprintVersionSummaryResponse(BLUEPRINT, 3, "Java baseline", "ACTIVE_SOURCE", CREATED)),
                List.of(new AssessmentVersionSummaryResponse(ASSESSMENT_VERSION, 2, 3, "ACTIVE", CONTENT_HASH, CREATED))));
        assertThat(json.writeValueAsString(response)).doesNotContain("pendingStage");
    }

    private void assertNoAuditIdentity(Class<?> type, String body) {
        assertThat(components(type)).doesNotContain("createdBy", "idempotencyKey", "requestHash");
        assertThat(body).doesNotContain(CREATOR.toString(), IDEMPOTENCY_KEY, REQUEST_HASH);
    }

    private static List<String> components(Class<?> type) {
        return Arrays.stream(type.getRecordComponents()).map(RecordComponent::getName).toList();
    }

    private static BaselineBlueprint blueprint() {
        return new BaselineBlueprint(BLUEPRINT, 3, "Java baseline", "occupation-java", "Java Engineer", CREATOR,
                IDEMPOTENCY_KEY, REQUEST_HASH, CREATED, List.of(roleConfig()));
    }

    private static RoleConfig roleConfig() {
        return new RoleConfig("role-java", "Java Backend Engineer", true, new BigDecimal("0.3"), new BigDecimal("0.4"),
                new BigDecimal("0.3"), List.of(new SkillConfig("skill-java", "Java Core", 1, 2, 3)));
    }

    private static RoleConfigResponse role() {
        return new RoleConfigResponse("role-java", "Java Backend Engineer", true, new BigDecimal("0.3"),
                new BigDecimal("0.4"), new BigDecimal("0.3"), List.of(skill()));
    }

    private static SkillConfigResponse skill() {
        return new SkillConfigResponse("skill-java", "Java Core", 1, 2, 3);
    }

    private BaselineAssessmentDraft assessment() {
        return new BaselineAssessmentDraft(ASSESSMENT_VERSION, ASSESSMENT, 2, "Java baseline", BLUEPRINT, 3, SEED, CREATOR,
                CREATED, GENERATION_HASH, CONTENT_HASH, 4, PublicationState.PUBLISHED, REVIEWER, REVIEWED, CONTENT_HASH,
                List.of(new Item(1, ITEM_VERSION, "role-java", "Java Backend Engineer", "skill-java", "Java Core", "EASY",
                        new BigDecimal("0.5"), "What is encapsulation?", "{\"options\":[\"A\",\"B\"]}")));
    }

    private AssessmentItemResponse item() throws Exception {
        return new AssessmentItemResponse(1, ITEM_VERSION, "role-java", "Java Backend Engineer", "skill-java", "Java Core",
                "EASY", new BigDecimal("0.5"), "What is encapsulation?", json.readTree("{\"options\":[\"A\",\"B\"]}"));
    }

    private static UUID uuid(long value) {
        return new UUID(0L, value);
    }
}