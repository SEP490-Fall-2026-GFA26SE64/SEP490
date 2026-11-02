package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.OfficialQuestionBankManifest;
import com.adaptlearngraph.entities.ItemVersionEntity;
import com.adaptlearngraph.entities.QuestionBankEntity;
import com.adaptlearngraph.repository.ItemVersionJpaRepository;
import com.adaptlearngraph.repository.OfficialQuestionBankImportJpaRepository;
import com.adaptlearngraph.repository.PostgresAdvisoryLocks;
import com.adaptlearngraph.repository.QuestionBankJpaRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static com.adaptlearngraph.dtos.OfficialQuestionBankManifest.*;

/** DRAFT-only, insert-only, single-transaction import. Does not authorize runtime publication. */
public final class OfficialQuestionBankImporter {
    public enum Mode { ADMINISTRATOR, LOCAL_SEED }
    public record Owner(UUID accountId, UUID organizationId, String expectedJdbcUrl) {}
    public record Result(UUID bankId, int createdItems, int existingItems) {}
    private final OfficialQuestionBankImportJpaRepository imports;
    private final QuestionBankJpaRepository banks;
    private final ItemVersionJpaRepository items;
    private final PostgresAdvisoryLocks locks;
    private final TransactionTemplate transactions;

    /** {@code transactions} must be the JPA transaction manager the repositories run on. */
    public OfficialQuestionBankImporter(OfficialQuestionBankImportJpaRepository imports, QuestionBankJpaRepository banks,
            ItemVersionJpaRepository items, PostgresAdvisoryLocks locks, PlatformTransactionManager transactions) {
        this.imports = imports; this.banks = banks; this.items = items; this.locks = locks;
        this.transactions = new TransactionTemplate(transactions);
    }

    /** JDBC URL of the PostgreSQL target this importer writes to; callers importing into their own target pin it. */
    public String targetUrl() { return imports.connectionUrl(); }

    /** An existing frozen bank is independent of later current-catalog upgrades. Never insert missing items here. */
    boolean verifyExistingManifest(OfficialQuestionBankManifest manifest, Owner owner, Mode mode) throws Exception {
        require(mode != null, "Explicit operation mode required");
        return Boolean.TRUE.equals(transactions.execute(status -> {
            try {
                require(owner.expectedJdbcUrl().equals(imports.connectionUrl()), "Unexpected PostgreSQL target");
                imports.limitTransaction();
                if (!preflightBank(manifest.questionBank(), owner)) return false;
                authorize(owner, mode);
                for (Item item : manifest.items()) {
                    require(preflightItem(manifest.questionBank().id(), item), "Existing bank is incomplete; explicit recovery required");
                }
                return true;
            } finally {
                status.setRollbackOnly();
            }
        }));
    }

    public Result importManifest(OfficialQuestionBankManifest manifest, Owner owner, Mode mode) throws Exception {
        require(mode != null, "Explicit operation mode required");
        return transactions.execute(status -> {
            require(owner.expectedJdbcUrl().equals(imports.connectionUrl()), "Unexpected PostgreSQL target");
            imports.limitTransaction();
            locks.lock("official-question-bank:" + manifest.questionBank().id());
            authorize(owner, mode);
            boolean bankExists = preflightBank(manifest.questionBank(), owner);
            List<Item> missing = new ArrayList<>();
            // Every DB identity/content check precedes every INSERT.
            for (Item item : manifest.items()) if (!preflightItem(manifest.questionBank().id(), item)) missing.add(item);
            if (!bankExists) {
                banks.insert(new QuestionBankEntity(manifest.questionBank().id(), manifest.questionBank().name(), owner.accountId()));
            }
            items.insertAll(missing.stream().map(item -> new ItemVersionEntity(item.itemVersionId(), item.itemId(), item.version(),
                    manifest.questionBank().id(), item.prompt(), canonical(item.responseSchema()), canonical(item.protectedKey()),
                    item.publicationState(), item.contentHash(), item.microSkillId(), item.microSkillName(), item.difficulty())).toList());
            return new Result(manifest.questionBank().id(), missing.size(), manifest.items().size() - missing.size());
        });
    }

    private void authorize(Owner owner, Mode mode) {
        require(owner.accountId() != null && owner.organizationId() != null, "Explicit real owner/tenant required");
        require(!imports.lockActiveCreator(owner.accountId(), owner.organizationId()).isEmpty(),
                "Active configured creator in active tenant required");
        if (mode == Mode.ADMINISTRATOR) {
            require(!imports.lockAdministratorRoles(owner.accountId()).isEmpty(), "Active System Administrator required");
        }
    }

    private boolean preflightBank(Bank bank, Owner owner) {
        var rows = imports.lockBank(bank.id());
        if (rows.isEmpty()) return false;
        var row = rows.getFirst();
        require(bank.name().equals(row[0]) && owner.accountId().equals(row[1]), "Bank identity/owner conflict");
        return true;
    }

    private boolean preflightItem(UUID bankId, Item item) {
        boolean found = false;
        for (Object[] row : imports.lockItems(item.itemVersionId(), item.itemId())) {
            require(bankId.equals(row[3]), "Item identity belongs to another bank");
            boolean sameId = item.itemVersionId().equals(row[0]);
            boolean sameVersion = item.itemId().equals(row[1]) && item.version() == ((Number) row[2]).intValue();
            if (!sameId && !sameVersion) continue; // Older/newer version preserved without modification.
            require(!found && sameId && sameVersion, "Item identity/version collision");
            require(item.prompt().equals(row[4])
                    && item.responseSchema().equals(tree((String) row[5]))
                    && item.protectedKey().equals(tree((String) row[6]))
                    && item.publicationState().equals(row[7]) && item.contentHash().equals(row[8])
                    && item.microSkillId().equals(row[9]) && item.microSkillName().equals(row[10])
                    && item.difficulty().equals(row[11]), "Existing item content/state conflict");
            found = true;
        }
        return found;
    }

    private static JsonNode tree(String json) {
        try { return JSON.readTree(json); }
        catch (JsonProcessingException invalid) { throw new IllegalStateException("Stored item JSON is unreadable", invalid); }
    }
}