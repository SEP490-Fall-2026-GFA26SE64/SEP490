package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.ChooseTargetRoleCommand;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** Canonical SHA-256 hash used to detect idempotency-key payload conflicts. */
public final class SelectionRequestHasher {
    private SelectionRequestHasher() {}

    static String hash(ChooseTargetRoleCommand command) {
        String canonical = "SELECT_TARGET_ROLE\nroleId=" + command.roleId()
                + "\nexpectedCurrentSelectionId="
                + (command.expectedCurrentSelectionId() == null
                        ? "NONE"
                        : command.expectedCurrentSelectionId());
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(canonical.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException unavailableSha256) {
            throw new IllegalStateException("SHA-256 must be available", unavailableSha256);
        }
    }
}
