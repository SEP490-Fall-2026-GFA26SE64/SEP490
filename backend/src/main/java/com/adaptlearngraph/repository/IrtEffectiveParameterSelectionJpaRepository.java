package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.IrtEffectiveParameterSelectionEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Organization-scoped effective IRT parameter selection: first insert, then revision-fenced replacement only. */
public interface IrtEffectiveParameterSelectionJpaRepository
        extends Repository<IrtEffectiveParameterSelectionEntity, IrtEffectiveParameterSelectionEntity.Key>,
        InsertOnlyRepository<IrtEffectiveParameterSelectionEntity> {

    /** Columns: [selection_revision, parameter_set_id, parameter_hash, selected_by, selected_at]. */
    // FOR UPDATE OF only the selection row (the joined parameter set is not locked).
    @Query(value = """
            SELECT e.selection_revision,e.parameter_set_id,p.parameter_hash::text,e.selected_by,e.selected_at
            FROM platform.irt_effective_parameter_selection e
            JOIN platform.irt_parameter_set p USING(parameter_set_id,model_version_id)
            WHERE e.organization_id=:org AND e.question_bank_id=:bank AND e.model_version_id=:model FOR UPDATE OF e
            """, nativeQuery = true)
    List<Object[]> lockEffective(@Param("org") UUID organizationId, @Param("bank") UUID bankId, @Param("model") UUID modelVersionId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update IrtEffectiveParameterSelectionEntity e
            set e.parameterSetId=:candidate,e.selectionRevision=:revision,e.selectedBy=:actor,e.selectedAt=:time
            where e.organizationId=:org and e.questionBankId=:bank and e.modelVersionId=:model
              and e.selectionRevision=:expected and e.parameterSetId=:previous
            """)
    int advance(@Param("org") UUID organizationId, @Param("bank") UUID bankId, @Param("model") UUID modelVersionId,
            @Param("candidate") UUID parameterSetId, @Param("revision") long revision, @Param("actor") UUID actorId,
            @Param("time") Instant selectedAt, @Param("expected") long expectedRevision, @Param("previous") UUID previousParameterSetId);
}
