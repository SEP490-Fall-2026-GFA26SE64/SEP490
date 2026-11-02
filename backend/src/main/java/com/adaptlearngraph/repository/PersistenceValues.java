package com.adaptlearngraph.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;

/** Value conversions for native query rows and jsonb documents written through JPA entities. */
final class PersistenceValues {
    private static final ObjectMapper DOCUMENTS = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> DOCUMENT = new TypeReference<>() {};

    private PersistenceValues() {
    }

    static UUID uuid(Object value) {
        if (value == null) return null;
        if (value instanceof UUID uuid) return uuid;
        return UUID.fromString(value.toString());
    }

    /** Exact JSON tree of an already-serialized document; decimals stay BigDecimal so stored jsonb numbers are unchanged. */
    static Map<String, Object> document(String json) {
        try {
            return DOCUMENTS.readerFor(DOCUMENT).with(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readValue(json);
        } catch (JsonProcessingException invalid) {
            throw new IllegalStateException("Event payload could not be serialized", invalid);
        }
    }
}
