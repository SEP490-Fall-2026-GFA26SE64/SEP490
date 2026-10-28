package com.adaptlearngraph.identity.application.port.in;

import com.adaptlearngraph.identity.domain.RegistrationActor;
import com.adaptlearngraph.identity.domain.RegistrationFields;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface RegistrationUseCase {
    RegistrationActor register(RegistrationFields fields, String password, String address);
    RegistrationActor signIn(String email, String password, String address);
    View current(RegistrationActor actor);
    void resend(RegistrationActor actor, String address);
    RegistrationActor verifyEmail(RegistrationActor actor, String code, String address);
    Enrollment prepareEnrollment(RegistrationActor actor, String existingEncryptedSecret);
    Completion confirmEnrollment(RegistrationActor actor, String encryptedSecret, String code, String address);
    RegistrationActor verifyTotp(RegistrationActor actor, String code, String address);
    RegistrationActor recover(RegistrationActor actor, String recoveryCode, String address);

    record View(UUID registrationId, String stage, String email, RegistrationFields fields,
                String deliveryStatus, Instant resendAvailableAt, Instant emailVerifiedAt, Instant completedAt) {}
    record Enrollment(String encryptedSecret, String manualSecret, String email) {
        @Override public String toString() { return "Enrollment[redacted]"; }
    }
    record Completion(RegistrationActor actor, List<String> recoveryCodes) {
        public Completion { recoveryCodes = List.copyOf(recoveryCodes); }
        @Override public String toString() { return "Completion[redacted]"; }
    }
}
