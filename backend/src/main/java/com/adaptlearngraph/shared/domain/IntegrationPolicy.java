package com.adaptlearngraph.shared.domain;

public record IntegrationPolicy(boolean payosEnabled, boolean emailVerificationEnabled, boolean mfaEnabled) {
    public static final IntegrationPolicy ENABLED = new IntegrationPolicy(true, true, true);

    public void requireAllowedEnvironment(boolean development, boolean production) {
        if ((!payosEnabled || !emailVerificationEnabled || !mfaEnabled) && (!development || production)) {
            throw new IllegalStateException(
                    "Disabling PayOS, email verification or MFA is allowed only with an explicit local/dev profile and never prod/production.");
        }
    }
}
