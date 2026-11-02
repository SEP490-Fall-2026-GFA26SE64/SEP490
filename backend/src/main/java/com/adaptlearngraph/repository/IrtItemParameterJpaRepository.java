package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.IrtItemParameterEntity;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Sealed per-item IRT parameters: appended while the set is BUILDING (trigger-guarded), read back as a flat projection. */
public interface IrtItemParameterJpaRepository extends Repository<IrtItemParameterEntity, IrtItemParameterEntity.Key>,
        InsertOnlyRepository<IrtItemParameterEntity> {

    record Row(UUID itemVersionId, String microSkillId, BigDecimal discriminationA, BigDecimal difficultyB, BigDecimal guessingC,
            String fitDiagnostics) {}

    /** Parameters of a set restricted to items of the bank, in hash order (skill, then item id as text). */
    @Query("""
            select new com.adaptlearngraph.repository.IrtItemParameterJpaRepository$Row(
                p.itemVersionId,p.microSkillId,p.discriminationA,p.difficultyB,p.guessingC,p.fitDiagnostics)
            from IrtItemParameterEntity p join ItemVersionEntity i on i.itemVersionId=p.itemVersionId and i.microSkillId=p.microSkillId
            where p.parameterSetId=:set and i.questionBankId=:bank
            order by p.microSkillId,cast(p.itemVersionId as String)
            """)
    List<Row> inBank(@Param("set") UUID parameterSetId, @Param("bank") UUID bankId);
}
