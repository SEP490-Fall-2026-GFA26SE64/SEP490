package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.LearningAssetEntity;
import com.adaptlearngraph.entities.domain.LearningContent;
import com.adaptlearngraph.entities.domain.LearningContent.Lesson;
import com.adaptlearngraph.entities.domain.LearningResources.*;
import com.adaptlearngraph.entities.LearningSettingsAuditEntity;
import com.adaptlearngraph.entities.LearningVersionSwitchEntity;
import com.adaptlearngraph.entities.ManualLearningPathwayEntity;
import com.adaptlearngraph.helper.ExternalLearningVideo;
import com.adaptlearngraph.services.ModuleAuthoringService.Failure;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.commonmark.parser.Parser;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.dao.InvalidDataAccessApiUsageException;

import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.PageRequest;

/** Learning content persistence (settings, assets, pathways, progress, notifications) through Spring Data JPA. */
public final class JpaLearningContentAdapter implements LearningContentPort {
    private static final String ASSET_PREFIX = "/api/v1/module-management/assets/";
    private final LearningContentRepositories repositories;
    private final ObjectMapper json;
    @FunctionalInterface public interface GeneratedAssignment { boolean permits(String organization,String learner,String module); }
    @FunctionalInterface public interface ExactAssignment { boolean permits(String organization,String learner,String module,Integer revision); }
    private final ExactAssignment generated;
    private final boolean exactAdmission;

    public JpaLearningContentAdapter(LearningContentRepositories repositories, ObjectMapper json) {
        this(repositories,json,(organization,learner,module,revision)->false,false);
    }
    public JpaLearningContentAdapter(LearningContentRepositories repositories,ObjectMapper json,GeneratedAssignment generated) {
        this(repositories,json,(organization,learner,module,revision)->generated.permits(organization,learner,module),false);
    }
    public JpaLearningContentAdapter(LearningContentRepositories repositories,ObjectMapper json,ExactAssignment generated,boolean exactAdmission) {
        this.repositories = repositories;
        this.json = json;
        this.generated = generated;
        this.exactAdmission=exactAdmission;
    }

    private static String time(Instant value) {
        return value == null ? null : value.toString();
    }

    /** Text ids were cast to uuid by PostgreSQL before; keep a malformed id a data-access failure. */
    private static UUID uuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (RuntimeException e) {
            throw new InvalidDataAccessApiUsageException("Invalid uuid", e);
        }
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

    @Override public List<SkillCompletion> completions(String org,String learner,String skill) {
        var rows=repositories.completions().knowledge(org,learner,skill,PageRequest.of(0,1001));
        if(rows.size()>1000)throw new Failure(503,"Learning completion history exceeds the query limit");
        return rows.stream().map(r->{
            if(r.knowledgeLevel()==null)return new SkillCompletion(r.skillId(),r.moduleId(),r.revision(),r.contentVersion(),time(r.completedAt()));
            var snapshot=decode(r.requirementSnapshot(),new TypeReference<Map<String,Object>>(){});
            var outcomes=List.<String>of();
            return new SkillCompletion(r.skillId(),r.moduleId(),r.revision(),r.contentVersion(),time(r.completedAt()),r.knowledgeLevel(),
                    Objects.toString(snapshot.get("skillVersion"),null),outcomes,Objects.toString(snapshot.get("skillName"),null));
        }).toList();
    }
    @Override public void complete(String org,String learner,SkillCompletion proof) {
        repositories.completions().insert(org,learner,proof.moduleId(),proof.revision(),proof.skillId(),proof.contentVersion(),proof.completedAt());
        if(proof.knowledgeLevel()!=null) {
            var snapshot=Map.of("skillId",proof.skillId(),"skillName",proof.skillName(),"knowledgeLevel",proof.knowledgeLevel(),
                    "skillVersion",proof.skillVersion(),"contentVersion",proof.contentVersion());
            repositories.completions().freezeRequirement(org,learner,proof.moduleId(),proof.revision(),proof.skillId(),proof.contentVersion(),proof.knowledgeLevel(),encode(snapshot));
            var retained=repositories.completions().requirement(org,learner,proof.moduleId(),proof.revision(),proof.knowledgeLevel())
                    .orElseThrow(()->new Failure(409,"Learning completion requirement does not match the original completion"));
            var original=new java.util.HashMap<>(decode(retained,new TypeReference<Map<String,Object>>(){}));original.remove("outcomeCodes");
            if(!original.equals(snapshot))
                throw new Failure(409,"Original learning completion scope is immutable");
        }
    }
    @Override public boolean selfStudy(String org,String learner,String module) {
        return repositories.selfStudies().admitted(org,learner,module);
    }
    @Override public void admitSelfStudy(String org,String learner,String module,int revision,String skill) {
        repositories.selfStudies().admit(org,learner,module,revision,skill);
    }

