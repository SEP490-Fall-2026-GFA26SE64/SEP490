package com.adaptlearngraph.learning.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.learning.application.port.in.ChooseTargetRoleCommand;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SelectionRequestHasherTest {
    private static final UUID ROLE_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID SELECTION_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Test
    void hashesTheConfirmedCanonicalInitialPayload() {
        var command = new ChooseTargetRoleCommand(ROLE_ID, null, "request-1");

        assertThat(SelectionRequestHasher.hash(command))
                .isEqualTo("19de902431a11b2f1f6e522183408fba8ec5dd239060b62f36c9443b94cd5b97");
    }

    @Test
    void expectedSelectionChangesTheHashButIdempotencyKeyDoesNot() {
        var initialA = new ChooseTargetRoleCommand(ROLE_ID, null, "request-a");
        var initialB = new ChooseTargetRoleCommand(ROLE_ID, null, "request-b");
        var change = new ChooseTargetRoleCommand(ROLE_ID, SELECTION_ID, "request-a");

        assertThat(SelectionRequestHasher.hash(initialA)).isEqualTo(SelectionRequestHasher.hash(initialB));
        assertThat(SelectionRequestHasher.hash(change)).isNotEqualTo(SelectionRequestHasher.hash(initialA));
    }

    @Test
    void commandNormalizesKeyAndRejectsClientIdentitySentinels() {
        var command = new ChooseTargetRoleCommand(ROLE_ID, SELECTION_ID, "  request-1  ");

        assertThat(command.idempotencyKey()).isEqualTo("request-1");
        assertThatThrownBy(() -> new ChooseTargetRoleCommand(new UUID(0L, 0L), null, "request-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("roleId must not be the nil UUID");
        assertThatThrownBy(() -> new ChooseTargetRoleCommand(ROLE_ID, null, " "))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("idempotencyKey must not be blank");
    }
}
