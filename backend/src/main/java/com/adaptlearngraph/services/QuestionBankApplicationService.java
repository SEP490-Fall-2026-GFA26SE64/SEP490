package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.QuestionBankDto.ContentDto;
import com.adaptlearngraph.dtos.QuestionBankDto.ImportBatchResponse;
import com.adaptlearngraph.dtos.QuestionBankDto.NoticeResponse;
import com.adaptlearngraph.dtos.QuestionBankDto.PreviewRequest;
import com.adaptlearngraph.dtos.QuestionBankDto.SaveRequest;
import com.adaptlearngraph.dtos.QuestionBankDto.SessionResponse;
import com.adaptlearngraph.dtos.QuestionBankDto.ViewResponse;
import com.adaptlearngraph.entities.domain.QuestionBank;
import com.adaptlearngraph.entities.domain.QuestionBank.Content;
import com.adaptlearngraph.entities.domain.QuestionBank.Row;
import com.adaptlearngraph.services.QuestionBankUseCase.Bulk;
import com.adaptlearngraph.services.QuestionBankUseCase.Command;
import com.adaptlearngraph.services.QuestionBankUseCase.Confirmation;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import org.modelmapper.ModelMapper;

/**
 * DTO boundary of the staff Question Bank API. Request content is translated explicitly; actor and organization
 * always come from the trusted session inside the use case.
 */
public class QuestionBankApplicationService {
    /** HTTP-safe rejection carrying the use case's status and message. */
    public static final class Failure extends RuntimeException {
        private final int status;

        public Failure(int status, String message) {
            super(message);
            this.status = status;
        }

        public int status() {
            return status;
        }
    }

    private final QuestionBankUseCase bank;
    private final ModelMapper mapper;

    public QuestionBankApplicationService(QuestionBankUseCase bank, ModelMapper mapper) {
        this.bank = Objects.requireNonNull(bank, "bank");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public SessionResponse session() {
        return map(call(bank::session), SessionResponse.class);
    }

    public ViewResponse read() {
        return view(call(bank::read));
    }

    public ViewResponse save(SaveRequest input) {
        var save = new QuestionBankUseCase.Save(input.id(), input.expectedRevision(), input.code(), content(input.content()),
                input.acknowledgeDuplicates());
        return view(call(() -> bank.save(save)));
    }

    public ViewResponse command(Command input) {
        return view(call(() -> bank.command(input)));
    }

    public ViewResponse approve(Bulk input) {
        return view(call(() -> bank.approve(input)));
    }

    public ImportBatchResponse preview(PreviewRequest input) {
        var rows = input.rows() == null ? null : input.rows().stream()
                .map(row -> row == null ? null : new Row(row.code(), content(row.content()))).toList();
        return map(call(() -> bank.preview(new QuestionBankUseCase.Preview(rows))), ImportBatchResponse.class);
    }

    public ViewResponse confirm(Confirmation input) {
        return view(call(() -> bank.confirm(input)));
    }

    public List<NoticeResponse> notices() {
        var notices = call(bank::notices);
        return notices == null ? null : notices.stream().map(notice -> map(notice, NoticeResponse.class)).toList();
    }

    public void markRead(UUID id) {
        call(() -> {
            bank.markRead(id);
            return null;
        });
    }

    private static Content content(ContentDto content) {
        return content == null ? null : new Content(content.prompt(), content.options(), content.correctAnswer(),
                content.skillId(), content.skillName(), content.difficulty(), content.explanation());
    }

    private ViewResponse view(QuestionBankUseCase.View view) {
        return map(view, ViewResponse.class);
    }

    private <D> D map(Object source, Class<D> type) {
        return source == null ? null : mapper.map(source, type);
    }

    private static <T> T call(Supplier<T> work) {
        try {
            return work.get();
        } catch (QuestionBank.Failure failure) {
            throw new Failure(failure.status(), failure.getMessage());
        }
    }
}