package com.adaptlearngraph.dtos;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Wire shapes of the staff-only Question Bank API. Correct answers and explanations are part of the established
 * staff authoring contract; the owning organization of the bank is never serialized.
 */
public final class QuestionBankDto {
    private QuestionBankDto() {
    }

    public record ContentDto(String prompt, List<String> options, Integer correctAnswer, String skillId, String skillName,
                             String knowledgeLevel, String outcomeCode, boolean mandatory, String explanation) {
        public ContentDto {
            options = options == null ? List.of() : List.copyOf(options);
        }
    }

    public record RowDto(String code, ContentDto content) {}

    public record SaveRequest(UUID id, Long expectedRevision, String code, ContentDto content, boolean acknowledgeDuplicates) {}

    public record PreviewRequest(List<RowDto> rows) {}

    public record ActorResponse(UUID id, UUID organization, String role) {}

    public record ChoiceResponse(String id, String name) {}

    public record SessionResponse(ActorResponse actor, List<ChoiceResponse> skills, List<ChoiceResponse> experts,
                                  List<ChoiceResponse> people, int maxImportRows, long maxImportBytes,List<KnowledgeChoiceResponse> knowledge) {}
    public record KnowledgeChoiceResponse(String skillId,String knowledgeLevel,List<ChoiceResponse> outcomes) {}

    public record VersionResponse(UUID id, int number, String state, ContentDto content, UUID editedBy, Instant editedAt,
                                  UUID submittedBy, Instant submittedAt, UUID reviewedBy, Instant reviewedAt, String reason,
                                  Map<UUID, String> viewed,String publicationSource) {}

    public record QuestionResponse(UUID id, String code, UUID createdBy, Instant createdAt, UUID owner, long revision,
                                   boolean retired, String request, List<VersionResponse> versions) {}

    public record AuditResponse(UUID id, UUID question, UUID version, String action, UUID actor, Instant at, String reason,
                                ContentDto snapshot) {}

    public record ViewResponse(UUID id, String name, List<QuestionResponse> questions, List<AuditResponse> history) {}

    public record NoticeResponse(UUID id, UUID recipient, String title, String body, Instant createdAt, Instant readAt) {}

    public record ImportBatchResponse(UUID id, UUID actor, Instant expiresAt, boolean committed, boolean generatedCodes,
                                      List<RowDto> rows, List<String> errors, List<String> warnings, Map<String, Long> expected,
                                      Map<String, List<String>> matching) {}
}
