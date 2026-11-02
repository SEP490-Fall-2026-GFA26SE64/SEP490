package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.MacroCompetency;
import com.adaptlearngraph.entities.MacroCompetencyNode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

public class Neo4jMacroCompetencyRepository implements MacroCompetencyRepository {
    private static final Instant BASELINE = Instant.parse("2026-01-01T00:00:00Z");

    private final MacroCompetencyNodeRepository macros;
    private final TransactionTemplate reads;

    public Neo4jMacroCompetencyRepository(MacroCompetencyNodeRepository macros, PlatformTransactionManager transactions) {
        this.macros = Objects.requireNonNull(macros, "macros cannot be null");
        this.reads = Neo4jCatalogTransactions.readOnly(transactions);
    }

    @Override
    public List<MacroCompetency> findAll(String organizationId) {
        Objects.requireNonNull(organizationId, "organizationId");
        List<MacroCompetencyNode> nodes = reads.execute(status -> macros.findAllByOrganizationIdOrderByCodeAsc(organizationId));
        return nodes.stream().map(Neo4jMacroCompetencyRepository::toDomain).collect(Collectors.toCollection(ArrayList::new));
    }

    private static MacroCompetency toDomain(MacroCompetencyNode node) {
        String id = node.id() != null ? node.id() : UUID.randomUUID().toString();
        // The driver rendered a missing code as the literal "null"; keep that observable value.
        String code = node.code() != null ? node.code() : "null";
        String name = node.name() != null ? node.name() : code;
        String description = node.description() != null ? node.description() : "";
        String status = node.status() != null ? node.status() : "ACTIVE";
        Instant createdAt = node.createdAt() != null ? node.createdAt() : BASELINE;
        Instant updatedAt = node.updatedAt() != null ? node.updatedAt() : createdAt;
        return new MacroCompetency(id, code, name, description, status, createdAt, updatedAt);
    }
}