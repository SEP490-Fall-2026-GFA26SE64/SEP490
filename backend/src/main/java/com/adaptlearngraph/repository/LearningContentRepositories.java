package com.adaptlearngraph.repository;

import java.util.Objects;

/** Spring Data repositories behind {@link JpaLearningContentAdapter}. */
public record LearningContentRepositories(LearningUploadSettingsJpaRepository settings,
        LearningSettingsAuditJpaRepository settingsAudit, LearningAssetJpaRepository assets,
        LearningVideoVerificationJpaRepository verifications, ManualLearningPathwayJpaRepository pathways,
        ModuleAuthoringDirectoryJpaRepository directory, LearningLessonProgressJpaRepository progress,
        LearningResumeJpaRepository resumes, ModuleLearningPinJpaRepository pins,
        LearningVersionSwitchJpaRepository switches, LearningNotificationJpaRepository notifications) {

    public LearningContentRepositories {
        Objects.requireNonNull(settings); Objects.requireNonNull(settingsAudit); Objects.requireNonNull(assets);
        Objects.requireNonNull(verifications); Objects.requireNonNull(pathways); Objects.requireNonNull(directory);
        Objects.requireNonNull(progress); Objects.requireNonNull(resumes); Objects.requireNonNull(pins);
        Objects.requireNonNull(switches); Objects.requireNonNull(notifications);
    }

    public static LearningContentRepositories from(AdaptiveAttemptRepositories.Lookup beans) {
        return new LearningContentRepositories(beans.bean(LearningUploadSettingsJpaRepository.class),
                beans.bean(LearningSettingsAuditJpaRepository.class), beans.bean(LearningAssetJpaRepository.class),
                beans.bean(LearningVideoVerificationJpaRepository.class), beans.bean(ManualLearningPathwayJpaRepository.class),
                beans.bean(ModuleAuthoringDirectoryJpaRepository.class), beans.bean(LearningLessonProgressJpaRepository.class),
                beans.bean(LearningResumeJpaRepository.class), beans.bean(ModuleLearningPinJpaRepository.class),
                beans.bean(LearningVersionSwitchJpaRepository.class), beans.bean(LearningNotificationJpaRepository.class));
    }
}
