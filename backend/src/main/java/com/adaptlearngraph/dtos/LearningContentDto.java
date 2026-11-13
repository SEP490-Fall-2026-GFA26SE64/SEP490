package com.adaptlearngraph.dtos;

import com.adaptlearngraph.dtos.ModuleAuthoringDto.LessonResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.ModuleInput;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.RevisionResponse;
import com.adaptlearngraph.entities.domain.LearningResources;
import java.util.List;

/**
 * Wire shapes of the learning content API (uploads, settings, learning views, imports). Asset metadata is returned
 * exactly as the established upload contract does; settings audit identity is never accepted from the request body.
 */
public final class LearningContentDto {
    private LearningContentDto() {
    }

    /** Upload limit change; rejected while reading the request when outside the supported range. */
    public record LimitsRequest(long videoBytes, long imageBytes, long zipBytes, long version) {
        public LimitsRequest {
            new LearningResources.Limits(videoBytes, imageBytes, zipBytes, version, null, null);
        }
    }

    public record LimitsResponse(long videoBytes, long imageBytes, long zipBytes, long version, String changedBy,
                                 String changedAt) {}

    public record AssetResponse(String id, String organizationId, String createdBy, String objectKey, String filename,
                                String mediaType, long byteSize, String sha256, Double durationSeconds, String createdAt) {}

    public record PathwayResponse(String id, String learnerId, String expertId, String title, List<String> moduleIds,
                                  String confirmedAt) {}

    public record IntervalResponse(double start, double end) {}

    public record ProgressResponse(String lessonId, double positionSeconds, List<IntervalResponse> watchedIntervals,
                                   boolean reachedEnd, String completedAt, String updatedAt, String coverageUpdatedAt) {}

    public record LearningViewResponse(RevisionResponse revision, Integer latestRevision, String activeLessonId,
                                       List<ProgressResponse> progress) {}

    public record NotificationResponse(String id, String kind, String moduleId, String title, String body, String createdAt,
                                       String readAt) {}

    public record ImportRowResponse(String moduleId, int excelRow, ModuleInput module, List<LessonResponse> lessons,
                                    Long expectedVersion, String moduleRef) {
        public ImportRowResponse(String moduleId, int excelRow, ModuleInput module, List<LessonResponse> lessons, Long expectedVersion) {
            this(moduleId, excelRow, module, lessons, expectedVersion, null);
        }
    }

    public record ImportProblemResponse(String moduleId, int row, String reason) {}

    public record ImportPreviewResponse(String id, List<ImportRowResponse> modules, List<ImportProblemResponse> errors,
                                        List<String> ownedDuplicates, boolean committed) {}
}
