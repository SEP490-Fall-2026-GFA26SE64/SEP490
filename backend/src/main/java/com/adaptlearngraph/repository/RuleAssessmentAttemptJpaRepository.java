package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.RuleAssessmentAttemptEntity;
import com.adaptlearngraph.constants.TransactionManagers;
import java.time.Instant;
import java.util.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** All interactive reads/writes bind both tenant and learner. Native statements preserve clock/atomic revision semantics. */
public interface RuleAssessmentAttemptJpaRepository extends Repository<RuleAssessmentAttemptEntity,UUID>,InsertOnlyRepository<RuleAssessmentAttemptEntity> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from RuleAssessmentAttemptEntity a where a.organizationId=:org and a.learnerId=:learner and a.id=:id")
    Optional<RuleAssessmentAttemptEntity> lock(@Param("org") UUID org,@Param("learner") UUID learner,@Param("id") UUID id);
    @Query("select a from RuleAssessmentAttemptEntity a where a.organizationId=:org and a.learnerId=:learner and a.purpose=:purpose and a.contextKey=:context order by a.startedAt desc,a.id")
    List<RuleAssessmentAttemptEntity> contextHistory(@Param("org") UUID org,@Param("learner") UUID learner,
            @Param("purpose") String purpose,@Param("context") String context,Pageable page);
    @Query("select count(a) from RuleAssessmentAttemptEntity a where a.organizationId=:org and a.learnerId=:learner and a.purpose=:purpose and a.contextKey=:context")
    long contextCount(@Param("org") UUID org,@Param("learner") UUID learner,@Param("purpose") String purpose,@Param("context") String context);
    @Query("select a from RuleAssessmentAttemptEntity a where a.organizationId=:org and a.learnerId=:learner order by a.startedAt desc,a.id")
    List<RuleAssessmentAttemptEntity> history(@Param("org") UUID org,@Param("learner") UUID learner,Pageable page);
    @Query("select a from RuleAssessmentAttemptEntity a where a.organizationId=:org and a.learnerId=:learner and a.selectionId=:selection and a.selectionRevision=:revision and a.purpose='BASELINE' and a.state='FINALIZED' order by a.startedAt desc,a.id")
    List<RuleAssessmentAttemptEntity> baselineForSelection(@Param("org") UUID org,@Param("learner") UUID learner,@Param("selection") UUID selection,@Param("revision") long revision,Pageable page);
    @Query("select a from RuleAssessmentAttemptEntity a where a.organizationId=:org and a.learnerId=:learner and a.purpose='BASELINE' and a.state='IN_PROGRESS' order by a.startedAt desc,a.id")
    List<RuleAssessmentAttemptEntity> activeBaseline(@Param("org") UUID org,@Param("learner") UUID learner,Pageable page);
    @Query(value="SELECT clock_timestamp()",nativeQuery=true) Instant clock();
    @Modifying(flushAutomatically=true,clearAutomatically=true) @Transactional(TransactionManagers.JPA)
    @Query(value="""
            UPDATE platform.rule_assessment_attempt SET revision=revision+1
            WHERE organization_id=:org AND learner_id=:learner AND id=:id AND revision=:revision
                AND state='IN_PROGRESS' AND deadline_at>clock_timestamp()
            """,nativeQuery=true)
    int advance(@Param("org") UUID org,@Param("learner") UUID learner,@Param("id") UUID id,@Param("revision") long revision);
    @Modifying(flushAutomatically=true,clearAutomatically=true) @Transactional(TransactionManagers.JPA)
    @Query(value="""
            UPDATE platform.rule_assessment_attempt SET revision=revision+1,state='FINALIZED',finished_at=clock_timestamp(),
                finish_reason=CASE WHEN deadline_at<=clock_timestamp() THEN 'DEADLINE' ELSE 'SUBMITTED' END
            WHERE organization_id=:org AND learner_id=:learner AND id=:id AND revision=:revision AND state='IN_PROGRESS'
            """,nativeQuery=true)
    int finish(@Param("org") UUID org,@Param("learner") UUID learner,@Param("id") UUID id,@Param("revision") long revision);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.rule_assessment_group(attempt_id,group_id,organization_id,learner_id,skill_id,knowledge_level,
                outcome_codes,group_role,total_count,required_correct_count,mandatory_required,all_wrong_veto)
            VALUES (:attempt,:group,:org,:learner,:skill,:level,CAST(:outcomes AS jsonb),:role,:total,:correct,:mandatory,:veto)
            """,nativeQuery=true)
    int freezeGroup(@Param("attempt") UUID attempt,@Param("group") UUID group,@Param("org") UUID org,@Param("learner") UUID learner,
            @Param("skill") String skill,@Param("level") String level,@Param("outcomes") String outcomes,@Param("role") String role,
            @Param("total") int total,@Param("correct") int correct,@Param("mandatory") boolean mandatory,@Param("veto") boolean veto);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.rule_assessment_item(attempt_id,group_id,item_position,organization_id,item_version_id,frozen_item,mandatory)
            VALUES (:attempt,:group,:position,:org,:item,CAST(:snapshot AS jsonb),:mandatory)
            """,nativeQuery=true)
    int freezeItem(@Param("attempt") UUID attempt,@Param("group") UUID group,@Param("position") int position,
            @Param("org") UUID org,@Param("item") UUID item,@Param("snapshot") String snapshot,@Param("mandatory") boolean mandatory);
    @Query(value="""
            SELECT g.group_id AS groupId,g.skill_id AS skillId,g.knowledge_level AS knowledgeLevel,g.outcome_codes::text AS outcomeCodes,
                g.group_role AS role,g.total_count AS totalCount,g.required_correct_count AS requiredCorrectCount,
                g.mandatory_required AS mandatoryRequired,g.all_wrong_veto AS allWrongVeto,
                i.item_position AS position,i.item_version_id AS itemVersionId,i.frozen_item::text AS frozenItem,i.mandatory AS mandatory,
                d.prompt AS prompt,d.response_schema::text AS responseSchema,d.protected_key::text AS protectedKey,
                d.content_hash AS contentHash,m.mapping_hash AS mappingHash,m.outcome_code AS outcomeCode,
                ans.response::text AS answer
            FROM platform.rule_assessment_attempt a
            JOIN platform.rule_assessment_group g ON g.attempt_id=a.id AND g.organization_id=a.organization_id AND g.learner_id=a.learner_id
            JOIN platform.rule_assessment_item i ON i.attempt_id=g.attempt_id AND i.group_id=g.group_id AND i.organization_id=g.organization_id
            JOIN platform.assessment_item_knowledge_mapping m ON m.item_version_id=i.item_version_id AND m.organization_id=a.organization_id
            JOIN platform.item_version d ON d.item_version_id=m.item_version_id AND d.question_bank_id=m.question_bank_id
            LEFT JOIN platform.rule_assessment_answer ans ON ans.attempt_id=i.attempt_id AND ans.item_position=i.item_position
            WHERE a.organization_id=:org AND a.learner_id=:learner AND a.id=:id ORDER BY i.item_position
            """,nativeQuery=true)
    List<PaperRow> paper(@Param("org") UUID org,@Param("learner") UUID learner,@Param("id") UUID id);
    interface PaperRow {
        UUID getGroupId();String getSkillId();String getKnowledgeLevel();String getOutcomeCodes();String getRole();
        int getTotalCount();int getRequiredCorrectCount();boolean getMandatoryRequired();boolean getAllWrongVeto();
        int getPosition();UUID getItemVersionId();String getFrozenItem();boolean getMandatory();String getPrompt();
        String getResponseSchema();String getProtectedKey();String getContentHash();String getMappingHash();String getOutcomeCode();String getAnswer();
    }
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.rule_assessment_answer(attempt_id,item_position,response,is_correct,revision,accepted_at,source_command)
            SELECT :attempt,:position,CAST(:answer AS jsonb),:correct,1,clock_timestamp(),:command
            WHERE EXISTS (SELECT 1 FROM platform.rule_assessment_attempt a WHERE a.id=:attempt
                AND a.organization_id=:org AND a.learner_id=:learner AND a.state='IN_PROGRESS')
            ON CONFLICT(attempt_id,item_position) DO UPDATE SET response=EXCLUDED.response,is_correct=EXCLUDED.is_correct,
                revision=platform.rule_assessment_answer.revision+1,accepted_at=EXCLUDED.accepted_at,source_command=EXCLUDED.source_command
            """,nativeQuery=true)
    int answer(@Param("org") UUID org,@Param("learner") UUID learner,@Param("attempt") UUID attempt,@Param("position") int position,@Param("answer") String answer,
            @Param("correct") boolean correct,@Param("command") UUID command);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.rule_assessment_group_result(attempt_id,group_id,correct_count,total_count,mandatory_satisfied,passed,
                veto_triggered,reasons,finalized_at)
            SELECT :attempt,:group,:correct,:total,:mandatory,:passed,:veto,CAST(:reasons AS jsonb),clock_timestamp()
            WHERE EXISTS (SELECT 1 FROM platform.rule_assessment_attempt a WHERE a.id=:attempt
                AND a.organization_id=:org AND a.learner_id=:learner)
            """,nativeQuery=true)
    int result(@Param("org") UUID org,@Param("learner") UUID learner,@Param("attempt") UUID attempt,@Param("group") UUID group,@Param("correct") int correct,@Param("total") int total,
            @Param("mandatory") boolean mandatory,@Param("passed") boolean passed,@Param("veto") boolean veto,@Param("reasons") String reasons);

    interface Deadline { UUID getId();UUID getOrganizationId();UUID getLearnerId(); }
    /** Only the internal deadline worker scans this bounded cross-tenant queue; its subsequent writes rebind each owner. */
    @Query(value="""
            SELECT id AS id,organization_id AS organizationId,learner_id AS learnerId
            FROM platform.rule_assessment_attempt WHERE state='IN_PROGRESS' AND deadline_at<=clock_timestamp()
                AND coalesce(next_finalization_at,deadline_at)<=clock_timestamp()
            ORDER BY deadline_at,id LIMIT :maximum
            """,nativeQuery=true)
    List<Deadline> deadlines(@Param("maximum") int maximum);

    @Modifying(flushAutomatically=true,clearAutomatically=true) @Transactional(TransactionManagers.JPA)
    @Query(value="""
            UPDATE platform.rule_assessment_attempt SET revision=revision+1,finalization_failures=finalization_failures+1,
                next_finalization_at=clock_timestamp()+interval '30 seconds',finalization_error_code='FINALIZATION_RETRY_REQUIRED'
            WHERE organization_id=:org AND learner_id=:learner AND id=:id AND state='IN_PROGRESS'
                AND deadline_at<=clock_timestamp()
            """,nativeQuery=true)
    int deferFinalization(@Param("org") UUID org,@Param("learner") UUID learner,@Param("id") UUID id);

    @Query(value="""
            SELECT r.group_id AS groupId,r.correct_count AS correctCount,r.total_count AS totalCount,
                r.mandatory_satisfied AS mandatorySatisfied,r.passed AS passed,r.veto_triggered AS vetoTriggered,r.reasons::text AS reasons
            FROM platform.rule_assessment_group_result r JOIN platform.rule_assessment_attempt a ON a.id=r.attempt_id
            WHERE a.organization_id=:org AND a.learner_id=:learner AND a.id=:id
            """,nativeQuery=true)
    List<ResultRow> results(@Param("org") UUID org,@Param("learner") UUID learner,@Param("id") UUID id);
    interface ResultRow {
        UUID getGroupId();int getCorrectCount();int getTotalCount();boolean getMandatorySatisfied();
        boolean getPassed();boolean getVetoTriggered();String getReasons();
    }
}
