package com.adaptlearngraph.helper;

import static com.adaptlearngraph.helper.ModuleAuthoringMappings.list;
import static com.adaptlearngraph.helper.ModuleAuthoringMappings.nested;

import com.adaptlearngraph.dtos.LearningContentDto.AssetResponse;
import com.adaptlearngraph.dtos.LearningContentDto.ImportPreviewResponse;
import com.adaptlearngraph.dtos.LearningContentDto.ImportProblemResponse;
import com.adaptlearngraph.dtos.LearningContentDto.ImportRowResponse;
import com.adaptlearngraph.dtos.LearningContentDto.IntervalResponse;
import com.adaptlearngraph.dtos.LearningContentDto.LearningViewResponse;
import com.adaptlearngraph.dtos.LearningContentDto.LimitsResponse;
import com.adaptlearngraph.dtos.LearningContentDto.NotificationResponse;
import com.adaptlearngraph.dtos.LearningContentDto.PathwayResponse;
import com.adaptlearngraph.dtos.LearningContentDto.ProgressResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.LessonResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.ModuleInput;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.RevisionResponse;
import com.adaptlearngraph.entities.domain.LearningContent.Interval;
import com.adaptlearngraph.entities.domain.LearningResources.Asset;
import com.adaptlearngraph.entities.domain.LearningResources.LearningView;
import com.adaptlearngraph.entities.domain.LearningResources.Limits;
import com.adaptlearngraph.entities.domain.LearningResources.Notification;
import com.adaptlearngraph.entities.domain.LearningResources.Pathway;
import com.adaptlearngraph.entities.domain.LearningResources.Progress;
import com.adaptlearngraph.services.LearningImportUseCase.Preview;
import com.adaptlearngraph.services.LearningImportUseCase.Problem;
import com.adaptlearngraph.services.LearningImportUseCase.Row;
import org.modelmapper.ModelMapper;

/**
 * TypeMaps for the learning content API. Revisions, lessons and module drafts reuse {@link ModuleAuthoringMappings},
 * which must be registered on the same mapper. Asset storage metadata is copied as the upload contract exposes it.
 */
public final class LearningContentMappings implements ModelMapperRegistrar {
    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(Limits.class, LimitsResponse.class).setConverter(context -> {
            Limits source = context.getSource();
            return new LimitsResponse(source.videoBytes(), source.imageBytes(), source.zipBytes(), source.version(),
                    source.changedBy(), source.changedAt());
        });
        mapper.typeMap(Asset.class, AssetResponse.class).setConverter(context -> {
            Asset source = context.getSource();
            return new AssetResponse(source.id(), source.organizationId(), source.createdBy(), source.objectKey(),
                    source.filename(), source.mediaType(), source.byteSize(), source.sha256(), source.durationSeconds(),
                    source.createdAt());
        });
        mapper.typeMap(Pathway.class, PathwayResponse.class).setConverter(context -> {
            Pathway source = context.getSource();
            return new PathwayResponse(source.id(), source.learnerId(), source.expertId(), source.title(), source.moduleIds(),
                    source.confirmedAt());
        });
        mapper.typeMap(Interval.class, IntervalResponse.class).setConverter(context ->
                new IntervalResponse(context.getSource().start(), context.getSource().end()));
        mapper.typeMap(Progress.class, ProgressResponse.class).setConverter(context -> {
            Progress source = context.getSource();
            return new ProgressResponse(source.lessonId(), source.positionSeconds(),
                    list(context, source.watchedIntervals(), IntervalResponse.class), source.reachedEnd(),
                    source.completedAt(), source.updatedAt(), source.coverageUpdatedAt());
        });
        mapper.typeMap(LearningView.class, LearningViewResponse.class).setConverter(context -> {
            LearningView source = context.getSource();
            return new LearningViewResponse(nested(context, source.revision(), RevisionResponse.class),
                    source.latestRevision(), source.activeLessonId(), list(context, source.progress(), ProgressResponse.class));
        });
        mapper.typeMap(Notification.class, NotificationResponse.class).setConverter(context -> {
            Notification source = context.getSource();
            return new NotificationResponse(source.id(), source.kind(), source.moduleId(), source.title(), source.body(),
                    source.createdAt(), source.readAt(),source.deepLink(),source.toastObservedAt());
        });
        mapper.typeMap(Row.class, ImportRowResponse.class).setConverter(context -> {
            Row source = context.getSource();
            return new ImportRowResponse(source.moduleId(), source.excelRow(), nested(context, source.module(), ModuleInput.class),
                    list(context, source.lessons(), LessonResponse.class), source.expectedVersion());
        });
        mapper.typeMap(Problem.class, ImportProblemResponse.class).setConverter(context -> {
            Problem source = context.getSource();
            return new ImportProblemResponse(source.moduleId(), source.row(), source.reason());
        });
        mapper.typeMap(Preview.class, ImportPreviewResponse.class).setConverter(context -> {
            Preview source = context.getSource();
            return new ImportPreviewResponse(source.id(), list(context, source.modules(), ImportRowResponse.class),
                    list(context, source.errors(), ImportProblemResponse.class), source.ownedDuplicates(), source.committed());
        });
    }
}
