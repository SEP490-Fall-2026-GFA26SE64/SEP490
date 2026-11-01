package com.adaptlearngraph.helper;

import com.adaptlearngraph.repository.CalibrationPorts.Encoding;
import com.adaptlearngraph.entities.Calibration.*;
import com.adaptlearngraph.entities.CalibrationPolicy;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.TreeSet;

/** Versioned, recursive canonical JSON; all parser failures are sanitized before leaving this boundary. */
public final class CalibrationJson implements Encoding, com.adaptlearngraph.repository.CalibrationPorts.Decoding {
    private final CalibrationPolicy selected;
    private final ObjectMapper mapper=com.fasterxml.jackson.databind.json.JsonMapper.builder().addModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule())
            .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS,DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
            .enable(DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES)
            .disable(com.fasterxml.jackson.databind.MapperFeature.ALLOW_COERCION_OF_SCALARS)
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT).build();
    public CalibrationJson(){this(CalibrationPolicy.syntheticV1());}
    public CalibrationJson(CalibrationPolicy selected) {
        this.selected=java.util.Objects.requireNonNull(selected);
        mapper.getFactory().setStreamReadConstraints(com.fasterxml.jackson.core.StreamReadConstraints.builder()
                .maxNestingDepth(16).maxStringLength(4000).maxNumberLength(64).build());
    }
    public void boundTokens(byte[] bytes) {
        try (var parser=mapper.getFactory().createParser(bytes)) {
            int tokens=0;
            while (parser.nextToken()!=null) if (++tokens>2_000_000) throw new Failure(Code.RESOURCE_LIMIT);
        } catch (java.io.IOException invalid) { throw new Failure(Code.INVALID_INPUT); }
    }
    public String write(Object value) {
        try { return sort(mapper.valueToTree(value)).toString(); }
        catch (IllegalArgumentException invalid) { throw new Failure(Code.INVALID_INPUT); }
    }
    public <T> T read(String value,Class<T> type) {
        try { return mapper.readValue(value,type); }
        catch (Exception invalid) { throw new Failure(Code.INVALID_INPUT); }
    }
    public JsonNode tree(String value) { return read(value,JsonNode.class); }
    @Override public String hash(Object value) { return bytesHash(write(value).getBytes(StandardCharsets.UTF_8)); }
    @Override public String algorithmHash() { return hash(selected); }
    @Override public CalibrationPolicy policyFor(String value){
        for(var policy:java.util.List.of(CalibrationPolicy.syntheticV1(),CalibrationPolicy.syntheticV2()))if(hash(policy).equals(value))return policy;
        throw new Failure(Code.INVALID_INPUT);
    }
    public static String bytesHash(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    private JsonNode sort(JsonNode node) {
        if (node.isObject()) {
            ObjectNode result=mapper.createObjectNode(); var keys=new TreeSet<String>(); node.fieldNames().forEachRemaining(keys::add);
            keys.forEach(key->result.set(key,sort(node.get(key)))); return result;
        }
        if (node.isArray()) { var result=mapper.createArrayNode(); node.forEach(n->result.add(sort(n))); return result; }
        return node;
    }
}
