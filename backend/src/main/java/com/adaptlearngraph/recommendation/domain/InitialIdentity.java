package com.adaptlearngraph.recommendation.domain;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;

/** Versioned, typed identity encoding; independent of JSON property order and display rounding. */
public final class InitialIdentity {
    private InitialIdentity() {}
    public static String hash(String purpose, Object value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(
                    encode(Arrays.asList("initial-canonical-v1", purpose, value)).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    public static String encode(Object value) {
        if (value == null) return "n;";
        if (value instanceof String s) return "s" + s.getBytes(StandardCharsets.UTF_8).length + ":" + s + ";";
        if (value instanceof UUID || value instanceof Instant || value instanceof Enum<?>) return encode(value.toString());
        if (value instanceof BigDecimal d) return "d" + d.stripTrailingZeros().toPlainString() + ";";
        if (value instanceof Integer || value instanceof Long) return encode(new BigDecimal(value.toString()));
        if (value instanceof Boolean b) return b ? "b1;" : "b0;";
        if (value instanceof Map<?, ?> map) {
            var sorted = new TreeMap<String, Object>();
            map.forEach((k,v) -> { if (!(k instanceof String s)) throw new IllegalArgumentException("String keys required"); sorted.put(s,v); });
            var result = new StringBuilder("m" + map.size() + ":{");
            sorted.forEach((k,v) -> result.append(encode(k)).append(encode(v)));
            return result.append('}').toString();
        }
        if (value instanceof List<?> list) {
            var result = new StringBuilder("l" + list.size() + ":[");
            list.forEach(v -> result.append(encode(v)));
            return result.append(']').toString();
        }
        throw new IllegalArgumentException("Unsupported identity value: " + value.getClass().getSimpleName());
    }
}
