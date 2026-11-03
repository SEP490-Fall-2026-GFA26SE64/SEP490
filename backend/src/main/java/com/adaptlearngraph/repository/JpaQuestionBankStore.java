package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.ItemVersionEntity;
import com.adaptlearngraph.entities.domain.QuestionBank;
import com.adaptlearngraph.entities.domain.QuestionBank.*;
import com.adaptlearngraph.entities.QuestionBankEntity;
import com.adaptlearngraph.repository.QuestionBankPorts.Store;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.transaction.support.TransactionTemplate;

/** JPA adapter for the organization question bank: one serialized authoring document plus published item projection. */
public final class JpaQuestionBankStore implements Store {
    private final QuestionBankJpaRepository banks;
    private final ItemVersionJpaRepository items;
    private final PostgresAdvisoryLocks locks;
    private final TransactionTemplate tx;
    private final ObjectMapper json;

    public JpaQuestionBankStore(QuestionBankJpaRepository banks, ItemVersionJpaRepository items, PostgresAdvisoryLocks locks,
            TransactionTemplate tx, ObjectMapper json) {
        this.banks = banks;
        this.items = items;
        this.locks = locks;
        this.tx = tx;
        this.json = json;
    }

    @Override
    public <T> T atomic(Actor actor, Function<QuestionBank, T> command) {
        return tx.execute(status -> {
            if (banks.lockStaffMembership(actor.id(), actor.organization(), actor.role()).size() != 1) {
                throw new Failure(403, "Current organization staff membership required");
            }
            locks.lock("question-bank:" + actor.organization());
            var existing = banks.lockDocument(actor.organization());
            QuestionBank bank = existing.isEmpty() ? initialize(actor) : decode(existing.getFirst());
            if (items.spansOtherBanks(bank.id)) throw new Failure(409, "Legacy item identity spans multiple banks; explicit reconciliation required");
            String before = encode(bank);
            var result = command.apply(bank);
            String after = encode(bank);
            if (existing.isEmpty() || !before.equals(after)) {
                project(bank);
                banks.saveDocument(actor.organization(), bank.id, after);
            }
            return result;
        });
    }

    private QuestionBank initialize(Actor actor) {
        var owned = banks.banksOf(actor.organization());
        if (owned.size() > 1) throw new Failure(409, "Multiple legacy banks need explicit administrator resolution; no data was merged");
        var bank = new QuestionBank();
        bank.organization = actor.organization();
        bank.name = "Organization Question Bank";
        if (owned.isEmpty()) {
            bank.id = UUID.randomUUID();
            banks.insert(new QuestionBankEntity(bank.id, bank.name, actor.id()));
        } else {
            bank.id = owned.getFirst();
            bank.name = banks.name(bank.id).orElseThrow();
        }
        for (var row : items.definitionsOf(bank.id)) {
            UUID id = row.itemId();
            var q = bank.questions.stream().filter(x -> x.id.equals(id)).findFirst().orElse(null);
            if (q == null) {
                q = new Question();
                q.id = id;
                q.code = "Q-" + id.toString().toUpperCase(Locale.ROOT);
                q.revision = 1;
                bank.questions.add(q);
            }
            var v = new Version();
            v.id = row.itemVersionId();
            v.number = row.version();
            v.state = row.publicationState();
            try {
                var schema = json.readTree(row.responseSchema());
                var options = new ArrayList<String>();
                for (var option : schema.path("options")) options.add(option.path("text").asText());
                String correct = json.readTree(row.protectedKey()).path("correctOptionId").asText();
                Integer answer = null;
                int n = 0;
                for (var option : schema.path("options")) {
                    if (option.path("id").asText().equals(correct)) answer = n;
                    n++;
                }
                v.content = new Content(row.prompt(), options, answer, row.microSkillId(), row.microSkillNameSnapshot(), row.difficulty(), null);
            } catch (Exception invalid) {
                throw new Failure(409, "Legacy question content needs explicit repair");
            }
            q.versions.add(v);
        }
        return bank;
    }

    private void project(QuestionBank bank) {
        for (var q : bank.questions) {
            if (banks.projectIdentity(q.id, bank.id, q.code, q.retired) != 1) {
                throw new Failure(409, "Question identity changed; explicit reconciliation required");
            }
            for (var v : q.versions) {
                if (!"PUBLISHED".equals(v.state)) continue;
                var states = items.states(v.id, q.id, bank.id, v.number);
                if (states.contains("PUBLISHED")) continue; // Existing immutable legacy definitions keep their original bytes/hash.
                var options = new ArrayList<Map<String, String>>();
                for (int i = 0; i < 4; i++) options.add(Map.of("id", String.valueOf((char) ('A' + i)), "text", v.content.options().get(i)));
                String response = encode(Map.of("type", "SINGLE_CHOICE", "options", options));
                String key = encode(Map.of("correctOptionId", String.valueOf((char) ('A' + v.content.correctAnswer()))));
                String hash = sha256(encode(List.of(bank.id, q.id, v.number, v.content.prompt(), response, key, v.content.skillId(),
                        v.content.skillName(), v.content.difficulty())));
                if (states.contains("DRAFT")) {
                    if (items.publishDraft(v.id, v.content.prompt(), response, key, hash, v.content.skillId(), v.content.skillName(),
                            v.content.difficulty()) != 1) throw new Failure(409, "Legacy draft changed during approval");
                    continue;
                }
                items.insert(new ItemVersionEntity(v.id, q.id, v.number, bank.id, v.content.prompt(), response, key, "PUBLISHED", hash,
                        v.content.skillId(), v.content.skillName(), v.content.difficulty()));
            }
        }
        for (var notice : bank.notices) {
            banks.queueNotice(notice.id, bank.organization, notice.recipient, notice.title, notice.body, notice.createdAt);
        }
    }

    private QuestionBank decode(String value) {
        try {
            return json.readValue(value, QuestionBank.class);
        } catch (Exception e) {
            throw new Failure(503, "Question Bank storage is unavailable");
        }
    }

    private String encode(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (Exception e) {
            throw new Failure(503, "Question Bank serialization failed");
        }
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
