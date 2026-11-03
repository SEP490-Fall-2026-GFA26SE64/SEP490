package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.QuestionBankDto.ActorResponse;
import com.adaptlearngraph.dtos.QuestionBankDto.AuditResponse;
import com.adaptlearngraph.dtos.QuestionBankDto.ChoiceResponse;
import com.adaptlearngraph.dtos.QuestionBankDto.ContentDto;
import com.adaptlearngraph.dtos.QuestionBankDto.ImportBatchResponse;
import com.adaptlearngraph.dtos.QuestionBankDto.NoticeResponse;
import com.adaptlearngraph.dtos.QuestionBankDto.QuestionResponse;
import com.adaptlearngraph.dtos.QuestionBankDto.RowDto;
import com.adaptlearngraph.dtos.QuestionBankDto.SessionResponse;
import com.adaptlearngraph.dtos.QuestionBankDto.VersionResponse;
import com.adaptlearngraph.dtos.QuestionBankDto.ViewResponse;
import com.adaptlearngraph.entities.domain.QuestionBank.Actor;
import com.adaptlearngraph.entities.domain.QuestionBank.Audit;
import com.adaptlearngraph.entities.domain.QuestionBank.Choice;
import com.adaptlearngraph.entities.domain.QuestionBank.Content;
import com.adaptlearngraph.entities.domain.QuestionBank.ImportBatch;
import com.adaptlearngraph.entities.domain.QuestionBank.Notice;
import com.adaptlearngraph.entities.domain.QuestionBank.Question;
import com.adaptlearngraph.entities.domain.QuestionBank.Row;
import com.adaptlearngraph.entities.domain.QuestionBank.Version;
import com.adaptlearngraph.services.QuestionBankUseCase.Session;
import com.adaptlearngraph.services.QuestionBankUseCase.View;
import java.util.List;
import org.modelmapper.ModelMapper;
import org.modelmapper.spi.MappingContext;

/** TypeMaps for the staff Question Bank API; values are copied as currently exposed, never the owning organization. */
public final class QuestionBankMappings implements ModelMapperRegistrar {
    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(Content.class, ContentDto.class).setConverter(context -> {
            Content source = context.getSource();
            return new ContentDto(source.prompt(), source.options(), source.correctAnswer(), source.skillId(),
                    source.skillName(), source.difficulty(), source.explanation());
        });
        mapper.typeMap(Row.class, RowDto.class).setConverter(context -> {
            Row source = context.getSource();
            return new RowDto(source.code(), nested(context, source.content(), ContentDto.class));
        });
        mapper.typeMap(Actor.class, ActorResponse.class).setConverter(context -> {
            Actor source = context.getSource();
            return new ActorResponse(source.id(), source.organization(), source.role());
        });
        mapper.typeMap(Choice.class, ChoiceResponse.class).setConverter(context ->
                new ChoiceResponse(context.getSource().id(), context.getSource().name()));
        mapper.typeMap(Session.class, SessionResponse.class).setConverter(context -> {
            Session source = context.getSource();
            return new SessionResponse(nested(context, source.actor(), ActorResponse.class),
                    list(context, source.skills(), ChoiceResponse.class), list(context, source.experts(), ChoiceResponse.class),
                    list(context, source.people(), ChoiceResponse.class), source.maxImportRows(), source.maxImportBytes());
        });
        mapper.typeMap(Version.class, VersionResponse.class).setConverter(context -> {
            Version source = context.getSource();
            return new VersionResponse(source.id, source.number, source.state, nested(context, source.content, ContentDto.class),
                    source.editedBy, source.editedAt, source.submittedBy, source.submittedAt, source.reviewedBy,
                    source.reviewedAt, source.reason, source.viewed);
        });
        mapper.typeMap(Question.class, QuestionResponse.class).setConverter(context -> {
            Question source = context.getSource();
            return new QuestionResponse(source.id, source.code, source.createdBy, source.createdAt, source.owner,
                    source.revision, source.retired, source.request, list(context, source.versions, VersionResponse.class));
        });
        mapper.typeMap(Audit.class, AuditResponse.class).setConverter(context -> {
            Audit source = context.getSource();
            return new AuditResponse(source.id(), source.question(), source.version(), source.action(), source.actor(),
                    source.at(), source.reason(), nested(context, source.snapshot(), ContentDto.class));
        });
        mapper.typeMap(View.class, ViewResponse.class).setConverter(context -> {
            View source = context.getSource();
            return new ViewResponse(source.id(), source.name(), list(context, source.questions(), QuestionResponse.class),
                    list(context, source.history(), AuditResponse.class));
        });
        mapper.typeMap(Notice.class, NoticeResponse.class).setConverter(context -> {
            Notice source = context.getSource();
            return new NoticeResponse(source.id, source.recipient, source.title, source.body, source.createdAt, source.readAt);
        });
        mapper.typeMap(ImportBatch.class, ImportBatchResponse.class).setConverter(context -> {
            ImportBatch source = context.getSource();
            return new ImportBatchResponse(source.id, source.actor, source.expiresAt, source.committed, source.generatedCodes,
                    list(context, source.rows, RowDto.class), source.errors, source.warnings, source.expected, source.matching);
        });
    }

    private static <D> D nested(MappingContext<?, ?> context, Object source, Class<D> type) {
        return source == null ? null : context.getMappingEngine().map(context.create(source, type));
    }

    private static <D> List<D> list(MappingContext<?, ?> context, List<?> source, Class<D> type) {
        return source == null ? null : source.stream().map(item -> nested(context, item, type)).toList();
    }
}