package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AssessmentRulePolicyEntity;
import com.adaptlearngraph.constants.TransactionManagers;
import java.util.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface AssessmentRulePolicyJpaRepository extends Repository<AssessmentRulePolicyEntity,UUID>,InsertOnlyRepository<AssessmentRulePolicyEntity> {
    @Query("select p from AssessmentRulePolicyEntity p where p.organizationId=:org and p.purpose=:purpose and p.id=:id")
    Optional<AssessmentRulePolicyEntity> owned(@Param("org") UUID org,@Param("purpose") String purpose,@Param("id") UUID id);
    @Query("select p from AssessmentRulePolicyEntity p where p.organizationId=:org and p.purpose=:purpose and p.scopeKey is null order by p.version desc")
    List<AssessmentRulePolicyEntity> versions(@Param("org") UUID org,@Param("purpose") String purpose,Pageable page);
    @Query("select coalesce(max(p.version),0) from AssessmentRulePolicyEntity p where p.organizationId=:org and p.purpose=:purpose and p.scopeKey is null")
    long maxVersion(@Param("org") UUID org,@Param("purpose") String purpose);
    @Query(value="""
            SELECT p.* FROM platform.assessment_rule_policy_version p
            JOIN platform.assessment_rule_policy_activation a ON a.organization_id=p.organization_id
                AND a.purpose=p.purpose AND a.current_policy_version_id=p.id
            WHERE a.organization_id=:org AND a.purpose=:purpose AND p.scope_key IS NULL FOR SHARE OF a
            """,nativeQuery=true)
    Optional<AssessmentRulePolicyEntity> active(@Param("org") UUID org,@Param("purpose") String purpose);
    @Query(value="SELECT revision FROM platform.assessment_rule_policy_activation WHERE organization_id=:org AND purpose=:purpose",nativeQuery=true)
    Optional<Long> activationRevision(@Param("org") UUID org,@Param("purpose") String purpose);
    /** Purpose-scoped optimistic pointer switch under the existing advisory transaction lock. */
    @Modifying(flushAutomatically=true) @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.assessment_rule_policy_activation(organization_id,purpose,current_policy_version_id,revision,changed_by,changed_at)
            SELECT :org,:purpose,:id,1,:actor,clock_timestamp() WHERE :expected=0 OR EXISTS (
                SELECT 1 FROM platform.assessment_rule_policy_activation
                WHERE organization_id=:org AND purpose=:purpose AND revision=:expected)
            ON CONFLICT(organization_id,purpose) DO UPDATE SET current_policy_version_id=:id,
                revision=platform.assessment_rule_policy_activation.revision+1,changed_by=:actor,changed_at=clock_timestamp()
            WHERE platform.assessment_rule_policy_activation.revision=:expected
            """,nativeQuery=true)
    int activate(@Param("org") UUID org,@Param("purpose") String purpose,@Param("id") UUID id,@Param("actor") UUID actor,@Param("expected") long expected);
    @Query(value="""
            SELECT body_hash AS hash,outcome::text AS outcome FROM platform.rule_assessment_command
            WHERE organization_id=:org AND actor_id=:actor AND operation=:operation AND resource=:resource AND retry_key=:key
            """,nativeQuery=true)
    Optional<Receipt> receipt(@Param("org") UUID org,@Param("actor") UUID actor,@Param("operation") String operation,
                            @Param("resource") String resource,@Param("key") UUID key);
    interface Receipt { String getHash();String getOutcome(); }
    @Modifying(flushAutomatically=true) @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.rule_assessment_command(id,organization_id,actor_id,operation,resource,retry_key,body_hash,outcome,created_at)
            VALUES (:id,:org,:actor,:operation,:resource,:key,:hash,CAST(:outcome AS jsonb),clock_timestamp())
            """,nativeQuery=true)
    int retain(@Param("id") UUID id,@Param("org") UUID org,@Param("actor") UUID actor,@Param("operation") String operation,
               @Param("resource") String resource,@Param("key") UUID key,@Param("hash") String hash,@Param("outcome") String outcome);
}
