package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.SkillLearningDto.*;
import java.util.List;

/** Wire boundary; the domain service is also callable by the assessment owner's backend. */
public final class SkillLearningApplicationService {
    private final SkillLearningService learning;
    public SkillLearningApplicationService(SkillLearningService learning) {this.learning=learning;}
    public EligibilityResponse eligibility(String skill) {
        var r=learning.eligibility(skill);var p=r.qualifyingCompletion();
        return new EligibilityResponse(r.skillId(),r.eligible(),r.reason(),p==null?null:
                new CompletionResponse(p.skillId(),p.moduleId(),p.revision(),p.contentVersion(),p.completedAt()));
    }
    public List<ModuleResponse> modules(String skill) {
        return learning.modules(skill).stream().map(m->new ModuleResponse(m.moduleId(),m.title(),m.contentVersion(),m.started(),m.completed())).toList();
    }
    public void start(String skill,String module) {learning.start(skill,module);}
}
