package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.LearningContent.Lesson;
import com.adaptlearngraph.entities.domain.LearningResources.*;

import java.util.*;

public interface LearningContentPort {
    List<SkillCompletion> completions(String organizationId, String learnerId, String skillId);
    void complete(String organizationId, String learnerId, SkillCompletion completion);
    boolean selfStudy(String organizationId, String learnerId, String moduleId);
    void admitSelfStudy(String organizationId, String learnerId, String moduleId, int revision, String skillId);

    Limits limits();

    Limits limits(Limits input, String actorId);

    Optional<Asset> asset(String organizationId, String id);

    void asset(Asset asset);

    List<Lesson> prepare(
            String organizationId, String actorId, List<Lesson> lessons, boolean requireValid);

    boolean assigned(String organizationId, String learnerId, String moduleId);
    /** Version switches must pass the same exact scope admission as a new start. */
    default boolean assignedRevision(String organizationId,String learnerId,String moduleId,int revision) {
        return assigned(organizationId,learnerId,moduleId);
    }

    List<Pathway> pathways(String organizationId, String actorId, boolean learner);

    Pathway assign(
            String organizationId,
            String learnerId,
            String expertId,
            String title,
            List<String> moduleIds);

    List<Progress> progress(String organizationId, String learnerId, String moduleId, int revision);

    void progress(
            String organizationId,
            String learnerId,
            String moduleId,
            int revision,
            Progress progress);

    String activeLesson(String organizationId, String learnerId, String moduleId);

    void switchVersion(String organizationId, String learnerId, String moduleId, int from, int to);

    void notify(
            String organizationId,
            String recipientId,
            String key,
            String kind,
            String moduleId,
            String title,
            String body);

    void published(String organizationId, String moduleId, int revision, String title);

    List<Notification> notifications(String organizationId, String actorId);
    boolean observeNotification(String organizationId,String actorId,String id);
    List<Notification> pendingNotifications(String organizationId,String actorId);

    void readNotification(String organizationId, String actorId, String id);
}
