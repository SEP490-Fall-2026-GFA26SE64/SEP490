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
                new CompletionResponse(p.skillId(),p.moduleId(),p.revision(),p.contentVersion(),p.completedAt(),p.knowledgeLevel(),p.skillVersion(),p.outcomeCodes(),p.skillName()));
    }
    public List<ModuleResponse> modules(String skill) {
        return learning.modules(skill).stream().map(m->new ModuleResponse(m.moduleId(),m.title(),m.contentVersion(),m.started(),m.completed(),m.unavailableReason(),m.knowledgeLevel()==null?null:m.knowledgeLevel().name(),m.skillVersion())).toList();
    }
    public SearchResponse search(String search,String skill,String level,int page) {
        var result=learning.search(search,skill,level,page);
        return new SearchResponse(result.items().stream().map(item->{var m=item.module();return new SearchItemResponse(item.skillId(),item.skillName(),new ModuleResponse(m.moduleId(),m.title(),m.contentVersion(),m.started(),m.completed(),m.unavailableReason(),m.knowledgeLevel()==null?null:m.knowledgeLevel().name(),m.skillVersion()));}).toList(),result.page(),result.pageSize(),result.totalItems());
    }
    public void start(String skill,String module) {learning.start(skill,module);}
}
