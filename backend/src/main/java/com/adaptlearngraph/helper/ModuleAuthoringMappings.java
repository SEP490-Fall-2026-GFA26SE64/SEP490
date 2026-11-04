package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.ModuleAuthoringDto.ActorResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.CatalogItemResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.CatalogModuleResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.CatalogPageResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.CatalogTeachingResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.ChoiceResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.ContentResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.DocumentResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.EventResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.GrantResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.IntakeResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.LessonResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.MetadataResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.ModuleInput;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.PackageResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.PageResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.RevisionResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.TeachingResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.TeachingSelection;
import com.adaptlearngraph.entities.domain.LearningContent.Lesson;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Actor;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.CatalogItem;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.CatalogModule;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.CatalogPage;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.CatalogTeaching;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Choice;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Content;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Document;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Event;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Grant;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Intake;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Metadata;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Package;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Page;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Revision;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Save;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Teaching;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.TeachingInput;
import java.util.List;
import org.modelmapper.ModelMapper;
import org.modelmapper.spi.MappingContext;

/** TypeMaps for the module authoring API; values are copied exactly as the established contract exposes them. */
public final class ModuleAuthoringMappings implements ModelMapperRegistrar {
    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(Actor.class, ActorResponse.class).setConverter(context -> {
            Actor source = context.getSource();
            return new ActorResponse(source.id(), source.organizationId(), source.roles());
        });
        mapper.typeMap(Choice.class, ChoiceResponse.class).setConverter(context ->
                new ChoiceResponse(context.getSource().id(), context.getSource().name()));
        mapper.typeMap(Grant.class, GrantResponse.class).setConverter(context ->
                new GrantResponse(context.getSource().expertId(), context.getSource().jobPositionId()));
        mapper.typeMap(Lesson.class, LessonResponse.class).setConverter(context -> {
            Lesson source = context.getSource();
            return new LessonResponse(source.id(), source.title(), source.type(), source.body(), source.bodyFormat(),
                    source.durationSeconds(), source.durationSource(), source.videoSource(), source.assetId(),
                    source.videoUrl());
        });
        mapper.typeMap(Content.class, ContentResponse.class).setConverter(context -> {
            Content source = context.getSource();
            return new ContentResponse(source.id(), source.title(), source.markdown(), source.contentType(),
                    source.contentVersion(), source.jobPositionIds(), source.createdBy(), source.createdAt(),
                    list(context, source.lessons(), LessonResponse.class));
        });
        mapper.typeMap(Metadata.class, MetadataResponse.class).setConverter(context -> {
            Metadata source = context.getSource();
            return new MetadataResponse(source.id(), source.version(), source.status(), source.reviewStatus(),
                    source.reviewedBy(), source.reviewedAt());
        });
        mapper.typeMap(Teaching.class, TeachingResponse.class).setConverter(context -> {
            Teaching source = context.getSource();
            return new TeachingResponse(nested(context, source.metadata(), MetadataResponse.class), source.skillId(),
                    source.skillName(), source.teachingFocus(), source.difficultyLevel());
        });
        mapper.typeMap(Package.class, PackageResponse.class).setConverter(context -> {
            Package source = context.getSource();
            return new PackageResponse(nested(context, source.metadata(), MetadataResponse.class), source.title(),
                    source.moduleType(), source.contentUri(), source.contentType(), source.contentVersion(),
                    source.duration(), source.price(), list(context, source.teachings(), TeachingResponse.class),
                    nested(context, source.content(), ContentResponse.class));
        });
        mapper.typeMap(Revision.class, RevisionResponse.class).setConverter(context -> {
            Revision source = context.getSource();
            return new RevisionResponse(source.number(), source.state(), nested(context, source.payload(), PackageResponse.class),
                    source.editedBy(), source.editedAt(), source.decidedBy(), source.decidedAt(), source.feedback());
        });
        mapper.typeMap(Event.class, EventResponse.class).setConverter(context -> {
            Event source = context.getSource();
            return new EventResponse(source.sequence(), source.revision(), source.action(), source.actorId(),
                    source.occurredAt(), source.detail());
        });
        mapper.typeMap(CatalogTeaching.class, CatalogTeachingResponse.class).setConverter(context -> {
            CatalogTeaching source = context.getSource();
            return new CatalogTeachingResponse(nested(context, source.metadata(), MetadataResponse.class), source.skillId(),
                    source.skillName(), source.teachingFocus(), source.difficultyLevel());
        });
        mapper.typeMap(CatalogModule.class, CatalogModuleResponse.class).setConverter(context -> {
            CatalogModule source = context.getSource();
            return new CatalogModuleResponse(nested(context, source.metadata(), MetadataResponse.class), source.title(),
                    source.moduleType(), source.contentUri(), source.contentType(), source.contentVersion(),
                    source.duration(), source.price(), list(context, source.teachings(), CatalogTeachingResponse.class));
        });
        mapper.typeMap(Intake.class, IntakeResponse.class).setConverter(context -> {
            Intake source = context.getSource();
            return new IntakeResponse(source.moduleId(), source.organizationId(), source.jobPositionIds(),
                    source.assignedBy(), source.assignedAt(), nested(context, source.source(), CatalogModuleResponse.class),
                    source.acceptedBy(), source.acceptedAt(), list(context, source.history(), EventResponse.class),
                    source.expertId());
        });
        mapper.typeMap(Document.class, DocumentResponse.class).setConverter(context -> {
            Document source = context.getSource();
            return new DocumentResponse(source.id(), source.organizationId(), source.jobPositionIds(), source.createdBy(),
                    source.createdAt(), source.lockVersion(), source.everReleased(), source.archived(),
                    source.releasedRevision(), list(context, source.revisions(), RevisionResponse.class),
                    list(context, source.history(), EventResponse.class), nested(context, source.intake(), IntakeResponse.class));
        });
        mapper.typeMap(Page.class, PageResponse.class).setConverter(context -> {
            Page source = context.getSource();
            return new PageResponse(list(context, source.items(), DocumentResponse.class), source.total(), source.page(),
                    source.pageSize());
        });
        mapper.typeMap(CatalogItem.class, CatalogItemResponse.class).setConverter(context -> {
            CatalogItem source = context.getSource();
            return new CatalogItemResponse(nested(context, source.module(), CatalogModuleResponse.class),
                    nested(context, source.authoring(), DocumentResponse.class),
                    nested(context, source.intake(), IntakeResponse.class));
        });
        mapper.typeMap(CatalogPage.class, CatalogPageResponse.class).setConverter(context -> {
            CatalogPage source = context.getSource();
            return new CatalogPageResponse(list(context, source.items(), CatalogItemResponse.class), source.total(),
                    source.page(), source.pageSize());
        });
        mapper.typeMap(TeachingInput.class, TeachingSelection.class).setConverter(context -> {
            TeachingInput source = context.getSource();
            return new TeachingSelection(source.skillId(), source.teachingFocus(), source.difficultyLevel());
        });
        mapper.typeMap(Save.class, ModuleInput.class).setConverter(context -> {
            Save source = context.getSource();
            return new ModuleInput(source.title(), source.moduleType(), source.contentId(), source.duration(), source.price(),
                    source.jobPositionIds(), list(context, source.teachings(), TeachingSelection.class));
        });
    }

    static <D> D nested(MappingContext<?, ?> context, Object source, Class<D> type) {
        return source == null ? null : context.getMappingEngine().map(context.create(source, type));
    }

    static <D> List<D> list(MappingContext<?, ?> context, List<?> source, Class<D> type) {
        return source == null ? null : source.stream().map(item -> nested(context, item, type)).toList();
    }
}