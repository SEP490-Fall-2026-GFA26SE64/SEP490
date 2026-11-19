package com.adaptlearngraph.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.entities.domain.*;
import com.adaptlearngraph.entities.domain.AssessmentPolicyScope.*;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.adaptlearngraph.repository.AssessmentItemKnowledgeMappingJpaRepository;
import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class WF05SharedRoleBaselineTest {
    Policy policy(int seconds) {return new Policy(null,600,3,List.of(new GroupRule("skill",KnowledgeLevel.FOUNDATION,10,7,false,false)),new BaselineTiming(seconds));}
    @Test void exactCeilingAndActualDuration() {
        var policy=policy(30);var configured=policy.groups().getFirst();
        assertThat(policy.allocate(configured,5).requiredCorrectCount()).isEqualTo(4);
        assertThat(policy.allocate(configured,1).requiredCorrectCount()).isEqualTo(1);
        assertThat(policy.allocate(configured,2).requiredCorrectCount()).isEqualTo(2);
        assertThat(policy.allocate(configured,20)).isEqualTo(configured);
        assertThat(policy.durationSeconds(5)).isEqualTo(150);
        assertThatThrownBy(()->policy.allocate(configured,0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->policy(Integer.MAX_VALUE).durationSeconds(2)).isInstanceOf(ArithmeticException.class);
    }
    @Test void historicalJsonAndHashInputRemainIdenticalAndStrictSkillWritesStillDecode() throws Exception {
        var json=new ObjectMapper();
        String old="{\"timeLimitSeconds\":600,\"retakeWaitSeconds\":0,\"maxAttempts\":3,\"groups\":[{\"skillId\":\"skill\",\"knowledgeLevel\":\"FOUNDATION\",\"totalCount\":10,\"requiredCorrectCount\":7,\"mandatoryRequired\":false,\"allWrongVeto\":false}]}";
        var decoded=json.readerFor(Policy.class).with(DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES).readValue(old);
        assertThat(json.writeValueAsString(decoded)).isEqualTo(old);
        var shared=policy(30);assertThat(json.readValue(json.writeValueAsString(shared),Policy.class)).isEqualTo(shared);
        assertThat(((Policy)decoded).durationSeconds(1)).isEqualTo(600);
        assertThatThrownBy(()->json.readValue(old.replace("\"maxAttempts\":3","\"maxAttempts\":3.5"),Policy.class)).isInstanceOf(Exception.class);
    }
    @Test void draftSaveAllowsEmptyBankAndDoesNotSumMemberLevelsIntoAnEmployeePaper() {
        var bank=mock(AssessmentItemKnowledgeMappingJpaRepository.class);
        var groups=List.of(new GroupSpec(new ConfigurationRequirement("skill",KnowledgeLevel.FOUNDATION,List.of()),"Skill","v1",SkillProvisionMode.MODULE_ONLY,List.of()));
        var members=List.of(new MemberLevel("junior","Junior",1,groups,List.of()),new MemberLevel("senior","Senior",2,groups,List.of()));
        var scope=new Scope(AssessmentPolicyScope.roleKey("role"),Purpose.BASELINE,"role","Role","ALL_ROLE_LEVELS","All Role levels","ALL_ROLE_LEVELS",0,"a".repeat(64),groups,true,List.of(),null,members);
        var editor=new BaselinePolicyEditor(bank,10);
        var state=new BaselinePolicyEditor.Progress(3,true,List.of(new BaselinePolicyEditor.LevelRule(KnowledgeLevel.FOUNDATION,10,7)),null,600,3,30);
        assertThat(editor.validate(UUID.randomUUID(),scope,state)).isEqualTo(policy(30));
        assertThat(editor.missingBanks(UUID.randomUUID(),scope)).extracting(BaselinePolicyEditor.BankIssue::roleLevelId).containsExactly("junior","senior");
        assertThat(scope.key()).isNotEqualTo(AssessmentPolicyScope.key(Purpose.BASELINE,"role","junior"));
        assertThat(scope.key()).isNotEqualTo(AssessmentPolicyScope.key(Purpose.BASELINE,"role","senior"));
    }
}
