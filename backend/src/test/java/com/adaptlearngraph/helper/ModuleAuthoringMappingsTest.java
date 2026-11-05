package com.adaptlearngraph.helper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.dtos.LearningContentDto.AssetResponse;
import com.adaptlearngraph.dtos.LearningContentDto.ImportPreviewResponse;
import com.adaptlearngraph.dtos.LearningContentDto.ImportProblemResponse;
import com.adaptlearngraph.dtos.LearningContentDto.ImportRowResponse;
import com.adaptlearngraph.dtos.LearningContentDto.IntervalResponse;
import com.adaptlearngraph.dtos.LearningContentDto.LearningViewResponse;
import com.adaptlearngraph.dtos.LearningContentDto.LimitsRequest;
import com.adaptlearngraph.dtos.LearningContentDto.LimitsResponse;
import com.adaptlearngraph.dtos.LearningContentDto.NotificationResponse;
import com.adaptlearngraph.dtos.LearningContentDto.ProgressResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.ActorResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.CatalogItemResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.CatalogModuleResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.CatalogPageResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.CatalogTeachingResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.ContentResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.DocumentResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.EventResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.IntakeResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.LessonRequest;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.LessonResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.MetadataResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.ModuleInput;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.PackageResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.PageResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.RevisionResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.TeachingResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.TeachingSelection;
import com.adaptlearngraph.entities.domain.LearningContent.Interval;
import com.adaptlearngraph.entities.domain.LearningContent.Lesson;
import com.adaptlearngraph.entities.domain.LearningResources.Asset;
import com.adaptlearngraph.entities.domain.LearningResources.LearningView;
import com.adaptlearngraph.entities.domain.LearningResources.Limits;
import com.adaptlearngraph.entities.domain.LearningResources.Notification;
import com.adaptlearngraph.entities.domain.LearningResources.Progress;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Actor;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.CatalogItem;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.CatalogModule;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.CatalogPage;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.CatalogTeaching;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Content;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Document;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Event;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Intake;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Metadata;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Package;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Page;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Revision;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Save;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Teaching;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.TeachingInput;
import com.adaptlearngraph.services.LearningImportUseCase.Preview;
import com.adaptlearngraph.services.LearningImportUseCase.Problem;
import com.adaptlearngraph.services.LearningImportUseCase.Row;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.RecordComponent;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;

/**
 * Module authoring and learning content TypeMaps copy every established value; uploaded asset storage metadata keeps
 * its current owner-only exposure and upload limit changes never accept audit identity from the request body.
 */
class ModuleAuthoringMappingsTest {
    private static final String OBJECT_KEY = "org-1/assets/9f1c-private-object-key";
    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    private final ModelMapper mapper = ModelMapperFactory.create(List.of(new ModuleAuthoringMappings(), new LearningContentMappings()));

    @Test
    void documentWithRevisionsHistoryAndIntakeCopiesEveryValue() {
        var document = new Document("module-1", "org-1", List.of("occ-1"), "expert-1", "2026-10-01T00:00:00Z", 4, true, false, 2,
                List.of(revision()), List.of(event()), intake());

        assertThat(mapper.map(document, DocumentResponse.class)).isEqualTo(documentResponse());
        assertThat(mapper.map(new Page(List.of(document), 1, 1, 10), PageResponse.class))
                .isEqualTo(new PageResponse(List.of(documentResponse()), 1, 1, 10));
        assertThat(mapper.map(new CatalogPage(List.of(new CatalogItem(catalogModule(), document)), 1, 1, 10),
                CatalogPageResponse.class)).isEqualTo(new CatalogPageResponse(List.of(new CatalogItemResponse(
                        catalogModuleResponse(), documentResponse(), intakeResponse())), 1, 1, 10));
        assertThat(mapper.map(new Actor("expert-1", "org-1", Set.of("EXPERT")), ActorResponse.class))
                .isEqualTo(new ActorResponse("expert-1", "org-1", Set.of("EXPERT")));
    }

