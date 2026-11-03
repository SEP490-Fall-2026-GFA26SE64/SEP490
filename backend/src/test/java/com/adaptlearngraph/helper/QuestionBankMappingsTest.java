package com.adaptlearngraph.helper;

import static org.assertj.core.api.Assertions.assertThat;

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
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.RecordComponent;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;

/**
 * The staff Question Bank keeps its established authoring contract (answer key and explanation are visible to the
 * bank's own reviewers) and never serializes the owning organization or other aggregate internals.
 */
class QuestionBankMappingsTest {
    private static final UUID ORGANIZATION = UUID.fromString("0a9a0000-0000-4000-8000-000000000001");
    private static final UUID BANK = uuid(1);
    private static final UUID QUESTION = uuid(2);
    private static final UUID VERSION = uuid(3);
    private static final UUID AUTHOR = uuid(4);
    private static final UUID REVIEWER = uuid(5);
    private static final Instant T1 = Instant.parse("2026-10-01T08:00:00Z");
    private static final Instant T2 = Instant.parse("2026-10-02T08:00:00Z");
    private static final Instant T3 = Instant.parse("2026-10-03T08:00:00Z");

    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    private final ModelMapper mapper = ModelMapperFactory.create(List.of(new QuestionBankMappings()));

    @Test
    void staffViewCopiesEveryAuthoringValueButNotTheOwningOrganization() throws Exception {
        var content = content();
        var version = new Version();
        version.id = VERSION;
        version.number = 2;
        version.state = "IN_REVIEW";
        version.content = content;
        version.editedBy = AUTHOR;
        version.editedAt = T1;
        version.submittedBy = AUTHOR;
        version.submittedAt = T2;
        version.reviewedBy = REVIEWER;
        version.reviewedAt = T3;
        version.reason = "Clarified";
        version.viewed = Map.of(REVIEWER, "2026-10-03T08:00:00Z");
        var question = new Question();
        question.id = QUESTION;
        question.code = "Q-001";
        question.createdBy = AUTHOR;
        question.createdAt = T1;
        question.owner = AUTHOR;
        question.revision = 7;
        question.retired = false;
        question.request = "Please review";
        question.versions = List.of(version);
        var audit = new Audit(uuid(6), QUESTION, VERSION, "SUBMIT", AUTHOR, T2, "ready", content);

        var response = mapper.map(new View(BANK, "Java bank", List.of(question), List.of(audit)), ViewResponse.class);

        var contentDto = contentDto();
        assertThat(response).isEqualTo(new ViewResponse(BANK, "Java bank", List.of(new QuestionResponse(QUESTION, "Q-001",
                AUTHOR, T1, AUTHOR, 7, false, "Please review", List.of(new VersionResponse(VERSION, 2, "IN_REVIEW", contentDto,
                        AUTHOR, T1, AUTHOR, T2, REVIEWER, T3, "Clarified", Map.of(REVIEWER, "2026-10-03T08:00:00Z"))))),
                List.of(new AuditResponse(uuid(6), QUESTION, VERSION, "SUBMIT", AUTHOR, T2, "ready", contentDto))));
        assertThat(components(ViewResponse.class)).doesNotContain("organization", "notices", "imports");
        String body = json.writeValueAsString(response);
        assertThat(body).contains("\"correctAnswer\":2", "\"explanation\":\"Because B\"").doesNotContain(ORGANIZATION.toString());
    }

    @Test
    void sessionNoticeAndImportBatchCopyEveryValue() {
        var session = new Session(new Actor(AUTHOR, ORGANIZATION, "DOMAIN_EXPERT"), List.of(new Choice("s1", "Java")),
                List.of(new Choice("e1", "Expert")), List.of(new Choice("p1", "Person")), 500, 10_485_760L);
        assertThat(mapper.map(session, SessionResponse.class)).isEqualTo(new SessionResponse(
                new ActorResponse(AUTHOR, ORGANIZATION, "DOMAIN_EXPERT"), List.of(new ChoiceResponse("s1", "Java")),
                List.of(new ChoiceResponse("e1", "Expert")), List.of(new ChoiceResponse("p1", "Person")), 500, 10_485_760L));

        var notice = new Notice();
        notice.id = uuid(7);
        notice.recipient = REVIEWER;
        notice.title = "Review";
        notice.body = "Please review Q-001";
        notice.createdAt = T1;
        notice.readAt = T2;
        assertThat(mapper.map(notice, NoticeResponse.class))
                .isEqualTo(new NoticeResponse(uuid(7), REVIEWER, "Review", "Please review Q-001", T1, T2));

        var batch = new ImportBatch();
        batch.id = uuid(8);
        batch.actor = AUTHOR;
        batch.expiresAt = T3;
        batch.committed = true;
        batch.generatedCodes = true;
        batch.rows = List.of(new Row("Q-002", content()));
        batch.errors = List.of("row 3 invalid");
        batch.warnings = List.of("duplicate");
        batch.expected = Map.of("Q-002", 1L);
        batch.matching = Map.of("Q-002", List.of("Q-001"));
        assertThat(mapper.map(batch, ImportBatchResponse.class)).isEqualTo(new ImportBatchResponse(uuid(8), AUTHOR, T3, true,
                true, List.of(new RowDto("Q-002", contentDto())), List.of("row 3 invalid"), List.of("duplicate"),
                Map.of("Q-002", 1L), Map.of("Q-002", List.of("Q-001"))));
    }

    @Test
    void contentRequestNormalizesMissingOptionsLikeTheDomain() {
        assertThat(new ContentDto("p", null, null, null, null, null, null).options()).isEmpty();
        assertThat(new Content("p", null, null, null, null, null, null).options()).isEmpty();
    }

    private static Content content() {
        return new Content("Which keyword?", List.of("A", "B", "C", "D"), 2, "skill-java", "Java", "EASY", "Because B");
    }

    private static ContentDto contentDto() {
        return new ContentDto("Which keyword?", List.of("A", "B", "C", "D"), 2, "skill-java", "Java", "EASY", "Because B");
    }

    private static List<String> components(Class<?> type) {
        return Arrays.stream(type.getRecordComponents()).map(RecordComponent::getName).toList();
    }

    private static UUID uuid(long value) {
        return new UUID(0L, value);
    }
}