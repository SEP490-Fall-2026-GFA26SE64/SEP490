package com.adaptlearngraph.identity.infrastructure;

import com.adaptlearngraph.identity.application.port.out.RegistrationSecrets;
import com.adaptlearngraph.identity.domain.RegistrationFailure;
import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;

public final class RegistrationCryptography implements RegistrationSecrets {
    private static final String ALPHANUMERIC = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private final SecureRandom random = new SecureRandom();
    private final Pbkdf2PasswordEncoder passwords = Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    private final TimeBasedOneTimePasswordGenerator totp = new TimeBasedOneTimePasswordGenerator();
    private final byte[] encryptionKey;
    private final byte[] digestKey;

    public RegistrationCryptography(String encryptionKey, String digestKey) {
        this.encryptionKey = decodeKey(encryptionKey);
        this.digestKey = decodeKey(digestKey);
    }

    @Override
    public void requireConfigured() {
        if (encryptionKey == null || digestKey == null) {
            throw new RegistrationFailure(RegistrationFailure.Code.SERVICE_UNAVAILABLE,
                    "Registration security keys are not configured. Contact the service operator.");
        }
    }

    @Override
    public String hashPassword(String password) {
        return "{pbkdf2@SpringSecurity_v5_8}" + passwords.encode(password);
    }

    @Override
    public boolean passwordMatches(String password, String hash) {
        String prefix = "{pbkdf2@SpringSecurity_v5_8}";
        return password != null && hash != null && hash.startsWith(prefix)
                && passwords.matches(password, hash.substring(prefix.length()));
    }

    @Override
    public String randomSlugSuffix() {
        StringBuilder suffix = new StringBuilder(6);
        for (int i = 0; i < 6; i++) suffix.append(ALPHANUMERIC.charAt(random.nextInt(ALPHANUMERIC.length())));
        return suffix.toString();
    }

    @Override
    public String emailCode() { return "%06d".formatted(random.nextInt(1_000_000)); }

    @Override
    public String recoveryCode() {
        byte[] bytes = new byte[16];
        random.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    @Override
    public String digest(String value) {
        requireConfigured();
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(digestKey, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Registration digest provider is unavailable", exception);
        }
    }

    @Override
    public boolean matchesDigest(String value, String expected) {
        if (expected == null || !expected.matches("[a-f0-9]{64}")) return false;
        return MessageDigest.isEqual(HexFormat.of().parseHex(digest(value)), HexFormat.of().parseHex(expected));
    }

    @Override
    public String encrypt(String value, String purpose) {
        requireConfigured();
        try {
            byte[] nonce = new byte[12];
            random.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(encryptionKey, "AES"), new GCMParameterSpec(128, nonce));
            cipher.updateAAD(purpose.getBytes(StandardCharsets.UTF_8));
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(nonce.length + encrypted.length)
                    .put(nonce).put(encrypted).array());
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Registration encryption provider is unavailable", exception);
        }
    }

    @Override
    public String decrypt(String value, String purpose) {
        requireConfigured();
        try {
            byte[] payload = Base64.getDecoder().decode(value);
            if (payload.length < 28) throw new IllegalArgumentException("Invalid encrypted payload");
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(encryptionKey, "AES"),
                    new GCMParameterSpec(128, payload, 0, 12));
            cipher.updateAAD(purpose.getBytes(StandardCharsets.UTF_8));
            return new String(cipher.doFinal(payload, 12, payload.length - 12), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new IllegalStateException("Registration secret could not be decrypted", exception);
        }
    }

    @Override
    public String newTotpSecret() {
        byte[] secret = new byte[20];
        random.nextBytes(secret);
        return Base64.getEncoder().encodeToString(secret);
    }

    @Override
    public String authenticatorSecret(String encodedSecret) {
        byte[] bytes = Base64.getDecoder().decode(encodedSecret);
        StringBuilder result = new StringBuilder();
        int buffer = 0;
        int bits = 0;
        for (byte value : bytes) {
            buffer = (buffer << 8) | (value & 255);
            bits += 8;
            while (bits >= 5) {
                result.append(BASE32.charAt((buffer >>> (bits - 5)) & 31));
                bits -= 5;
            }
        }
        if (bits > 0) result.append(BASE32.charAt((buffer << (5 - bits)) & 31));
        return result.toString();
    }

    @Override
    public long matchingTotpStep(String encodedSecret, String code, Instant now, long lastUsedStep) {
        if (code == null || !code.matches("[0-9]{6}")) return -1;
        var secret = new SecretKeySpec(Base64.getDecoder().decode(encodedSecret), "HmacSHA1");
        long step = Math.floorDiv(now.getEpochSecond(), 30);
        try {
            for (long candidate = step - 1; candidate <= step + 1; candidate++) {
                if (candidate < 0 || candidate <= lastUsedStep) continue;
                String expected = totp.generateOneTimePasswordString(secret, Instant.ofEpochSecond(candidate * 30));
                if (MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                        code.getBytes(StandardCharsets.US_ASCII))) return candidate;
            }
            return -1;
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("TOTP provider is unavailable", exception);
        }
    }

    private static byte[] decodeKey(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            byte[] key = Base64.getDecoder().decode(value);
            if (key.length != 32) throw new IllegalArgumentException("Key must contain 32 bytes");
            return key;
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Registration keys must be Base64-encoded 32-byte values", exception);
        }
    }
}
