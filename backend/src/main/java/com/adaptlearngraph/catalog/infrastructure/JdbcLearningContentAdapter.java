package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.ModuleAuthoringService.Failure;
import com.adaptlearngraph.catalog.application.port.out.LearningContentPort;
import com.adaptlearngraph.catalog.domain.LearningContent;
import com.adaptlearngraph.catalog.domain.LearningContent.Lesson;
import com.adaptlearngraph.catalog.domain.LearningResources.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.commonmark.parser.Parser;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.*;

public final class JdbcLearningContentAdapter implements LearningContentPort {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    @FunctionalInterface public interface GeneratedAssignment { boolean permits(String organization,String learner,String module); }
    private final GeneratedAssignment generated;

    public JdbcLearningContentAdapter(JdbcTemplate jdbc, ObjectMapper json) {
        this(jdbc,json,(organization,learner,module)->false);
    }
    public JdbcLearningContentAdapter(JdbcTemplate jdbc,ObjectMapper json,GeneratedAssignment generated) {
        this.jdbc = jdbc;
        this.json = json;
        this.generated = generated;
    }

    private static String time(java.sql.ResultSet row, String field) throws java.sql.SQLException {
        var value = row.getTimestamp(field);
        return value == null ? null : value.toInstant().toString();
    }

    private String encode(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot encode learning data", e);
        }
    }

    private <T> T decode(String value, TypeReference<T> type) {
        try {
            return json.readValue(value, type);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot read learning data", e);
        }
    }

    @Override
    public Limits limits() {
        return jdbc.queryForObject(
                "SELECT * FROM platform.learning_upload_settings WHERE singleton",
                (r, n) ->
                        new Limits(
                                r.getLong("video_bytes"),
                                r.getLong("image_bytes"),
                                r.getLong("zip_bytes"),
                                r.getLong("version"),
                                r.getString("changed_by"),
                                time(r, "changed_at")));
    }

    @Override
    public Limits limits(Limits next, String actor) {
        Limits previous = limits();
        if (jdbc.update(
                        "UPDATE platform.learning_upload_settings SET"
                            + " video_bytes=?,image_bytes=?,zip_bytes=?,version=version+1,changed_by=?,changed_at=now()"
                            + " WHERE singleton AND version=?",
                        next.videoBytes(),
                        next.imageBytes(),
                        next.zipBytes(),
                        actor,
                        next.version())
                != 1) throw new Failure(409, "Settings changed. Reload before saving.");
        jdbc.update(
                "INSERT INTO platform.learning_settings_audit(actor_id,previous_value,next_value)"
                        + " VALUES (?,?::jsonb,?::jsonb)",
                actor,
                encode(previous),
                encode(next));
        return limits();
    }

    @Override
    public Optional<Asset> asset(String org, String id) {
        UUID uuid;
        try {
            uuid = UUID.fromString(id);
        } catch (RuntimeException e) {
            return Optional.empty();
        }
        return jdbc
                .query(
                        "SELECT * FROM platform.learning_asset WHERE organization_id=? AND id=?",
                        (r, n) ->
                                new Asset(
                                        r.getString("id"),
                                        r.getString("organization_id"),
                                        r.getString("created_by"),
                                        r.getString("object_key"),
                                        r.getString("filename"),
                                        r.getString("media_type"),
                                        r.getLong("byte_size"),
                                        r.getString("sha256"),
                                        (Double) r.getObject("duration_seconds"),
                                        time(r, "created_at")),
                        org,
                        uuid)
                .stream()
                .findFirst();
    }

    @Override
    public void asset(Asset a) {
        jdbc.update(
                "INSERT INTO"
                    + " platform.learning_asset(id,organization_id,created_by,object_key,filename,media_type,byte_size,sha256,duration_seconds)"
                    + " VALUES (?::uuid,?,?,?,?,?,?,?,?)",
                a.id(),
                a.organizationId(),
                a.createdBy(),
                a.objectKey(),
                a.filename(),
                a.mediaType(),
                a.byteSize(),
                a.sha256(),
                a.durationSeconds());
    }

    @Override
    public List<Lesson> prepare(String org, String actor, List<Lesson> input, boolean valid) {
        List<Lesson> result = new ArrayList<>();
        for (Lesson l : LearningContent.lessons(input)) {
            String body = l.body();
            double seconds = l.durationSeconds();
            String source = l.durationSource();
            if (l.type().equals("TEXT") && body != null) {
                if (l.bodyFormat().equals("HTML")) {
                    body =
                            Jsoup.clean(
                                    body,
                                    new Safelist()
                                            .addTags(
                                                    "p",
                                                    "br",
                                                    "h1",
                                                    "h2",
                                                    "h3",
                                                    "h4",
                                                    "strong",
                                                    "em",
                                                    "s",
                                                    "ul",
                                                    "ol",
                                                    "li",
                                                    "blockquote",
                                                    "pre",
                                                    "code",
                                                    "a",
                                                    "img",
                                                    "table",
                                                    "thead",
                                                    "tbody",
                                                    "tr",
                                                    "th",
                                                    "td",
                                                    "hr")
                                            .addAttributes("a", "href", "title")
                                            .addAttributes("img", "src", "alt", "title")
                                            .addAttributes("th", "colspan", "rowspan")
                                            .addAttributes("td", "colspan", "rowspan")
                                            .addProtocols("a", "href", "https", "mailto"));
                    var doc = Jsoup.parseBodyFragment(body);
                    for (var image : doc.select("img")) {
                        String prefix = "/api/v1/module-management/assets/";
                        String uri = image.attr("src");
                        if (!uri.startsWith(prefix)
                                || asset(org, uri.substring(prefix.length()))
                                        .filter(a -> a.mediaType().startsWith("image/"))
                                        .isEmpty())
                            throw new Failure(
                                    400, "Upload each lesson image to this organization first");
                    }
                } else {
                    validateMarkdown(org, body);
                }
                if (!source.equals("MANUAL")) {
                    seconds =
                            Math.max(
                                    60,
                                    (int)
                                                    Math.ceil(
                                                            Jsoup.parse(body)
                                                                            .text()
                                                                            .split("\\s+")
                                                                            .length
                                                                    / 200.0)
                                            * 60);
                    source = "ESTIMATED";
                }
            }
            if (l.type().equals("VIDEO")) {
                if (l.videoSource().equals("UPLOAD")
                        && l.assetId() != null
                        && !l.assetId().isBlank()) {
                    Asset a =
                            asset(org, l.assetId())
                                    .filter(x -> x.mediaType().equals("video/mp4"))
                                    .orElseThrow(
                                            () -> new Failure(400, "Upload a valid MP4 first"));
                    seconds = a.durationSeconds();
                    source = "MEDIA";
                } else if (!l.videoSource().equals("UPLOAD")) {
                    List<Double> verified =
                            jdbc.queryForList(
                                    "SELECT duration_seconds FROM"
                                        + " platform.learning_video_verification WHERE"
                                        + " organization_id=? AND video_url=? ORDER BY verified_at"
                                        + " DESC LIMIT 1",
                                    Double.class,
                                    org,
                                    l.videoUrl());
                    if (verified.isEmpty() && valid)
                        throw new Failure(
                                400,
                                "Play and verify every external video before submitting or"
                                        + " importing");
                    if (!verified.isEmpty()) {
                        seconds = verified.getFirst();
                        source = "MEDIA";
                    }
                    if (valid) ExternalLearningVideo.check(l.videoSource(), l.videoUrl());
                }
            }
            result.add(
                    new Lesson(
                            l.id(),
                            l.title(),
                            l.type(),
                            body,
                            l.bodyFormat(),
                            seconds,
                            source,
                            l.videoSource(),
                            l.assetId(),
                            l.videoUrl()));
        }
        if (valid) LearningContent.requireComplete(result);
        return List.copyOf(result);
    }

    private void validateMarkdown(String org, String markdown) {
        Parser.builder()
                .build()
                .parse(markdown)
                .accept(
                        new org.commonmark.node.AbstractVisitor() {
                            @Override
                            public void visit(org.commonmark.node.Link link) {
                                if (link.getDestination()
                                        .matches("(?is)^\\s*(javascript|data|vbscript)\\s*:.*"))
                                    throw new Failure(400, "Use a safe reading link");
                                super.visit(link);
                            }

                            @Override
                            public void visit(org.commonmark.node.Image image) {
                                String prefix = "/api/v1/module-management/assets/";
                                String uri = image.getDestination();
                                if (!uri.startsWith(prefix)
                                        || asset(org, uri.substring(prefix.length()))
                                                .filter(a -> a.mediaType().startsWith("image/"))
                                                .isEmpty())
                                    throw new Failure(
                                            400,
                                            "Include uploaded image assets rather than external"
                                                    + " image links");
                            }
                        });
    }

    @Override
    public boolean assigned(String org, String learner, String module) {
        return Boolean.TRUE.equals(
                jdbc.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM platform.manual_learning_pathway p JOIN"
                            + " platform.account a ON a.account_id=p.learner_id AND"
                            + " a.organization_id=p.organization_id WHERE p.organization_id::text=?"
                            + " AND p.learner_id::text=? AND p.module_ids @> ?::jsonb AND"
                            + " a.active)",
                        Boolean.class,
                        org,
                        learner,
                        encode(List.of(module)))) || generated.permits(org,learner,module);
    }

    @Override
    public List<Pathway> pathways(String org, String actor, boolean learner) {
        return jdbc.query(
                "SELECT * FROM platform.manual_learning_pathway WHERE organization_id::text=?"
                        + (learner ? " AND learner_id::text=?" : "")
                        + " ORDER BY confirmed_at DESC",
                (r, n) ->
                        new Pathway(
                                r.getString("id"),
                                r.getString("learner_id"),
                                r.getString("expert_id"),
                                r.getString("title"),
                                decode(
                                        r.getString("module_ids"),
                                        new TypeReference<List<String>>() {}),
                                time(r, "confirmed_at")),
                learner ? new Object[] {org, actor} : new Object[] {org});
    }

    @Override
    public Pathway assign(
            String org, String learner, String expert, String title, List<String> modules) {
        boolean eligible =
                Boolean.TRUE.equals(
                        jdbc.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM platform.account a JOIN"
                                        + " platform.organization_membership m ON"
                                        + " m.account_id=a.account_id JOIN"
                                        + " platform.organization_membership_role r ON"
                                        + " r.membership_id=m.membership_id WHERE"
                                        + " a.organization_id::text=? AND a.account_id::text=? AND"
                                        + " a.active AND m.active AND r.role_code='EMPLOYEE')",
                                Boolean.class,
                                org,
                                learner));
        if (!eligible) throw new Failure(400, "Select an active Employee in your organization");
        String id = UUID.randomUUID().toString();
        jdbc.update(
                "INSERT INTO"
                    + " platform.manual_learning_pathway(id,organization_id,learner_id,expert_id,title,module_ids)"
                    + " VALUES (?::uuid,?::uuid,?::uuid,?::uuid,?,?::jsonb)",
                id,
                org,
                learner,
                expert,
                title,
                encode(modules));
        return pathways(org, learner, true).stream()
                .filter(p -> p.id().equals(id))
                .findFirst()
                .orElseThrow();
    }

    @Override
    public List<Progress> progress(String org, String learner, String module, int revision) {
        return jdbc.query(
                "SELECT * FROM platform.learning_lesson_progress WHERE organization_id=? AND"
                        + " learner_id=? AND module_id=? AND revision=?",
                (r, n) ->
                        new Progress(
                                r.getString("lesson_id"),
                                r.getDouble("position_seconds"),
                                decode(
                                        r.getString("watched_intervals"),
                                        new TypeReference<List<LearningContent.Interval>>() {}),
                                r.getBoolean("reached_end"),
                                time(r, "completed_at"),
                                time(r, "updated_at"),
                                time(r, "coverage_updated_at")),
                org,
                learner,
                module,
                revision);
    }

    @Override
    public void progress(String org, String learner, String module, int revision, Progress p) {
        jdbc.update(
                "INSERT INTO"
                    + " platform.learning_lesson_progress(organization_id,learner_id,module_id,revision,lesson_id,position_seconds,watched_intervals,reached_end,completed_at,coverage_updated_at)"
                    + " VALUES (?,?,?,?,?,?,?::jsonb,?,?::timestamptz,?::timestamptz) ON"
                    + " CONFLICT(organization_id,learner_id,module_id,revision,lesson_id) DO UPDATE"
                    + " SET position_seconds=EXCLUDED.position_seconds,watched_intervals=EXCLUDED.watched_intervals,reached_end=EXCLUDED.reached_end,completed_at=EXCLUDED.completed_at,coverage_updated_at=EXCLUDED.coverage_updated_at,updated_at=now()",
                org,
                learner,
                module,
                revision,
                p.lessonId(),
                p.positionSeconds(),
                encode(p.watchedIntervals()),
                p.reachedEnd(),
                p.completedAt(),
                p.coverageUpdatedAt());
        jdbc.update(
                "INSERT INTO platform.learning_resume VALUES (?,?,?, ?,now()) ON"
                        + " CONFLICT(organization_id,learner_id,module_id) DO UPDATE SET"
                        + " lesson_id=EXCLUDED.lesson_id,updated_at=now()",
                org,
                learner,
                module,
                p.lessonId());
    }

    @Override
    public String activeLesson(String org, String learner, String module) {
        return jdbc
                .queryForList(
                        "SELECT lesson_id FROM platform.learning_resume WHERE organization_id=? AND"
                                + " learner_id=? AND module_id=?",
                        String.class,
                        org,
                        learner,
                        module)
                .stream()
                .findFirst()
                .orElse(null);
    }

    @Override
    public void switchVersion(String org, String learner, String module, int from, int to) {
        jdbc.update(
                "UPDATE platform.module_learning_pin SET revision=? WHERE organization_id=? AND"
                        + " learner_id=? AND module_id=? AND revision=?",
                to,
                org,
                learner,
                module,
                from);
        jdbc.update(
                "INSERT INTO"
                    + " platform.learning_version_switch(id,organization_id,learner_id,module_id,from_revision,to_revision)"
                    + " VALUES (?::uuid,?,?,?,?,?)",
                UUID.randomUUID().toString(),
                org,
                learner,
                module,
                from,
                to);
    }

    @Override
    public void notify(
            String org,
            String recipient,
            String key,
            String kind,
            String module,
            String title,
            String body) {
        jdbc.update(
                "INSERT INTO"
                    + " platform.learning_notification(id,organization_id,recipient_id,event_key,kind,module_id,title,body)"
                    + " VALUES (?::uuid,?,?,?,?,?,?,?) ON CONFLICT(recipient_id,event_key) DO"
                    + " NOTHING",
                UUID.randomUUID().toString(),
                org,
                recipient,
                key,
                kind,
                module,
                title,
                body);
    }

    @Override
    public void published(String org, String module, int revision, String title) {
        jdbc.queryForList(
                        "SELECT learner_id FROM platform.module_learning_pin WHERE"
                                + " organization_id=? AND module_id=? AND revision<?",
                        String.class,
                        org,
                        module,
                        revision)
                .forEach(
                        learner ->
                                notify(
                                        org,
                                        learner,
                                        "version:" + module + ":" + revision,
                                        "NEW_VERSION",
                                        module,
                                        title,
                                        "A new approved content version is available. / Đã có phiên"
                                                + " bản nội dung mới được duyệt."));
    }

    @Override
    public List<Notification> notifications(String org, String actor) {
        return jdbc.query(
                "SELECT * FROM platform.learning_notification WHERE organization_id=? AND"
                        + " recipient_id=? ORDER BY created_at DESC LIMIT 100",
                (r, n) ->
                        new Notification(
                                r.getString("id"),
                                r.getString("kind"),
                                r.getString("module_id"),
                                r.getString("title"),
                                r.getString("body"),
                                time(r, "created_at"),
                                time(r, "read_at")),
                org,
                actor);
    }

    @Override
    public void readNotification(String org, String actor, String id) {
        jdbc.update(
                "UPDATE platform.learning_notification SET read_at=coalesce(read_at,now()) WHERE"
                        + " organization_id=? AND recipient_id=? AND id=?::uuid",
                org,
                actor,
                id);
    }
}
