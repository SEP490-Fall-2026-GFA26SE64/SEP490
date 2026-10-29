package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayStore.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

/** Explicit envelope dispatch. Format1 JSON/identity remains readable without conversion. */
final class InitialRevisionCodec implements Codec {
    private final ObjectMapper mapper;
    InitialRevisionCodec(ObjectMapper mapper){this.mapper=mapper;}
    @Override public String encode(Object value) {
        try {
            Object wire=value instanceof Revision revision && revision.plan().formatVersion()!=null?
                    Map.of("formatVersion",2,"revision",revision):value;
            return mapper.writeValueAsString(wire);
        }catch(Exception invalid){throw new IllegalStateException("Pathway serialization failed",invalid);}
    }
    @Override public <T>T decode(String value,Class<T> type) {
        try {
            if(type!=Revision.class)return mapper.readValue(value,type);
            var root=mapper.readTree(value);boolean envelope=root.has("formatVersion");
            if(envelope && (!root.path("formatVersion").isIntegralNumber() || root.path("formatVersion").asInt()!=2
                    || !root.path("revision").isObject() || root.size()!=2))throw new IllegalArgumentException("Unknown revision envelope");
            var revision=mapper.treeToValue(envelope?root.get("revision"):root,Revision.class);
            if(envelope!=Integer.valueOf(2).equals(revision.plan().formatVersion()))throw new IllegalArgumentException("Mixed revision formats");
            return type.cast(revision);
        }catch(Exception invalid){throw new IllegalStateException("Pathway record invalid",invalid);}
    }
}