    @Test
    void uploadedAssetKeepsItsEstablishedOwnerOnlyStorageMetadata() throws Exception {
        var asset = new Asset("asset-1", "org-1", "expert-1", OBJECT_KEY, "intro.mp4", "video/mp4", 1024, "e".repeat(64), 12.5,
                "2026-10-01T00:00:00Z");

        var response = mapper.map(asset, AssetResponse.class);

        assertThat(response).isEqualTo(new AssetResponse("asset-1", "org-1", "expert-1", OBJECT_KEY, "intro.mp4", "video/mp4",
                1024, "e".repeat(64), 12.5, "2026-10-01T00:00:00Z"));
        assertThat(json.writeValueAsString(response)).contains(OBJECT_KEY);
    }

    @Test
    void uploadLimitChangesNeverAcceptAuditIdentityFromTheBody() throws Exception {
        assertThat(Arrays.stream(LimitsRequest.class.getRecordComponents()).map(RecordComponent::getName))
                .containsExactly("videoBytes", "imageBytes", "zipBytes", "version");
        // Spring Boot's HTTP mapper ignores unknown properties: forged audit fields are dropped, never bound.
        var request = json.copy().disable(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).readValue("{\"videoBytes\":104857600,\"imageBytes\":2097152,\"zipBytes\":104857600,\"version\":3,"
                + "\"changedBy\":\"forged-admin\",\"changedAt\":\"2000-01-01T00:00:00Z\"}",
                LimitsRequest.class);
        assertThat(request).isEqualTo(new LimitsRequest(104857600, 2097152, 104857600, 3));
        assertThatThrownBy(() -> new LimitsRequest(1, 1, 1, 1)).isInstanceOf(IllegalArgumentException.class);

        var limits = new Limits(104857600, 2097152, 104857600, 4, "admin-1", "2026-10-01T00:00:00Z");
        assertThat(mapper.map(limits, LimitsResponse.class))
                .isEqualTo(new LimitsResponse(104857600, 2097152, 104857600, 4, "admin-1", "2026-10-01T00:00:00Z"));
    }

    @Test
    void learningViewProgressNotificationsAndImportPreviewCopyEveryValue() {
        var progress = new Progress("lesson-1", 30.5, List.of(new Interval(0, 30.5)), false, null, "2026-10-02T00:00:00Z",
                "2026-10-02T00:00:01Z");
        var progressResponse = new ProgressResponse("lesson-1", 30.5, List.of(new IntervalResponse(0, 30.5)), false, null,
                "2026-10-02T00:00:00Z", "2026-10-02T00:00:01Z");
        assertThat(mapper.map(new LearningView(revision(), 3, "lesson-1", List.of(progress)), LearningViewResponse.class))
                .isEqualTo(new LearningViewResponse(revisionResponse(), 3, "lesson-1", List.of(progressResponse)));
        assertThat(mapper.map(new Notification("n-1", "ISSUE", "module-1", "Title", "Body", "c", "r"), NotificationResponse.class))
                .isEqualTo(new NotificationResponse("n-1", "ISSUE", "module-1", "Title", "Body", "c", "r"));

        var save = new Save("Intro", "LESSON_AND_PRACTICE", "content-1", 30, new BigDecimal("150000.50"), List.of("occ-1"),
                List.of(new TeachingInput("skill-1", "PRIMARY", "LOW")));
        var preview = new Preview("import-1", List.of(new Row("module-1", 2, save, List.of(lesson()), 4L)),
                List.of(new Problem("module-2", 3, "Missing title")), List.of("module-1"), false);
        assertThat(mapper.map(preview, ImportPreviewResponse.class)).isEqualTo(new ImportPreviewResponse("import-1",
                List.of(new ImportRowResponse("module-1", 2, new ModuleInput("Intro", "LESSON_AND_PRACTICE", "content-1", 30,
                        new BigDecimal("150000.50"), List.of("occ-1"), List.of(new TeachingSelection("skill-1"))),
                        List.of(lessonResponse()), 4L)),
                List.of(new ImportProblemResponse("module-2", 3, "Missing title")), List.of("module-1"), false));
    }

    @Test
    void lessonRequestsAreValidatedWithTheStoredLessonRules() {
        assertThat(new LessonRequest("lesson-1", "Intro", "TEXT", "Body", "MARKDOWN", 60, "ESTIMATED", null, null, null).id())
                .isEqualTo("lesson-1");
        assertThatThrownBy(() -> new LessonRequest("bad id!", "Intro", "TEXT", "Body", "MARKDOWN", 60, "ESTIMATED", null, null,
                null)).isInstanceOf(IllegalArgumentException.class);
    }

