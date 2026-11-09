package com.adaptlearngraph.entities.domain;

import java.time.Instant;
import java.util.*;

/** Working drafts are separate from immutable assessment item definitions. Staff-only aggregate. */
public final class QuestionBank {
    public UUID id;
    public UUID organization;
    public String name;
    public List<Question> questions = new ArrayList<>();
    public List<Audit> history = new ArrayList<>();
    public List<Notice> notices = new ArrayList<>();
    public List<ImportBatch> imports = new ArrayList<>();
    public static final class Question {
        public UUID id;
        /** Source identity stays immutable when several owned banks share an authoring workspace. */
        public UUID sourceBankId;
        public String code;
        public UUID createdBy;
        public Instant createdAt;
        public UUID owner;
        public long revision;
        public boolean retired;
        public String request;
        public List<Version> versions = new ArrayList<>();
    }
    public static final class Version {
        public UUID id;
        public int number;
        public String state;
        public Content content;
        public UUID editedBy;
        public Instant editedAt;
        public UUID submittedBy;
        public Instant submittedAt;
        public UUID reviewedBy;
        public Instant reviewedAt;
        public String reason;
        public String publicationSource;
        public Map<UUID, String> viewed = new HashMap<>();
    }
    public record Content(String prompt, List<String> options, Integer correctAnswer,
                          String skillId, String skillName, String difficulty, String explanation,
                          String knowledgeLevel, String outcomeCode, boolean mandatory) {
        /** Historical JSON/import callers retain original difficulty without inferring knowledge. */
        public Content(String prompt,List<String> options,Integer answer,String skill,String name,String difficulty,String explanation) {
            this(prompt,options,answer,skill,name,difficulty,explanation,null,null,false);
        }
        public Content { options = options == null ? List.of() : List.copyOf(options); }
    }
    public record Audit(UUID id, UUID question, UUID version, String action, UUID actor,
                        Instant at, String reason, Content snapshot) {}
    public static final class Notice {
        public UUID id;
        public UUID recipient;
        public String title;
        public String body;
        public Instant createdAt;
        public Instant readAt;
    }
    public static final class ImportBatch {
        public UUID id;
        public UUID actor;
        public Instant expiresAt;
        public boolean committed;
        public boolean generatedCodes;
        public List<Row> rows = new ArrayList<>();
        public List<String> errors = new ArrayList<>();
        public List<String> warnings = new ArrayList<>();
        public Map<String, Long> expected = new HashMap<>();
        public Map<String, List<String>> matching = new HashMap<>();
    }
    public record Row(String code, Content content) {}
    public record Actor(UUID id, UUID organization, String role) {
        public boolean manager() { return "LD_MANAGER".equals(role); }
        public boolean expert() { return "DOMAIN_EXPERT".equals(role); }
    }
    public record Choice(String id, String name) {}
    public record KnowledgeChoice(String skillId,String knowledgeLevel,List<Choice> outcomes) {}
    public static final class Failure extends RuntimeException {
        private final int status;
        public Failure(int status, String message) { super(message); this.status=status; }
        public int status() { return status; }
    }
}
