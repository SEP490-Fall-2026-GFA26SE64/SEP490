package com.adaptlearngraph.entities.domain;

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

    /** Immutable completion-time provenance; never resolved through today's graph mapping. */
    public record SkillCompletion(String skillId, String moduleId, int revision,
            String contentVersion, String completedAt,String knowledgeLevel,String skillVersion,java.util.List<String> outcomeCodes,String skillName) {
        public SkillCompletion(String skill,String module,int revision,String version,String at) {
            this(skill,module,revision,version,at,null,null,java.util.List.of(),null);
        }
        public SkillCompletion {
            outcomeCodes=outcomeCodes==null?java.util.List.of():java.util.List.copyOf(outcomeCodes);
            if(knowledgeLevel!=null) {
                KnowledgeLevel.valueOf(knowledgeLevel);
                ModuleAuthoring.text(skillVersion,"skillVersion",200);ModuleAuthoring.text(skillName,"skillName",2000);
            }else if(skillVersion!=null || !outcomeCodes.isEmpty())throw new IllegalArgumentException("Incomplete learning requirement scope");
        }
    }
    public record SkillEligibility(String skillId, boolean eligible, String reason,
            SkillCompletion qualifyingCompletion) {}
    public record OptionalModule(String moduleId, String title, String contentVersion,
            boolean started, boolean completed) {}

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
            String readAt,String deepLink,String toastObservedAt) {}
}
