package com.adaptlearngraph.learning.application;

import com.adaptlearngraph.learning.application.TargetRoleSelectionException.Code;
import com.adaptlearngraph.learning.application.TargetSelectionCommandProcessor.OperationOutcome;
import com.adaptlearngraph.learning.application.port.in.ChooseTargetRoleCommand;
import com.adaptlearngraph.learning.application.port.in.TargetRoleSelectionResult;
import com.adaptlearngraph.learning.application.port.in.TargetRoleSelectionUseCase;
import com.adaptlearngraph.learning.application.port.out.SelectionTransactionPort;
import com.adaptlearngraph.learning.application.port.out.TargetRoleSelectionCatalogPort;
import com.adaptlearngraph.learning.application.port.out.TargetRoleSelectionCatalogPort.CatalogUnavailableException;
import com.adaptlearngraph.learning.application.port.out.TargetRoleSelectionCatalogPort.SelectableTargetRole;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionActorPort;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionActorPort.SelectionActor;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort.StoredSelectionRequest;
import com.adaptlearngraph.learning.domain.TargetRoleSelection;
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