    @Override
    public Limits limits() {
        var rows = repositories.settings().current();
        if (rows.isEmpty()) throw new EmptyResultDataAccessException(1);
        var r = rows.getFirst();
        return new Limits(r.videoBytes(), r.imageBytes(), r.zipBytes(), r.version(), r.changedBy(), time(r.changedAt()));
    }

    @Override
    public Limits limits(Limits next, String actor) {
        Limits previous = limits();
        if (repositories.settings().update(next.videoBytes(), next.imageBytes(), next.zipBytes(), actor, next.version())
                != 1) throw new Failure(409, "Settings changed. Reload before saving.");
        repositories.settingsAudit().insert(new LearningSettingsAuditEntity(null, actor, null, encode(previous), encode(next)));
        return limits();
    }

    private static Asset asset(LearningAssetJpaRepository.Row r) {
        return new Asset(
                r.id().toString(),
                r.organizationId(),
                r.createdBy(),
                r.objectKey(),
                r.filename(),
                r.mediaType(),
                r.byteSize(),
                r.sha256(),
                r.durationSeconds(),
                time(r.createdAt()));
    }

    private static Optional<UUID> assetId(String id) {
        try {
            return Optional.of(UUID.fromString(id));
        } catch (RuntimeException e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<Asset> asset(String org, String id) {
        return assetId(id).flatMap(uuid -> repositories.assets().asset(org, uuid).stream().findFirst())
                .map(JpaLearningContentAdapter::asset);
    }

    @Override
    public void asset(Asset a) {
        repositories.assets().insert(new LearningAssetEntity(
                uuid(a.id()),
                a.organizationId(),
                a.createdBy(),
                a.objectKey(),
                a.filename(),
                a.mediaType(),
                a.byteSize(),
                a.sha256(),
                a.durationSeconds(),
                null));
    }

    private static Safelist lessonHtml() {
        return new Safelist()
                .addTags(
                        "p", "br", "h1", "h2", "h3", "h4", "strong", "em", "s", "ul", "ol", "li", "blockquote",
                        "pre", "code", "a", "img", "table", "thead", "tbody", "tr", "th", "td", "hr")
                .addAttributes("a", "href", "title")
                .addAttributes("img", "src", "alt", "title")
                .addAttributes("th", "colspan", "rowspan")
                .addAttributes("td", "colspan", "rowspan")
                .addProtocols("a", "href", "https", "mailto");
    }

    /** Assets and external video verifications a lesson list refers to, read in at most two statements. */
    private record References(Map<UUID, Asset> assets, Map<String, Double> verified) {
        Optional<Asset> asset(String id) {
            return assetId(id).map(assets::get).filter(asset->!asset.objectKey().startsWith(asset.organizationId()+"/certificate-evidence/"));
        }
    }

    private References references(String org, List<Lesson> lessons, Map<Integer, String> cleaned) {
        Set<UUID> assetIds = new LinkedHashSet<>();
        Set<String> urls = new LinkedHashSet<>();
        for (int i = 0; i < lessons.size(); i++) {
            Lesson l = lessons.get(i);
            if (l.type().equals("TEXT") && l.body() != null) {
                if (l.bodyFormat().equals("HTML")) {
                    String body = Jsoup.clean(l.body(), lessonHtml());
                    cleaned.put(i, body);
                    for (var image : Jsoup.parseBodyFragment(body).select("img")) {
                        String uri = image.attr("src");
                        if (uri.startsWith(ASSET_PREFIX)) assetId(uri.substring(ASSET_PREFIX.length())).ifPresent(assetIds::add);
                    }
                } else {
                    Parser.builder().build().parse(l.body()).accept(new org.commonmark.node.AbstractVisitor() {
                        @Override
                        public void visit(org.commonmark.node.Image image) {
                            String uri = image.getDestination();
                            if (uri.startsWith(ASSET_PREFIX)) assetId(uri.substring(ASSET_PREFIX.length())).ifPresent(assetIds::add);
                        }
                    });
                }
            }
            if (l.type().equals("VIDEO")) {
                if (l.videoSource().equals("UPLOAD") && l.assetId() != null && !l.assetId().isBlank())
                    assetId(l.assetId()).ifPresent(assetIds::add);
                else if (!l.videoSource().equals("UPLOAD") && l.videoUrl() != null) urls.add(l.videoUrl());
            }
        }
        Map<UUID, Asset> assets = new HashMap<>();
        if (!assetIds.isEmpty())
            repositories.assets().assets(org, assetIds).forEach(row -> assets.put(row.id(), asset(row)));
        Map<String, Double> verified = new HashMap<>();
        if (!urls.isEmpty())
            repositories.verifications().newestFirst(org, urls)
                    .forEach(row -> verified.putIfAbsent(row.videoUrl(), row.durationSeconds()));
        return new References(assets, verified);
    }

    @Override
    public List<Lesson> prepare(String org, String actor, List<Lesson> input, boolean valid) {
        List<Lesson> result = new ArrayList<>();
        List<Lesson> lessons = LearningContent.lessons(input);
        Map<Integer, String> cleaned = new HashMap<>();
        References references = references(org, lessons, cleaned);
        for (int i = 0; i < lessons.size(); i++) {
            Lesson l = lessons.get(i);
            String body = l.body();
            double seconds = l.durationSeconds();
            String source = l.durationSource();
            if (l.type().equals("TEXT") && body != null) {
                if (l.bodyFormat().equals("HTML")) {
                    body = cleaned.get(i);
                    var doc = Jsoup.parseBodyFragment(body);
                    for (var image : doc.select("img")) {
                        String uri = image.attr("src");
                        if (!uri.startsWith(ASSET_PREFIX)
                                || references.asset(uri.substring(ASSET_PREFIX.length()))
                                        .filter(a -> a.mediaType().startsWith("image/"))
                                        .isEmpty())
                            throw new Failure(
                                    400, "Upload each lesson image to this organization first");
                    }
                } else {
                    validateMarkdown(references, body);
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
                            references.asset(l.assetId())
                                    .filter(x -> x.mediaType().equals("video/mp4"))
                                    .orElseThrow(
                                            () -> new Failure(400, "Upload a valid MP4 first"));
                    seconds = a.durationSeconds();
                    source = "MEDIA";
                } else if (!l.videoSource().equals("UPLOAD")) {
                    Double verified = l.videoUrl() == null ? null : references.verified().get(l.videoUrl());
                    if (verified == null && valid)
                        throw new Failure(
                                400,
                                "Play and verify every external video before submitting or"
                                        + " importing");
                    if (verified != null) {
                        seconds = verified;
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

    private static void validateMarkdown(References references, String markdown) {
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
                                String uri = image.getDestination();
                                if (!uri.startsWith(ASSET_PREFIX)
                                        || references.asset(uri.substring(ASSET_PREFIX.length()))
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
        return generated.permits(org, learner, module,null) || !exactAdmission && selfStudy(org, learner, module);
    }
    @Override public boolean assignedRevision(String org,String learner,String module,int revision) {
        return generated.permits(org,learner,module,revision) || !exactAdmission && selfStudy(org,learner,module);
    }

    @Override
    public List<Pathway> pathways(String org, String actor, boolean learner) {
        var rows = learner ? repositories.pathways().pathways(org, actor) : repositories.pathways().pathways(org);
        List<Pathway> result = new ArrayList<>();
        for (var r : rows)
            result.add(
                    new Pathway(
                            r.id().toString(),
                            r.learnerId().toString(),
                            r.expertId().toString(),
                            r.title(),
                            decode(r.moduleIds(), new TypeReference<List<String>>() {}),
                            time(r.confirmedAt())));
        return result;
    }

    @Override
    public Pathway assign(
            String org, String learner, String expert, String title, List<String> modules) {
        boolean eligible = repositories.directory().activeEmployee(org, learner);
        if (!eligible) throw new Failure(400, "Select an active Employee in your organization");
        String id = UUID.randomUUID().toString();
        repositories.pathways().insert(new ManualLearningPathwayEntity(
                uuid(id), uuid(org), uuid(learner), uuid(expert), title, encode(modules), null));
        return pathways(org, learner, true).stream()
                .filter(p -> p.id().equals(id))
                .findFirst()
                .orElseThrow();
    }

    @Override
    public List<Progress> progress(String org, String learner, String module, int revision) {
        List<Progress> result = new ArrayList<>();
        for (var r : repositories.progress().progress(org, learner, module, revision))
            result.add(
                    new Progress(
                            r.lessonId(),
                            r.positionSeconds(),
                            decode(
                                    r.watchedIntervals(),
                                    new TypeReference<List<LearningContent.Interval>>() {}),
                            r.reachedEnd(),
                            time(r.completedAt()),
                            time(r.updatedAt()),
                            time(r.coverageUpdatedAt())));
        return result;
    }

    @Override
    public void progress(String org, String learner, String module, int revision, Progress p) {
        repositories.progress().save(
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
        repositories.resumes().save(org, learner, module, p.lessonId());
    }

    @Override
    public String activeLesson(String org, String learner, String module) {
        return repositories.resumes().lesson(org, learner, module).stream().findFirst().orElse(null);
    }

    @Override
    public void switchVersion(String org, String learner, String module, int from, int to) {
        repositories.pins().switchRevision(org, learner, module, from, to);
        repositories.switches().insert(
                new LearningVersionSwitchEntity(UUID.randomUUID(), org, learner, module, from, to, null));
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
        repositories.notifications().notify(UUID.randomUUID(), org, recipient, key, kind, module, title, body);
    }

    @Override
    public void published(String org, String module, int revision, String title) {
        repositories.pins().learnersBefore(org, module, revision)
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
        List<Notification> result = new ArrayList<>();
        for (var r : repositories.notifications().latest(org, actor))
            result.add(
                    new Notification(
                            r.id().toString(),
                            r.kind(),
                            r.moduleId(),
                            r.title(),
                            r.body(),
                            time(r.createdAt()),
                            time(r.readAt()),r.deepLink(),time(r.toastObservedAt())));
        return result;
    }

    @Override
    public void readNotification(String org, String actor, String id) {
        repositories.notifications().markRead(org, actor, uuid(id));
    }
    @Override public boolean observeNotification(String org,String actor,String id) {
        return repositories.notifications().observe(org,actor,uuid(id))==1;
    }
    @Override public List<Notification> pendingNotifications(String org,String actor) {
        return repositories.notifications().pendingToast(org,actor).stream().map(r->new Notification(r.id().toString(),r.kind(),r.moduleId(),
                r.title(),r.body(),time(r.createdAt()),time(r.readAt()),r.deepLink(),time(r.toastObservedAt()))).toList();
    }
}
