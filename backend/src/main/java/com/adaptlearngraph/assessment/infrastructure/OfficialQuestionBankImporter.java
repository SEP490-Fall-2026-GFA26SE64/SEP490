package com.adaptlearngraph.assessment.infrastructure;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import static com.adaptlearngraph.assessment.infrastructure.OfficialQuestionBankManifest.*;

/** DRAFT-only, insert-only, single-transaction import. Does not authorize runtime publication. */
public final class OfficialQuestionBankImporter {
    enum Mode { ADMINISTRATOR, LOCAL_SEED }
    public record Owner(UUID accountId, UUID organizationId, String expectedJdbcUrl) {}
    public record Result(UUID bankId, int createdItems, int existingItems) {}
    private final DataSource dataSource;

    public OfficialQuestionBankImporter(DataSource dataSource) { this.dataSource = dataSource; }

    /** An existing frozen bank is independent of later current-catalog upgrades. Never insert missing items here. */
    boolean verifyExistingManifest(OfficialQuestionBankManifest manifest, Owner owner, Mode mode) throws Exception {
        require(mode != null, "Explicit operation mode required");
        try (var connection = dataSource.getConnection()) {
            require(owner.expectedJdbcUrl().equals(connection.getMetaData().getURL()), "Unexpected PostgreSQL target");
            connection.setAutoCommit(false);
            try {
                try (var limits = connection.createStatement()) {
                    limits.execute("SET LOCAL lock_timeout = '10s'");
                    limits.execute("SET LOCAL statement_timeout = '60s'");
                }
                if (!preflightBank(connection, manifest.questionBank(), owner)) return false;
                authorize(connection, owner, mode);
                for (Item item : manifest.items()) {
                    require(preflightItem(connection, manifest.questionBank().id(), item), "Existing bank is incomplete; explicit recovery required");
                }
                return true;
            } finally {
                connection.rollback();
            }
        }
    }

    Result importManifest(OfficialQuestionBankManifest manifest, Owner owner, Mode mode) throws Exception {
        require(mode != null, "Explicit operation mode required");
        try (var connection = dataSource.getConnection()) {
            require(owner.expectedJdbcUrl().equals(connection.getMetaData().getURL()), "Unexpected PostgreSQL target");
            connection.setAutoCommit(false);
            try {
                try (var limits = connection.createStatement()) {
                    limits.execute("SET LOCAL lock_timeout = '10s'");
                    limits.execute("SET LOCAL statement_timeout = '60s'");
                }
                try (var lock = connection.prepareStatement("SELECT pg_advisory_xact_lock(hashtextextended(?,0))")) {
                    lock.setString(1, "official-question-bank:" + manifest.questionBank().id());
                    lock.execute();
                }
                authorize(connection, owner, mode);
                boolean bankExists = preflightBank(connection, manifest.questionBank(), owner);
                List<Item> missing = new ArrayList<>();
                // Every DB identity/content check precedes every INSERT.
                for (Item item : manifest.items()) if (!preflightItem(connection, manifest.questionBank().id(), item)) missing.add(item);
                if (!bankExists) {
                    try (var insert = connection.prepareStatement("""
                            INSERT INTO platform.question_bank(question_bank_id,name,created_by) VALUES (?,?,?)
                            """)) {
                        insert.setObject(1, manifest.questionBank().id()); insert.setString(2, manifest.questionBank().name());
                        insert.setObject(3, owner.accountId()); insert.executeUpdate();
                    }
                }
                for (Item item : missing) insertItem(connection, manifest.questionBank().id(), item);
                connection.commit();
                return new Result(manifest.questionBank().id(), missing.size(), manifest.items().size() - missing.size());
            } catch (Exception failure) {
                try { connection.rollback(); } catch (SQLException rollback) { failure.addSuppressed(rollback); }
                throw failure;
            }
        }
    }

