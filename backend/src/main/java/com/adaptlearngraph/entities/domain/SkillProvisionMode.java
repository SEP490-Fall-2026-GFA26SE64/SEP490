package com.adaptlearngraph.entities.domain;

import java.util.*;

/** Optional catalog provision; absence means unconfigured, never an implied certificate route. */
public enum SkillProvisionMode {
    MODULE_ONLY, CERTIFICATE_ONLY;

    /** Reads the current common mode alongside explicit per-level authoring lists. */
    public static SkillProvisionMode resolve(String commonMode,List<String> modules,List<String> certificates,KnowledgeLevel level) {
        var moduleLevels=levels(modules);var certificateLevels=levels(certificates);
        if(moduleLevels.stream().anyMatch(certificateLevels::contains))
            throw new IllegalArgumentException("Module and certificate modes must be disjoint");
        var common=commonMode==null?null:valueOf(commonMode);
        boolean module=common==MODULE_ONLY || moduleLevels.contains(level);
        boolean certificate=common==CERTIFICATE_ONLY || certificateLevels.contains(level);
        if(module && certificate)throw new IllegalArgumentException("Conflicting skill provision modes");
        return module?MODULE_ONLY:certificate?CERTIFICATE_ONLY:null;
    }
    private static Set<KnowledgeLevel> levels(List<String> values) {
        Objects.requireNonNull(values);
        if(values.size()>100)throw new IllegalArgumentException("Too many knowledge levels");
        var result=EnumSet.noneOf(KnowledgeLevel.class);
        for(var value:values)if(!result.add(KnowledgeLevel.valueOf(value)))
            throw new IllegalArgumentException("Duplicate knowledge level");
        return result;
    }
}
