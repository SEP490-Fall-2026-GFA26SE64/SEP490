package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.ModuleAuthoringDto.ActorResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.CatalogPageResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.ChoiceResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.ContentResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.DocumentResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.GrantResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.IntakeResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.LessonRequest;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.ModuleInput;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.PageResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.RevisionResponse;
import com.adaptlearngraph.entities.domain.LearningContent.Lesson;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Save;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.TeachingInput;
import java.util.List;
import java.util.Objects;
import org.modelmapper.ModelMapper;

/**
 * DTO boundary of the module authoring API. Actor and organization come from the trusted session inside
 * {@link ModuleAuthoringService}; request bodies are translated explicitly and never carry server-managed fields.
 */
public class ModuleAuthoringApplicationService {
    private final ModuleAuthoringService modules;
    private final ModelMapper mapper;

    public ModuleAuthoringApplicationService(ModuleAuthoringService modules, ModelMapper mapper) {
        this.modules = Objects.requireNonNull(modules, "modules");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public ActorResponse session() {
        return map(modules.session(), ActorResponse.class);
    }

    public List<ChoiceResponse> catalog(String kind) {
        return list(modules.choices(kind), ChoiceResponse.class);
    }

    public List<GrantResponse> grants() {
        return list(modules.grants(), GrantResponse.class);
    }

    public void grant(String expertId, String jobPositionId, boolean active) {
        modules.grant(expertId, jobPositionId, active);
    }

    public List<ContentResponse> contents() {
        return list(modules.contents(), ContentResponse.class);
    }

    public ContentResponse content(String title, String markdown, List<String> jobPositionIds) {
        return map(modules.content(title, markdown, jobPositionIds), ContentResponse.class);
    }

    public ContentResponse lessons(String title, List<LessonRequest> lessons, List<String> jobPositionIds) {
        List<Lesson> values = lessons == null ? null : lessons.stream().map(ModuleAuthoringApplicationService::lesson).toList();
        return map(modules.lessons(title, values, jobPositionIds), ContentResponse.class);
    }

    public PageResponse list(String search, String status, String review, String type, String skill, int page,
            boolean pendingOnly) {
        return map(modules.list(search, status, review, type, skill, page, pendingOnly), PageResponse.class);
    }

    public DocumentResponse detail(String id) {
        return document(modules.detail(id));
    }

    public CatalogPageResponse catalogList(String search, String status, String review, String type, String skill, int page) {
        return map(modules.catalogList(search, status, review, type, skill, page), CatalogPageResponse.class);
    }

    public IntakeResponse assignIntake(String id, List<String> jobPositionIds, String expectedAssignedAt, String expertId) {
        return map(modules.assignIntake(id, jobPositionIds, expectedAssignedAt, expertId), IntakeResponse.class);
    }

    public DocumentResponse acceptIntake(String id) {
        return document(modules.acceptIntake(id));
    }

    public DocumentResponse create(ModuleInput input) {
        return document(modules.create(save(input)));
    }

    public DocumentResponse update(String id, long expectedVersion, ModuleInput input) {
        return document(modules.update(id, expectedVersion, save(input)));
    }

    public DocumentResponse action(String id, long expectedVersion, String action, String feedback) {
        return document(modules.action(id, expectedVersion, action, feedback));
    }

    public void delete(String id, long expectedVersion) {
        modules.delete(id, expectedVersion);
    }

    public RevisionResponse learning(String id, boolean start) {
        return map(modules.learning(id, start), RevisionResponse.class);
    }

    /** Explicit request translation; {@code null} values are passed through so the use case reports them as before. */
    static Save save(ModuleInput input) {
        if (input == null) return null;
        List<TeachingInput> teachings = input.teachings() == null ? null : input.teachings().stream()
                .map(teaching -> teaching == null ? null
                        : new TeachingInput(teaching.skillId()))
                .toList();
        return new Save(input.title(), input.moduleType(), input.contentId(), input.duration(), input.jobPositionIds(), teachings,input.knowledgeLevel(),input.outcomeCodes());
    }

    private static Lesson lesson(LessonRequest lesson) {
        return lesson == null ? null : new Lesson(lesson.id(), lesson.title(), lesson.type(), lesson.body(), lesson.bodyFormat(),
                lesson.durationSeconds(), lesson.durationSource(), lesson.videoSource(), lesson.assetId(), lesson.videoUrl());
    }

    private DocumentResponse document(Object document) {
        return map(document, DocumentResponse.class);
    }

    private <D> D map(Object source, Class<D> type) {
        return source == null ? null : mapper.map(source, type);
    }

    private <D> List<D> list(List<?> source, Class<D> type) {
        return source == null ? null : source.stream().map(item -> map(item, type)).toList();
    }
}
