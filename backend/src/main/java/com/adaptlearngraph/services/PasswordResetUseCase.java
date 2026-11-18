package com.adaptlearngraph.services;

import java.util.UUID;

public interface PasswordResetUseCase {
    void requestReset(String email, String clientAddress);
    void resetPassword(String token, String newPassword, String clientAddress);
    void changePasswordForSession(com.adaptlearngraph.entities.domain.WorkspacePrincipal principal, String currentPassword, String newPassword);
    void changePassword(UUID accountId, String currentPassword, String newPassword);
}

