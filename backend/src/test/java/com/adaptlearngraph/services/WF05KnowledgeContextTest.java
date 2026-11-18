package com.adaptlearngraph.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.entities.domain.*;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.adaptlearngraph.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import org.junit.jupiter.api.*;
import org.neo4j.driver.Values;

/** Context contract with graph/evidence ports controlled; persistence/version queries are separately integrated. */
class WF05KnowledgeContextTest {
    RoleBaselineFlow.Actor actor=new RoleBaselineFlow.Actor(UUID.randomUUID(),UUID.randomUUID());
    RoleBaselineFlow.Selection selected;CurrentRoleSelectionStore selections;RuleAssessmentContextJpaRepository evidence;
    CurrentRoleKnowledgeCatalog contexts;Neo4jCypher graph;UUID step=UUID.randomUUID();
    @BeforeEach @SuppressWarnings("unchecked") void setup(){
        var skills=List.of(new RoleBaselineFlow.Skill("A","A","A",List.of("FOUNDATION"),true),new RoleBaselineFlow.Skill("B","B","B",List.of("FOUNDATION"),true));
        var role=new RoleBaselineFlow.Role("R","R","R","Scope","J","Job","v1","a".repeat(64),List.of(new RoleBaselineFlow.Level("L","L","L",1,"Context","All",skills,"3 months")),"role-v1");
        selected=new RoleBaselineFlow.Selection(UUID.randomUUID(),role,1,Instant.now(),true,"L");
        selections=mock(CurrentRoleSelectionStore.class);when(selections.current(actor)).thenReturn(Optional.of(selected));
        evidence=mock(RuleAssessmentContextJpaRepository.class);graph=mock(Neo4jCypher.class);var tx=mock(Neo4jCypher.Statements.class);
        when(graph.read(any())).thenAnswer(i->((Function<Neo4jCypher.Statements,Object>)i.getArgument(0)).apply(tx));
        when(tx.list(anyString(),anyMap())).thenAnswer(i->{String query=i.getArgument(0);Map<String,?> params=i.getArgument(1);
            if(query.contains("HAS_SKILL_PREREQUISITE")){
                if(!"A".equals(params.get("skill")))return List.of();var row=mock(org.neo4j.driver.Record.class);
                when(row.get("skill")).thenReturn(Values.value("B"));when(row.get("dependent")).thenReturn(Values.value("FOUNDATION"));when(row.get("prerequisite")).thenReturn(Values.value("FOUNDATION"));return List.of(row);}
            var row=mock(org.neo4j.driver.Record.class);when(row.get("skill")).thenReturn(Values.value(Map.of("name",params.get("skill"),"version","v1","moduleOnlyKnowledgeLevels",List.of("FOUNDATION"))));return List.of(row);});
        contexts=new CurrentRoleKnowledgeCatalog(selections,org->List.of(role),graph,evidence,new ObjectMapper().findAndRegisterModules(),1000,id->assertThat(id).isEqualTo(step));
    }
    RuleAssessmentAttemptService.Start start(Purpose p,String module){return new RuleAssessmentAttemptService.Start(p,selected.selectionId(),1,null,p==Purpose.BASELINE?null:step,module,module==null?null:1);}
    @Test @DisplayName("TC-WF05-F06 context: only current-version official proof exempts exact baseline requirement")
    void exemptions(){var official=mock(RuleAssessmentContextJpaRepository.Official.class);var id=UUID.randomUUID();when(official.getId()).thenReturn(id);
        when(evidence.official(actor.organizationId(),actor.learnerId(),"A","FOUNDATION","v1")).thenReturn(List.of(official));
        var command=start(Purpose.BASELINE,null);var result=contexts.resolve(actor,command);assertThat(result.groups()).extracting(n->n.requirement().skillId()).containsExactly("B");
        when(evidence.official(actor.organizationId(),actor.learnerId(),"A","FOUNDATION","v1")).thenReturn(List.of());
        when(evidence.official(actor.organizationId(),actor.learnerId(),"A","FOUNDATION","old-v0")).thenReturn(List.of(official));
        assertThat(contexts.resolve(actor,command).groups()).extracting(n->n.requirement().skillId()).containsExactly("A","B");}
    @Test @DisplayName("TC-WF05-F10 context: exact completed option required and equivalent modules have independent retry contexts")
    void exactOption(){var completed=mock(RuleAssessmentContextJpaRepository.CompletedOption.class);
        when(completed.getSkillId()).thenReturn("A");when(completed.getKnowledgeLevel()).thenReturn("FOUNDATION");when(completed.getRequirementSnapshot()).thenReturn("{\"skillVersion\":\"v1\"}");
        when(completed.getRequestId()).thenReturn(UUID.randomUUID());when(completed.getPathwayRevision()).thenReturn(1L);when(completed.getContentVersion()).thenReturn("content-v1");when(completed.getKind()).thenReturn("REQUIRED");
        when(evidence.completedOption(actor.organizationId(),actor.learnerId(),selected.selectionId(),1,step,"A1",1)).thenReturn(Optional.of(completed));
        var one=contexts.resolve(actor,start(Purpose.SKILL_ASSESSMENT,"A1"));assertThat(one.groups()).extracting(RuleAssessmentAttemptService.Need::role).containsExactly(GroupRole.MAIN,GroupRole.PREREQUISITE);
        assertThatThrownBy(()->contexts.resolve(actor,start(Purpose.SKILL_ASSESSMENT,"A2"))).hasMessageContaining("EXACT_LEARNING_COMPLETION_REQUIRED");
        when(evidence.completedOption(actor.organizationId(),actor.learnerId(),selected.selectionId(),1,step,"A2",1)).thenReturn(Optional.of(completed));
        assertThat(contexts.resolve(actor,start(Purpose.SKILL_ASSESSMENT,"A2")).contextKey()).isNotEqualTo(one.contextKey());
        verify(evidence,never()).official(any(),any(),anyString(),anyString(),anyString());}
}
