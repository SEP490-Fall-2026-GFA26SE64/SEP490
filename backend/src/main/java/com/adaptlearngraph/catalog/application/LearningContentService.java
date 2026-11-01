package com.adaptlearngraph.catalog.application;

import com.adaptlearngraph.catalog.application.ModuleAuthoringService.Failure;
import com.adaptlearngraph.catalog.application.port.out.*;
import com.adaptlearngraph.catalog.domain.*;
import com.adaptlearngraph.catalog.domain.LearningResources.*;
import com.adaptlearngraph.catalog.domain.ModuleAuthoring.*;

import java.time.Instant;
import java.util.*;

public final class LearningContentService {
    private final ModuleAuthoringPort modules;
    private final LearningContentPort content;
    private final ModuleAuthoringService authoring;

    public LearningContentService(
            ModuleAuthoringPort modules,
            LearningContentPort content,
            ModuleAuthoringService authoring) {
        this.modules = modules;
        this.content = content;
        this.authoring = authoring;
    }

    public Limits limits() {
        return content.limits();
    }

    public Limits limits(Limits next) {
        Actor actor = modules.actor();
        if (!actor.roles().contains("PLATFORM_ADMINISTRATOR"))
            throw new Failure(403, "Platform Administrator access required");
        return modules.transaction(() -> content.limits(next, actor.id()));
    }

    public List<Pathway> pathways() {
        Actor a = modules.actor();
        if (!a.expert() && !a.manager() && !a.roles().contains("EMPLOYEE"))
            throw new Failure(403, "Learning access required");
        return content.pathways(a.organizationId(), a.id(), a.roles().contains("EMPLOYEE"));
    }

    public Pathway assign(String learner, String title, List<String> ids) {
        Actor a = modules.actor();
        if (!a.expert()) throw new Failure(403, "Expert confirmation required");
        ModuleAuthoring.text(title, "pathway title", 240);
        if (ids == null
                || ids.isEmpty()
                || ids.size() > 200
                || new HashSet<>(ids).size() != ids.size())
            throw new Failure(400, "Select unique approved modules");
        return modules.transaction(
                () -> {
                    for (String id : ids) {
                        Document d =
                                modules.lock(a.organizationId(), id)
                                        .orElseThrow(() -> new Failure(404, "Module not found"));
                        if (d.archived() || d.released() == null)
                            throw new Failure(409, "Every assigned module must be released");
                        LearningContent.requireComplete(d.released().payload().content().lessons());
                    }
                    return content.assign(a.organizationId(), learner, a.id(), title, ids);
                });
    }

    public LearningView view(String id, boolean start) {
        return modules.transaction(
                () -> {
                    Actor a = modules.actor();
                    Revision revision = start ? authoring.learning(id, true) : authoring.learningPreview(id);
                    Document d = modules.lock(a.organizationId(), id).orElseThrow();
                    return new LearningView(
                            revision,
                            d.archived() ? null : d.releasedRevision(),
                            content.activeLesson(a.organizationId(), a.id(), id),
                            content.progress(a.organizationId(), a.id(), id, revision.number()));
                });
    }

    public Progress progress(
            String id,
            String lessonId,
            double position,
            Double segmentStart,
            Double segmentEnd,
            boolean reachedEnd,
            boolean complete,
            int expectedRevision) {
        return modules.transaction(
                () -> {
                    Actor a = modules.actor();
                    Revision revision = authoring.learning(id, false);
                    if (revision.number() != expectedRevision)
                        throw new Failure(409, "Learning version changed. Reload the lesson.");
                    var lesson =
                            revision.payload().content().lessons().stream()
                                    .filter(l -> l.id().equals(lessonId))
                                    .findFirst()
                                    .orElseThrow(() -> new Failure(404, "Lesson not found"));
                    Progress old =
                            content
                                    .progress(a.organizationId(), a.id(), id, revision.number())
                                    .stream()
                                    .filter(p -> p.lessonId().equals(lessonId))
                                    .findFirst()
                                    .orElse(
                                            new Progress(
                                                    lessonId, 0, List.of(), false, null, null));
                    if (!Double.isFinite(position)
                            || position < 0
                            || position > lesson.durationSeconds() + 1)
                        throw new Failure(400, "Invalid playback position");
                    var watched = old.watchedIntervals();
                    if (segmentStart != null || segmentEnd != null) {
                        if (!lesson.type().equals("VIDEO")
                                || segmentStart == null
                                || segmentEnd == null
                                || segmentEnd - segmentStart > 15)
                            throw new Failure(400, "Send short contiguous playback intervals");
                        double elapsed =
                                old.coverageUpdatedAt() == null
                                        ? 15
                                        : Math.max(
                                                0,
                                                (Instant.now().toEpochMilli()
                                                                - Instant.parse(
                                                                                old
                                                                                        .coverageUpdatedAt())
                                                                        .toEpochMilli())
                                                        / 1000.0);
                        if (segmentEnd - segmentStart > Math.min(15, elapsed * 2 + 2))
                            throw new Failure(
                                    400, "Playback interval exceeds elapsed viewing time");
                        watched =
                                LearningContent.merge(
                                        watched,
                                        new LearningContent.Interval(segmentStart, segmentEnd),
                                        lesson.durationSeconds());
                    }
                    boolean end = old.reachedEnd() || lesson.type().equals("TEXT") && reachedEnd;
                    if (complete
                            && !(lesson.type().equals("TEXT")
                                    ? end
                                    : LearningContent.watchedEnough(
                                            watched, lesson.durationSeconds())))
                        throw new Failure(
                                409, "Meet the lesson requirements before marking it completed");
                    Progress next =
                            new Progress(
                                    lessonId,
                                    position,
                                    watched,
                                    end,
                                    old.completedAt() != null
                                            ? old.completedAt()
                                            : complete ? Instant.now().toString() : null,
                                    Instant.now().toString(),
                                    segmentStart != null || old.coverageUpdatedAt() == null
                                            ? Instant.now().toString()
                                            : old.coverageUpdatedAt());
                    content.progress(a.organizationId(), a.id(), id, revision.number(), next);
                    return next;
                });
    }

