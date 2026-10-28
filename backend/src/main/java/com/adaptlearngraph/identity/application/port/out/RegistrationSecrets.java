package com.adaptlearngraph.identity.application.port.out;

import java.time.Instant;

public interface RegistrationSecrets {
    void requireConfigured();
    String hashPassword(String password);
    boolean passwordMatches(String password, String hash);
    String randomSlugSuffix();
    String emailCode();
    String recoveryCode();
    String digest(String value);
    boolean matchesDigest(String value, String expected);
    String encrypt(String value, String purpose);
    String decrypt(String value, String purpose);
    String newTotpSecret();
    String authenticatorSecret(String encodedSecret);
    long matchingTotpStep(String encodedSecret, String code, Instant now, long lastUsedStep);
}
