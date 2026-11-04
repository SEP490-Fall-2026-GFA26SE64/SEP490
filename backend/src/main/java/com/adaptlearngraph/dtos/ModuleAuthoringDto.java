package com.adaptlearngraph.dtos;

import com.adaptlearngraph.entities.domain.LearningContent;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

/** Wire shapes of the module authoring (module management) API. */
public final class ModuleAuthoringDto {
    private ModuleAuthoringDto() {
    }

    public record ActorResponse(String id, String organizationId, Set<String> roles) {}

    public record ChoiceResponse(String id, String name) {}

    public record GrantResponse(String expertId, String jobPositionId) {}

    /** Lesson body; rejected while reading the request with the same rules as the stored lesson. */
    public record LessonRequest(String id, String title, String type, String body, String bodyFormat, double durationSeconds,
                                String durationSource, String videoSource, String assetId, String videoUrl) {
        public LessonRequest {
            new LearningContent.Lesson(id, title, type, body, bodyFormat, durationSeconds, durationSource, videoSource,
                    assetId, videoUrl);
        }
    }

    public record LessonResponse(String id, String title, String type, String body, String bodyFormat, double durationSeconds,
                                 String durationSource, String videoSource, String assetId, String videoUrl) {}

    public record ContentResponse(String id, String title, String markdown, String contentType, String contentVersion,
                                  List<String> jobPositionIds, String createdBy, String createdAt, List<LessonResponse> lessons) {}

    public record MetadataResponse(String id, String version, String status, String reviewStatus, String reviewedBy,
                                   String reviewedAt) {}

    public record TeachingResponse(MetadataResponse metadata, String skillId, String skillName, String teachingFocus,
                                   String difficultyLevel) {}

    public record PackageResponse(MetadataResponse metadata, String title, String moduleType, String contentUri,
                                  String contentType, String contentVersion, int duration, BigDecimal price,
                                  List<TeachingResponse> teachings, ContentResponse content) {}

    public record RevisionResponse(int number, String state, PackageResponse payload, String editedBy, String editedAt,
                                   String decidedBy, String decidedAt, String feedback) {}

    public record EventResponse(int sequence, int revision, String action, String actorId, String occurredAt, String detail) {}

    public record CatalogTeachingResponse(MetadataResponse metadata, String skillId, String skillName, String teachingFocus,
                                          String difficultyLevel) {}

    public record CatalogModuleResponse(MetadataResponse metadata, String title, String moduleType, String contentUri,
                                        String contentType, String contentVersion, Integer duration, BigDecimal price,
                                        List<CatalogTeachingResponse> teachings) {}

    public record IntakeResponse(String moduleId, String organizationId, List<String> jobPositionIds, String assignedBy,
                                 String assignedAt, CatalogModuleResponse source, String acceptedBy, String acceptedAt,
                                 List<EventResponse> history, String expertId) {}

    public record DocumentResponse(String id, String organizationId, List<String> jobPositionIds, String createdBy,
                                   String createdAt, long lockVersion, boolean everReleased, boolean archived,
                                   Integer releasedRevision, List<RevisionResponse> revisions, List<EventResponse> history,
                                   IntakeResponse intake) {}

    public record PageResponse(List<DocumentResponse> items, int total, int page, int pageSize) {}

    public record CatalogItemResponse(CatalogModuleResponse module, DocumentResponse authoring, IntakeResponse intake) {}

    public record CatalogPageResponse(List<CatalogItemResponse> items, int total, int page, int pageSize) {}

    /** Skill selection of a module draft (request and import preview). */
    public record TeachingSelection(String skillId, String teachingFocus, String difficultyLevel) {}

    /** Module draft values (request and import preview); jobPositionIds is accepted for legacy clients only. */
    public record ModuleInput(String title, String moduleType, String contentId, int duration, BigDecimal price,
                              List<String> jobPositionIds, List<TeachingSelection> teachings) {}
}