    private static Lesson lesson() {
        return new Lesson("lesson-1", "Intro", "TEXT", "Body text", "MARKDOWN", 120, "ESTIMATED", null, null, null);
    }

    private static LessonResponse lessonResponse() {
        return new LessonResponse("lesson-1", "Intro", "TEXT", "Body text", "MARKDOWN", 120, "ESTIMATED", null, null, null);
    }

    private static Metadata metadata() {
        return new Metadata("meta-1", "1.0.0", "ACTIVE", "APPROVED", "manager-1", "2026-10-03T00:00:00Z");
    }

    private static MetadataResponse metadataResponse() {
        return new MetadataResponse("meta-1", "1.0.0", "ACTIVE", "APPROVED", "manager-1", "2026-10-03T00:00:00Z");
    }

    private static Revision revision() {
        var content = new Content("content-1", "Intro", "Body text", "text/markdown", "1.0.0", List.of("occ-1"), "expert-1",
                "2026-10-01T00:00:00Z", List.of(lesson()));
        var pack = new Package(metadata(), "Intro", "LESSON_AND_PRACTICE", "content://content-1", "text/markdown", "1.0.0", 30,
                new BigDecimal("150000.50"), List.of(new Teaching(metadata(), "skill-1", "Java", "PRIMARY", "LOW")), content);
        return new Revision(2, "RELEASED", pack, "expert-1", "2026-10-02T00:00:00Z", "manager-1", "2026-10-03T00:00:00Z", "ok");
    }

    private static RevisionResponse revisionResponse() {
        var content = new ContentResponse("content-1", "Intro", "Body text", "text/markdown", "1.0.0", List.of("occ-1"),
                "expert-1", "2026-10-01T00:00:00Z", List.of(lessonResponse()));
        var pack = new PackageResponse(metadataResponse(), "Intro", "LESSON_AND_PRACTICE", "content://content-1",
                "text/markdown", "1.0.0", 30, new BigDecimal("150000.50"),
                List.of(new TeachingResponse(metadataResponse(), "skill-1", "Java")), content);
        return new RevisionResponse(2, "RELEASED", pack, "expert-1", "2026-10-02T00:00:00Z", "manager-1",
                "2026-10-03T00:00:00Z", "ok");
    }

    private static Event event() {
        return new Event(1, 2, "APPROVE", "manager-1", "2026-10-03T00:00:00Z", "approved");
    }

    private static EventResponse eventResponse() {
        return new EventResponse(1, 2, "APPROVE", "manager-1", "2026-10-03T00:00:00Z", "approved");
    }

    private static CatalogModule catalogModule() {
        return new CatalogModule(metadata(), "Intro", "LESSON_AND_PRACTICE", "content://content-1", "text/markdown", "1.0.0",
                30, new BigDecimal("150000.50"), List.of(new CatalogTeaching(metadata(), "skill-1", "Java", "PRIMARY", "LOW")));
    }

    private static CatalogModuleResponse catalogModuleResponse() {
        return new CatalogModuleResponse(metadataResponse(), "Intro", "LESSON_AND_PRACTICE", "content://content-1",
                "text/markdown", "1.0.0", 30, new BigDecimal("150000.50"),
                List.of(new CatalogTeachingResponse(metadataResponse(), "skill-1", "Java")));
    }

    private static Intake intake() {
        return new Intake("module-1", "org-1", List.of("occ-1"), "manager-1", "2026-09-30T00:00:00Z", catalogModule(),
                "expert-1", "2026-10-01T00:00:00Z", List.of(event()), "expert-1");
    }

    private static IntakeResponse intakeResponse() {
        return new IntakeResponse("module-1", "org-1", List.of("occ-1"), "manager-1", "2026-09-30T00:00:00Z",
                catalogModuleResponse(), "expert-1", "2026-10-01T00:00:00Z", List.of(eventResponse()), "expert-1");
    }

    private static DocumentResponse documentResponse() {
        return new DocumentResponse("module-1", "org-1", List.of("occ-1"), "expert-1", "2026-10-01T00:00:00Z", 4, true, false, 2,
                List.of(revisionResponse()), List.of(eventResponse()), intakeResponse());
    }
}