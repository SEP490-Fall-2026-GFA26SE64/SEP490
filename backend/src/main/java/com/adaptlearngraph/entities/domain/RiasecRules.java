package com.adaptlearngraph.entities.domain;

import java.util.*;

/** Five-response Short Form: ten 0..4 responses per interest, raw sum 0..40. */
public final class RiasecRules {
    private RiasecRules() {}
    public static final List<String> DIMENSIONS = List.of("R","I","A","S","E","C");
    public static final String INSTRUMENT = "alg-riasec-60-en-vi-v1";
    public static final String SCORING = "onet-short-form-0-4-sum-v1";
    public static final class Failure extends RuntimeException {
        public final int status; public final String code;
        public Failure(int status,String code) { super(code);this.status=status;this.code=code; }
    }
    public static void validateAnswers(Map<String,Integer> answers,boolean complete) {
        if(answers==null || answers.size()>60 || (complete && answers.size()!=60))throw new Failure(400,"INCOMPLETE_ANSWERS");
        for(var entry:answers.entrySet())
            if(entry.getKey()==null || !entry.getKey().matches("[RIASEC](0[1-9]|10)") || entry.getValue()==null || entry.getValue()<0 || entry.getValue()>4)
                throw new Failure(400,"INVALID_ANSWERS");
    }
    public static Map<String,Integer> score(Map<String,Integer> answers) {
        validateAnswers(answers,true);var result=new LinkedHashMap<String,Integer>();
        for(String d:DIMENSIONS)result.put(d,answers.entrySet().stream().filter(e->e.getKey().startsWith(d)).mapToInt(Map.Entry::getValue).sum());
        return Collections.unmodifiableMap(result);
    }
    public static void validateProfile(Map<String,Integer> scores) {
        if(scores==null || !scores.keySet().equals(new HashSet<>(DIMENSIONS)) || scores.values().stream().anyMatch(v->v==null || v<0 || v>40))
            throw new Failure(400,"INVALID_RIASEC_PROFILE");
    }
}
