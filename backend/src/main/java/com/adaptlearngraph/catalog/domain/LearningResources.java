package com.adaptlearngraph.catalog.domain;

import java.util.List;

public final class LearningResources {
    private LearningResources() {}

    public record Limits(
            long videoBytes,
            long imageBytes,
            long zipBytes,
            long version,
            String changedBy,
            String changedAt) {
        public Limits {
            if (videoBytes < 1048576
                    || videoBytes > 10737418240L
                    || imageBytes < 1024
                    || imageBytes > 104857600
                    || zipBytes < 1048576
                    || zipBytes > 10737418240L)
                throw new IllegalArgumentException("Upload limits outside supported range");
        }
    }

    public record Asset(
            String id,
            String organizationId,
            String createdBy,
            String objectKey,
            String filename,
            String mediaType,
            long byteSize,
            String sha256,
            Double durationSeconds,
            String createdAt) {}

    public record Pathway(
            String id,
            String learnerId,
            String expertId,
            String title,
            List<String> moduleIds,
            String confirmedAt) {
        public Pathway {
            moduleIds = List.copyOf(moduleIds);
        }
    }

    public record Progress(
            String lessonId,
            double positionSeconds,
            List<LearningContent.Interval> watchedIntervals,
            boolean reachedEnd,
            String completedAt,
            String updatedAt,
            String coverageUpdatedAt) {
        public Progress(
                String lessonId,
                double positionSeconds,
                List<LearningContent.Interval> watchedIntervals,
                boolean reachedEnd,
                String completedAt,
                String updatedAt) {
            this(
                    lessonId,
                    positionSeconds,
                    watchedIntervals,
                    reachedEnd,
                    completedAt,
                    updatedAt,
                    updatedAt);
        }

        public Progress {
            watchedIntervals = List.copyOf(watchedIntervals);
        }
    }

    public record LearningView(
            ModuleAuthoring.Revision revision,
            Integer latestRevision,
            String activeLessonId,
            List<Progress> progress) {}

    public record Notification(
            String id,
            String kind,
            String moduleId,
            String title,
            String body,
            String createdAt,
            String readAt) {}
}
