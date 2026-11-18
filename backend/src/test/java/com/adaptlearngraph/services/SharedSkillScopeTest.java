package com.adaptlearngraph.services;
import static org.junit.jupiter.api.Assertions.*;
import com.adaptlearngraph.entities.domain.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class SharedSkillScopeTest {
    final ObjectMapper json=new ObjectMapper();
    @Test void identityIsExactAndCanonicalAcrossLearningSources() {
        var a=new SkillAssessmentScope("skill",KnowledgeLevel.FOUNDATION,"v1");
        assertEquals(a.contextKey(),new SkillAssessmentScope("skill",KnowledgeLevel.FOUNDATION,"v1").contextKey());
        assertNotEquals(a.contextKey(),new SkillAssessmentScope("skill",KnowledgeLevel.ADVANCED,"v1").contextKey());
        assertNotEquals(a.contextKey(),new SkillAssessmentScope("skill",KnowledgeLevel.FOUNDATION,"v2").contextKey());
        assertNotEquals(new SkillAssessmentScope("a:b",KnowledgeLevel.FOUNDATION,"c").contextKey(),new SkillAssessmentScope("a",KnowledgeLevel.FOUNDATION,"b:c").contextKey());
    }
    @Test void extractsOnlyAnUnambiguousFrozenDefinition() throws Exception {
        var definitions=json.readTree("[{\"requirement\":{\"skillId\":\"skill\",\"knowledgeLevel\":\"FOUNDATION\"},\"skillVersion\":\"v1\"}]");
        assertEquals("v1",SkillAssessmentScope.fromDefinitions(definitions,"skill",KnowledgeLevel.FOUNDATION).skillVersion());
        assertThrows(IllegalArgumentException.class,()->SkillAssessmentScope.fromDefinitions(json.readTree("[]"),"skill",KnowledgeLevel.FOUNDATION));
        assertThrows(IllegalArgumentException.class,()->SkillAssessmentScope.fromDefinitions(json.readTree("["+definitions.get(0)+","+definitions.get(0)+"]"),"skill",KnowledgeLevel.FOUNDATION));
        assertThrows(IllegalArgumentException.class,()->new SkillAssessmentScope("skill",KnowledgeLevel.FOUNDATION,""));
    }
}
