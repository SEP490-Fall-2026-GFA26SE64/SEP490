package com.adaptlearngraph.entities;

import java.time.Instant;
import java.time.ZoneOffset;
import org.neo4j.driver.Value;
import org.neo4j.driver.Values;
import org.springframework.data.neo4j.core.convert.Neo4jPersistentPropertyConverter;

/**
 * Catalog timestamps exist both as Neo4j {@code datetime} values and as ISO-8601 strings (seed/import data). Reads accept
 * either form; a missing or unreadable value maps to {@code null} so adapters keep their legacy defaults.
 */
public final class LenientGraphInstantConverter implements Neo4jPersistentPropertyConverter<Instant> {

    @Override
    public Value write(Instant source) {
        return source == null ? Values.NULL : Values.value(source.atOffset(ZoneOffset.UTC));
    }

    @Override
    public Instant read(Value source) {
        if (source == null || source.isNull()) return null;
        try {
            return source.asZonedDateTime().toInstant();
        } catch (RuntimeException notADateTime) {
            try {
                return Instant.parse(source.asString());
            } catch (RuntimeException notAnIsoString) {
                return null;
            }
        }
    }
}