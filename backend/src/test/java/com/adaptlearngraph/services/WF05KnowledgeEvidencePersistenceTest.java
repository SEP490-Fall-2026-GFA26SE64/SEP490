package com.adaptlearngraph.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.entities.domain.RuleAssessment.Purpose;
import com.adaptlearngraph.repository.*;
import java.util.*;
import org.junit.jupiter.api.*;

/** Real PostgreSQL compatibility/owner queries; catalog graph is the explicit context fixture. */
class WF05KnowledgeEvidencePersistenceTest {
    @BeforeAll static void start(){WF05PolicyPersistenceTest.start();}
    @AfterAll static void stop(){WF05PolicyPersistenceTest.stop();}
    @Test @org.junit.jupiter.api.Tag("bm04-wf05") @DisplayName("TC-WF05-F06 - Reuse only owned compatible official evidence")
    void exactEvidenceExemption() throws Exception {
        var f=new WF05PolicyPersistenceTest();f.setup();var k=new WF05KnowledgeContextTest();k.setup();
        k.actor=new RoleBaselineFlow.Actor(f.org,f.actor);when(k.selections.current(k.actor)).thenReturn(Optional.of(k.selected));
        var evidence=WF05PolicyPersistenceTest.db.bean(RuleAssessmentContextJpaRepository.class);var sql=WF05PolicyPersistenceTest.sql;
        k.contexts=new CurrentRoleKnowledgeCatalog(k.selections,org->List.of(k.selected.role()),k.graph,evidence,f.json,1000,id->{});
        UUID a=UUID.randomUUID(),oldB=UUID.randomUUID();
        sql.update("INSERT INTO platform.skill_knowledge_evidence(id,organization_id,learner_id,skill_id,knowledge_level,requirement_snapshot,source_kind,source_id,source_version,achieved_at) VALUES (?,?,?,'A','FOUNDATION','{\"skillVersion\":\"v1\"}'::jsonb,'CERTIFICATE',?,1,clock_timestamp())",a,f.org,f.actor,UUID.randomUUID());
        sql.update("INSERT INTO platform.skill_knowledge_evidence(id,organization_id,learner_id,skill_id,knowledge_level,requirement_snapshot,source_kind,source_id,source_version,achieved_at) VALUES (?,?,?,'B','FOUNDATION','{\"skillVersion\":\"old-v0\"}'::jsonb,'CERTIFICATE',?,1,clock_timestamp())",oldB,f.org,f.actor,UUID.randomUUID());
        sql.update("INSERT INTO platform.skill_knowledge_evidence(id,organization_id,learner_id,skill_id,knowledge_level,requirement_snapshot,source_kind,source_id,source_version,achieved_at) VALUES (?,?,?,'B','FOUNDATION','{\"skillVersion\":\"v1\"}'::jsonb,'CERTIFICATE',?,1,clock_timestamp())",UUID.randomUUID(),f.org,f.otherActor,UUID.randomUUID());
        sql.update("INSERT INTO platform.skill_knowledge_evidence(id,organization_id,learner_id,skill_id,knowledge_level,requirement_snapshot,source_kind,source_id,source_version,achieved_at) VALUES (?,?,?,'B','INTERMEDIATE','{\"skillVersion\":\"v1\"}'::jsonb,'CERTIFICATE',?,1,clock_timestamp())",UUID.randomUUID(),f.org,f.actor,UUID.randomUUID());
        String before=sql.queryForObject("SELECT json_agg(e ORDER BY id)::text FROM platform.skill_knowledge_evidence e WHERE organization_id=?",String.class,f.org);
        assertThat(k.contexts.resolve(k.actor,k.start(Purpose.BASELINE,null)).groups()).extracting(n->n.requirement().skillId()).containsExactly("B");
        assertThat(evidence.official(f.org,f.actor,"A","FOUNDATION","v1")).extracting(RuleAssessmentContextJpaRepository.Official::getId).containsExactly(a);
        assertThat(evidence.official(f.org,f.actor,"B","FOUNDATION","v1")).isEmpty();
        assertThat(sql.queryForObject("SELECT json_agg(e ORDER BY id)::text FROM platform.skill_knowledge_evidence e WHERE organization_id=?",String.class,f.org)).isEqualTo(before);
    }
}