    private static void authorize(Connection connection, Owner owner, Mode mode) throws SQLException {
        require(owner.accountId() != null && owner.organizationId() != null, "Explicit real owner/tenant required");
        try (var query = connection.prepareStatement("""
                SELECT actor.account_id FROM platform.account actor
                JOIN platform.organization tenant ON tenant.organization_id=actor.organization_id
                WHERE actor.account_id=? AND actor.organization_id=? AND actor.active AND tenant.status='ACTIVE'
                FOR SHARE OF actor,tenant
                """)) {
            query.setObject(1, owner.accountId()); query.setObject(2, owner.organizationId());
            try (var result = query.executeQuery()) { require(result.next(), "Active configured creator in active tenant required"); }
        }
        if (mode == Mode.ADMINISTRATOR) {
            try (var query = connection.prepareStatement("""
                    SELECT role_code FROM platform.account_role WHERE account_id=?
                      AND role_code IN ('ADMINISTRATOR','PLATFORM_ADMINISTRATOR') FOR SHARE
                    """)) {
                query.setObject(1, owner.accountId());
                try (var result = query.executeQuery()) { require(result.next(), "Active System Administrator required"); }
            }
        }
    }

    private static boolean preflightBank(Connection connection, Bank bank, Owner owner) throws SQLException {
        try (var query = connection.prepareStatement("""
                SELECT name,created_by FROM platform.question_bank WHERE question_bank_id=? FOR SHARE
                """)) {
            query.setObject(1, bank.id());
            try (var result = query.executeQuery()) {
                if (!result.next()) return false;
                require(bank.name().equals(result.getString(1)) && owner.accountId().equals(result.getObject(2, UUID.class)),
                        "Bank identity/owner conflict");
                return true;
            }
        }
    }

    private static boolean preflightItem(Connection connection, UUID bankId, Item item) throws Exception {
        try (var query = connection.prepareStatement("""
                SELECT item_version_id,item_id,version,question_bank_id,prompt,response_schema::text,protected_key::text,
                  publication_state,content_hash,micro_skill_id,micro_skill_name_snapshot,difficulty
                FROM platform.item_version WHERE item_version_id=? OR item_id=? FOR SHARE
                """)) {
            query.setObject(1, item.itemVersionId()); query.setObject(2, item.itemId());
            boolean found = false;
            try (var row = query.executeQuery()) {
                while (row.next()) {
                    require(bankId.equals(row.getObject(4, UUID.class)), "Item identity belongs to another bank");
                    boolean sameId = item.itemVersionId().equals(row.getObject(1, UUID.class));
                    boolean sameVersion = item.itemId().equals(row.getObject(2, UUID.class)) && item.version() == row.getInt(3);
                    if (!sameId && !sameVersion) continue; // Older/newer version preserved without modification.
                    require(!found && sameId && sameVersion, "Item identity/version collision");
                    require(item.prompt().equals(row.getString(5))
                            && item.responseSchema().equals(JSON.readTree(row.getString(6)))
                            && item.protectedKey().equals(JSON.readTree(row.getString(7)))
                            && item.publicationState().equals(row.getString(8)) && item.contentHash().equals(row.getString(9))
                            && item.microSkillId().equals(row.getString(10)) && item.microSkillName().equals(row.getString(11))
                            && item.difficulty().equals(row.getString(12)), "Existing item content/state conflict");
                    found = true;
                }
            }
            return found;
        }
    }

    private static void insertItem(Connection connection, UUID bankId, Item item) throws SQLException {
        try (var insert = connection.prepareStatement("""
                INSERT INTO platform.item_version(item_version_id,item_id,version,question_bank_id,prompt,response_schema,
                  protected_key,publication_state,content_hash,micro_skill_id,micro_skill_name_snapshot,difficulty)
                VALUES (?,?,?,?,?,?::jsonb,?::jsonb,?,?,?,?,?)
                """)) {
            insert.setObject(1, item.itemVersionId()); insert.setObject(2, item.itemId()); insert.setInt(3, item.version());
            insert.setObject(4, bankId); insert.setString(5, item.prompt()); insert.setString(6, canonical(item.responseSchema()));
            insert.setString(7, canonical(item.protectedKey())); insert.setString(8, item.publicationState());
            insert.setString(9, item.contentHash()); insert.setString(10, item.microSkillId());
            insert.setString(11, item.microSkillName()); insert.setString(12, item.difficulty()); insert.executeUpdate();
        }
    }
}
