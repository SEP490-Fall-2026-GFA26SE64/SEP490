package com.adaptlearngraph.services;

import com.adaptlearngraph.exception.TargetRoleSelectionException;
import com.adaptlearngraph.exception.TargetRoleSelectionException.Code;
import com.adaptlearngraph.services.TargetSelectionCommandProcessor.OperationOutcome;
import com.adaptlearngraph.dtos.ChooseTargetRoleCommand;
import com.adaptlearngraph.dtos.TargetRoleSelectionResult;
import com.adaptlearngraph.repository.SelectionTransactionPort;
import com.adaptlearngraph.repository.TargetRoleSelectionCatalogPort;
import com.adaptlearngraph.repository.TargetRoleSelectionCatalogPort.CatalogUnavailableException;
import com.adaptlearngraph.repository.TargetRoleSelectionCatalogPort.SelectableTargetRole;
import com.adaptlearngraph.repository.TargetSelectionActorPort;
import com.adaptlearngraph.repository.TargetSelectionActorPort.SelectionActor;
import com.adaptlearngraph.repository.TargetSelectionStorePort;
import com.adaptlearngraph.repository.TargetSelectionStorePort.StoredSelectionRequest;
import com.adaptlearngraph.entities.TargetRoleSelection;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Framework-independent use-case facade for current target-role selection. */
public final class TargetRoleSelectionService implements TargetRoleSelectionUseCase {
    private final TargetSelectionActorPort actors;
    private final TargetRoleSelectionCatalogPort catalog;
    private final TargetSelectionStorePort store;
    private final SelectionTransactionPort transactions;
    private final TargetSelectionCommandProcessor processor;

    public TargetRoleSelectionService(
            TargetSelectionActorPort actors,
            TargetRoleSelectionCatalogPort catalog,
            TargetSelectionStorePort store,
            SelectionTransactionPort transactions,
            TargetSelectionCommandProcessor processor) {
        this.actors = Objects.requireNonNull(actors, "actors must not be null");
        this.catalog = Objects.requireNonNull(catalog, "catalog must not be null");
        this.store = Objects.requireNonNull(store, "store must not be null");
        this.transactions = Objects.requireNonNull(transactions, "transactions must not be null");
        this.processor = Objects.requireNonNull(processor, "processor must not be null");
    }

    @Override
    public Optional<TargetRoleSelection> getCurrentSelection() {
        SelectionActor actor = requireActor();
        return store.findActiveSelection(actor.accountId());
    }

    @Override
    public TargetRoleSelectionResult chooseTargetRole(ChooseTargetRoleCommand command) {
        Objects.requireNonNull(command, "command must not be null");
        SelectionActor actor = requireActor();
        String requestHash = SelectionRequestHasher.hash(command);
        Optional<StoredSelectionRequest> existing =
                store.findRequest(actor.accountId(), command.idempotencyKey());
        if (existing.isPresent()) {
            return processor.replay(actor.accountId(), existing.orElseThrow(), requestHash).resultOrThrow();
        }

        SelectableTargetRole role = requireSelectableRole(actor, command.roleId());
        OperationOutcome outcome = transactions.required(
                () -> processor.apply(actor, role, command, requestHash));
        return outcome.resultOrThrow();
    }

    private SelectableTargetRole requireSelectableRole(SelectionActor actor, UUID roleId) {
        try {
            SelectableTargetRole role = catalog.findSelectableRole(actor.organizationId(), roleId)
                    .orElseThrow(() -> error(Code.ROLE_NOT_AVAILABLE));
            if (!role.snapshot().id().equals(roleId)) {
                throw error(Code.SELECTION_STATE_CONFLICT);
            }
            return role;
        } catch (CatalogUnavailableException unavailable) {
            throw new TargetRoleSelectionException(
                    Code.CATALOG_UNAVAILABLE, Code.CATALOG_UNAVAILABLE.defaultMessage(), unavailable);
        }
    }

    private SelectionActor requireActor() {
        SelectionActor actor = actors.currentActor()
                .orElseThrow(() -> error(Code.UNAUTHENTICATED));
        if (!actor.isActiveEmployee()) {
            throw error(Code.FORBIDDEN);
        }
        return actor;
    }

    private static TargetRoleSelectionException error(Code code) {
        return new TargetRoleSelectionException(code, code.defaultMessage());
    }
}
