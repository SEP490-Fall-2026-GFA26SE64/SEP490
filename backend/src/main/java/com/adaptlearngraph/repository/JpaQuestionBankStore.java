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
    private final AssessmentItemKnowledgeMappingJpaRepository mappings;

    public JpaQuestionBankStore(QuestionBankJpaRepository banks, ItemVersionJpaRepository items, PostgresAdvisoryLocks locks,
            TransactionTemplate tx, ObjectMapper json, AssessmentItemKnowledgeMappingJpaRepository mappings) {
        this.banks = banks;
        this.items = items;
        this.locks = locks;
        this.tx = tx;
        this.json = json;
        this.mappings = mappings;
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
            if(!actor.organization().equals(bank.organization))throw new Failure(403,"Question Bank organization changed");
            String before = encode(bank);
            var owned=banks.banksOf(actor.organization());
            if(!owned.contains(bank.id))throw new Failure(403,"Question Bank owner changed");
            for(var source:owned) {
                if(items.spansOtherBanks(source))throw new Failure(409,"Legacy item identity spans multiple banks; explicit reconciliation required");
                banks.registerScope(actor.organization(),source);
            }
            for(var question:bank.questions) {
                if(question.sourceBankId==null)question.sourceBankId=bank.id;
                if(!owned.contains(question.sourceBankId))throw new Failure(403,"Question source bank is outside this organization");
            }
            for(var source:owned)if(bank.questions.stream().noneMatch(q->source.equals(q.sourceBankId)))adopt(bank,List.of(source));
            var result = command.apply(bank);
            String after = encode(bank);
            if (existing.isEmpty() || !before.equals(after)) {
                banks.saveDocument(actor.organization(), bank.id, after);
                project(bank,existing.isEmpty()?null:decode(before));
            }
            return result;
        });
    }

    private QuestionBank initialize(Actor actor) {
        var owned = banks.banksOf(actor.organization());
        var bank = new QuestionBank();
        bank.organization = actor.organization();
        bank.name = "Organization Question Bank";
        if (owned.size()!=1) {
            bank.id = UUID.nameUUIDFromBytes(("organization-question-bank:v1:"+actor.organization()).getBytes(StandardCharsets.UTF_8));
            if(!owned.contains(bank.id))
            banks.insert(new QuestionBankEntity(bank.id, bank.name, actor.id()));
        } else {
            bank.id = owned.getFirst();
            bank.name = banks.name(bank.id).orElseThrow();
        }
        adopt(bank,owned);
        return bank;
    }
    private void adopt(QuestionBank bank,List<UUID> sources) {
        if(sources.size()>100)throw new Failure(422,"Question Bank source limit exceeded");
        for(var source:sources) for (var row : items.definitionsOf(source)) {
            if(bank.questions.size()>10000)throw new Failure(422,"Question Bank item limit exceeded");
            UUID id = row.itemId();
            var q = bank.questions.stream().filter(x -> x.id.equals(id)).findFirst().orElse(null);
            if (q == null) {
                q = new Question();
                q.id = id;
                q.sourceBankId=source;
                q.code = "Q-" + id.toString().toUpperCase(Locale.ROOT);
                q.revision = 1;
                bank.questions.add(q);
            }
            if(!source.equals(q.sourceBankId))throw new Failure(409,"Legacy item identity spans multiple banks; explicit reconciliation required");
            if(q.versions.stream().anyMatch(v->v.id.equals(row.itemVersionId())))continue;
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
    }

    private void project(QuestionBank bank,QuestionBank previous) {
        var prior=new java.util.HashMap<UUID,Question>();if(previous!=null)previous.questions.forEach(q->prior.put(q.id,q));
        for (var q : bank.questions) {
            var old=prior.get(q.id);
            if(old!=null && encode(old).equals(encode(q)))continue;
            UUID source=q.sourceBankId==null?bank.id:q.sourceBankId;
            if (banks.projectIdentity(q.id, source, q.code, q.retired) != 1) {
                throw new Failure(409, "Question identity changed; explicit reconciliation required");
            }
            for (var v : q.versions) {
                if (!"PUBLISHED".equals(v.state)) continue;
                var oldVersion=old==null?null:old.versions.stream().filter(x->x.id.equals(v.id)&&"PUBLISHED".equals(x.state)).findFirst().orElse(null);
                if(oldVersion!=null) {
                    if(!oldVersion.content.equals(v.content))throw new Failure(409,"Published question definitions are immutable");
                    continue;
                }
                var states = items.states(v.id, q.id, source, v.number);
                if (states.contains("PUBLISHED")) continue; // Existing immutable legacy definitions keep their original bytes/hash.
                var options = new ArrayList<Map<String, String>>();
                for (int i = 0; i < 4; i++) options.add(Map.of("id", String.valueOf((char) ('A' + i)), "text", v.content.options().get(i)));
                String response = encode(Map.of("type", "SINGLE_CHOICE", "options", options));
                String key = encode(Map.of("correctOptionId", String.valueOf((char) ('A' + v.content.correctAnswer()))));
                String hash = sha256(encode(List.of(source, q.id, v.number, v.content.prompt(), response, key, v.content.skillId(),
                        v.content.skillName(), v.content.knowledgeLevel(), v.content.skillVersion(),v.content.mandatory())));
                if (states.contains("DRAFT")) {
                    if (items.publishDraft(v.id, v.content.prompt(), response, key, hash, v.content.skillId(), v.content.skillName(),
                            v.content.difficulty()) != 1) throw new Failure(409, "Legacy draft changed during approval");
                } else items.insert(new ItemVersionEntity(v.id, q.id, v.number, source, v.content.prompt(), response, key, "PUBLISHED", hash,
                        v.content.skillId(), v.content.skillName(), null));
                mappings.insert(new com.adaptlearngraph.entities.AssessmentItemKnowledgeMappingEntity(v.id,bank.organization,source,
                        v.content.skillId(),v.content.knowledgeLevel(),null,v.content.mandatory(),v.number,
                        sha256(encode(List.of(v.id,bank.organization,v.content.skillId(),v.content.knowledgeLevel(),
                                v.content.skillVersion(),v.content.mandatory(),v.number)))));
                mappings.bindScope(v.id,v.content.skillVersion());
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