    public LearningView switchVersion(String id, int expectedRevision) {
        modules.transaction(
                () -> {
                    Actor a = modules.actor();
                    Revision old = authoring.learning(id, false);
                    if (old.number() != expectedRevision)
                        throw new Failure(
                                409, "Learning version changed. Reload before switching.");
                    Document d = modules.lock(a.organizationId(), id).orElseThrow();
                    Revision next = d.released();
                    if (d.archived() || next == null || next.number() <= old.number())
                        throw new Failure(409, "No newer approved version");
                    for (Progress p :
                            content.progress(a.organizationId(), a.id(), id, old.number())) {
                        var prior =
                                old.payload().content().lessons().stream()
                                        .filter(l -> l.id().equals(p.lessonId()))
                                        .findFirst()
                                        .orElse(null);
                        if (next.payload().content().lessons().stream()
                                .anyMatch(l -> compatible(a.organizationId(), prior, l)))
                            content.progress(a.organizationId(), a.id(), id, next.number(), p);
                    }
                    content.switchVersion(
                            a.organizationId(), a.id(), id, old.number(), next.number());
                    return null;
                });
        return view(id, false);
    }

    private boolean compatible(
            String org, LearningContent.Lesson before, LearningContent.Lesson after) {
        if (after.sameContent(before)) return true;
        if (before == null
                || !before.id().equals(after.id())
                || !before.type().equals(after.type())) return false;
        if (before.type().equals("TEXT"))
            return Objects.equals(before.bodyFormat(), after.bodyFormat())
                    && Objects.equals(
                            normalizedAssets(org, before.body()),
                            normalizedAssets(org, after.body()));
        if (!"UPLOAD".equals(before.videoSource()) || !"UPLOAD".equals(after.videoSource()))
            return false;
        var first = content.asset(org, before.assetId());
        var second = content.asset(org, after.assetId());
        return first.isPresent()
                && second.isPresent()
                && first.get().sha256().equals(second.get().sha256())
                && first.get().mediaType().equals(second.get().mediaType());
    }

    private String normalizedAssets(String org, String body) {
        if (body == null) return null;
        var matcher =
                java.util.regex.Pattern.compile(
                                "/api/v1/module-management/assets/([0-9a-fA-F-]{36})")
                        .matcher(body);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            String replacement =
                    content.asset(org, matcher.group(1))
                            .map(a -> "asset-sha256:" + a.sha256())
                            .orElse(matcher.group());
            matcher.appendReplacement(
                    result, java.util.regex.Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    public Asset accessibleAsset(String id) {
        Actor a = modules.actor();
        Asset asset =
                content.asset(a.organizationId(), id)
                        .orElseThrow(() -> new Failure(404, "File not found"));
        if (a.expert() || a.manager()) return asset;
        if (a.roles().contains("EMPLOYEE"))
            for (Document d : modules.documents(a.organizationId())) {
                if (!content.assigned(a.organizationId(), a.id(), d.id())) continue;
                var pin = modules.pinned(a.organizationId(), a.id(), d.id());
                var r =
                        pin.flatMap(
                                        number ->
                                                d.revisions().stream()
                                                        .filter(v -> v.number() == number)
                                                        .findFirst())
                                .orElse(null);
                if (r != null
                        && r.payload().content().lessons().stream()
                                .anyMatch(
                                        l ->
                                                id.equals(l.assetId())
                                                        || l.body() != null
                                                                && l.body()
                                                                        .contains(
                                                                                "/api/v1/module-management/assets/"
                                                                                        + id)))
                    return asset;
            }
        throw new Failure(404, "File not found");
    }

    public void issue(String id, String lessonId, String detail, String commandId) {
        String command =
                commandId == null
                        ? UUID.randomUUID().toString()
                        : UUID.fromString(commandId).toString();
        ModuleAuthoring.text(detail, "issue", 2000);
        modules.transaction(
                () -> {
                    Actor a = modules.actor();
                    Revision r = authoring.learning(id, false);
                    var lesson =
                            r.payload().content().lessons().stream()
                                    .filter(l -> l.id().equals(lessonId))
                                    .findFirst()
                                    .orElseThrow(() -> new Failure(404, "Lesson not found"));
                    Document d = modules.lock(a.organizationId(), id).orElseThrow();
                    content.notify(
                            a.organizationId(),
                            d.createdBy(),
                            "issue:" + a.id() + ":" + command,
                            "CONTENT_ISSUE",
                            id,
                            d.current().payload().title(),
                            "Lesson / Bài học: "
                                    + lesson.title()
                                    + "\nVersion / Phiên bản: "
                                    + r.number()
                                    + "\n"
                                    + detail);
                    return null;
                });
    }

    public List<Notification> notifications() {
        Actor a = modules.actor();
        return content.notifications(a.organizationId(), a.id());
    }

    public void read(String id) {
        Actor a = modules.actor();
        content.readNotification(a.organizationId(), a.id(), id);
    }
}
