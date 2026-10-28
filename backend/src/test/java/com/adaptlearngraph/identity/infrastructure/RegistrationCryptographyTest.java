package com.adaptlearngraph.identity.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.identity.domain.RegistrationFailure;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class RegistrationCryptographyTest {
    private final RegistrationCryptography crypto = new RegistrationCryptography(
            Base64.getEncoder().encodeToString("e".repeat(32).getBytes(StandardCharsets.UTF_8)),
            Base64.getEncoder().encodeToString("h".repeat(32).getBytes(StandardCharsets.UTF_8)));

    @Test
    void encryptsWithUniqueNonceAndBindsPurpose() {
        String encrypted = crypto.encrypt("sensitive-value", "totp:account-a");
        assertThat(encrypted).doesNotContain("sensitive-value")
                .isNotEqualTo(crypto.encrypt("sensitive-value", "totp:account-a"));
        assertThat(crypto.decrypt(encrypted, "totp:account-a")).isEqualTo("sensitive-value");
        assertThatThrownBy(() -> crypto.decrypt(encrypted, "totp:account-b"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void verifiesRfc6238Sha1VectorsAtSixDigitsAndRejectsReplay() {
        String secret = Base64.getEncoder().encodeToString("12345678901234567890".getBytes(StandardCharsets.US_ASCII));
        assertThat(crypto.authenticatorSecret(secret)).isEqualTo("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
        assertThat(crypto.matchingTotpStep(secret, "287082", Instant.ofEpochSecond(59), -1)).isEqualTo(1);
        assertThat(crypto.matchingTotpStep(secret, "081804", Instant.ofEpochSecond(1111111109), -1))
                .isEqualTo(37037036);
        assertThat(crypto.matchingTotpStep(secret, "287082", Instant.ofEpochSecond(59), 1)).isEqualTo(-1);
        assertThat(crypto.matchingTotpStep(secret, "287082", Instant.ofEpochSecond(89), -1)).isEqualTo(1);
        assertThat(crypto.matchingTotpStep(secret, "287082", Instant.ofEpochSecond(90), -1)).isEqualTo(-1);
        assertThat(crypto.matchingTotpStep(secret, "287082", Instant.ofEpochSecond(29), -1)).isEqualTo(1);
        assertThat(crypto.matchingTotpStep(secret, "081804", Instant.ofEpochSecond(1111111049), -1)).isEqualTo(-1);
        assertThat(crypto.matchingTotpStep(secret, "12ab34", Instant.ofEpochSecond(59), -1)).isEqualTo(-1);
    }

    @Test
    void hashesPasswordsAndContextBoundCodes() {
        String hash = crypto.hashPassword("correct password");
        assertThat(hash).doesNotContain("correct password");
        assertThat(crypto.passwordMatches("correct password", hash)).isTrue();
        assertThat(crypto.passwordMatches("incorrect password", hash)).isFalse();
        String digest = crypto.digest("email:account-a:1:123456");
        assertThat(crypto.matchesDigest("email:account-a:1:123456", digest)).isTrue();
        assertThat(crypto.matchesDigest("email:account-b:1:123456", digest)).isFalse();
    }

    @Test
    void missingKeysFailClosed() {
        assertThatThrownBy(() -> new RegistrationCryptography("", "").requireConfigured())
                .isInstanceOf(RegistrationFailure.class);
        assertThatThrownBy(() -> new RegistrationCryptography("invalid", "invalid"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void generatesCorrectSecretAndCodeShapes() {
        assertThat(crypto.newTotpSecret()).satisfies(value ->
                assertThat(Base64.getDecoder().decode(value)).hasSize(20));
        assertThat(crypto.randomSlugSuffix()).matches("[a-z0-9]{6}");
        assertThat(crypto.emailCode()).matches("[0-9]{6}");
        assertThat(crypto.recoveryCode()).matches("[a-f0-9]{32}");
    }
}
