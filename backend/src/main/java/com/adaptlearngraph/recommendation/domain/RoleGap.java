package com.adaptlearngraph.recommendation.domain;

import java.math.BigDecimal;
import java.util.*;

/** Stored conservative mastery is consumed exactly once; confidence is explanation only. */
public final class RoleGap {
    public enum Need { LEARNING_REQUIRED, NO_LEARNING_REQUIRED }
    public enum EvidenceState { KNOWN, UNKNOWN }
    public record Requirement(String skillId, String name, BigDecimal requiredScore, boolean mandatory) {
        public Requirement { text(skillId); text(name); unit(requiredScore); }
    }
    public record Evidence(BigDecimal mastery, String confidence) {
        public Evidence { unit(mastery); text(confidence); }
    }
    public record Row(String skillId, String name, BigDecimal requiredScore, boolean mandatory,
                      EvidenceState evidenceState, BigDecimal mastery, String confidence, BigDecimal gap,
                      String unknownReason) {
        public boolean needsLearning() { return mandatory && (evidenceState == EvidenceState.UNKNOWN || gap.signum() > 0); }
    }
    public record Result(List<Row> skills, Need need) {
        public Result { skills = List.copyOf(skills); Objects.requireNonNull(need); }
    }
    public static Result calculate(List<Requirement> requirements, Map<String,Evidence> compatible,
                                   Map<String,String> unknownReasons) {
        Objects.requireNonNull(requirements); Objects.requireNonNull(compatible); Objects.requireNonNull(unknownReasons);
        if (requirements.stream().noneMatch(Requirement::mandatory)) throw new IllegalArgumentException("MANDATORY_REQUIREMENTS_MISSING");
        var rows = new ArrayList<Row>(); var ids = new HashSet<String>();
        for (var r : requirements.stream().sorted(Comparator.comparing(Requirement::skillId)).toList()) {
            if (!ids.add(r.skillId())) throw new IllegalArgumentException("DUPLICATE_REQUIREMENT");
            var e = compatible.get(r.skillId());
            if (e == null) {
                String reason = unknownReasons.get(r.skillId()); text(reason);
                rows.add(new Row(r.skillId(),r.name(),r.requiredScore(),r.mandatory(),EvidenceState.UNKNOWN,null,null,null,reason));
            } else {
                if (unknownReasons.containsKey(r.skillId())) throw new IllegalArgumentException("AMBIGUOUS_EVIDENCE");
                rows.add(new Row(r.skillId(),r.name(),r.requiredScore(),r.mandatory(),EvidenceState.KNOWN,
                        e.mastery(),e.confidence(),r.requiredScore().subtract(e.mastery()).max(BigDecimal.ZERO),null));
            }
        }
        return new Result(rows, rows.stream().anyMatch(Row::needsLearning) ? Need.LEARNING_REQUIRED : Need.NO_LEARNING_REQUIRED);
    }
    public static void text(String value) { if (value == null || value.isBlank()) throw new IllegalArgumentException("Missing identity/metadata"); }
    public static void unit(BigDecimal value) { if (value == null || value.signum() < 0 || value.compareTo(BigDecimal.ONE) > 0) throw new IllegalArgumentException("Invalid unit interval"); }
    private RoleGap() {}
}
