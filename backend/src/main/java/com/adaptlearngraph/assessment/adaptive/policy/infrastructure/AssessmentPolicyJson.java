package com.adaptlearngraph.assessment.adaptive.policy.infrastructure;

import com.adaptlearngraph.assessment.adaptive.policy.application.AssessmentPolicyService;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.*;

public final class AssessmentPolicyJson implements AssessmentPolicyService.Encoding {
    private final ObjectMapper json;
    public AssessmentPolicyJson(ObjectMapper source) {
        json=source.copy().enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
                .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,DeserializationFeature.FAIL_ON_TRAILING_TOKENS,
                        DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES,DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES)
                .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
                .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }
    public String write(Object value){try{return json.writeValueAsString(value);}catch(Exception invalid){throw new IllegalStateException("Policy encoding unavailable");}}
    public <T>T read(String value,Class<T> type){try{return json.readValue(value,type);}catch(Exception invalid){throw new AssessmentPolicyService.Failure(400,"INVALID_REQUEST");}}
}
