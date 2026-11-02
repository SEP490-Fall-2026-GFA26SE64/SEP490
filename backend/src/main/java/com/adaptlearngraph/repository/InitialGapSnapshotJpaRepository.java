package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.InitialGapSnapshotEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

/** Frozen role-gap inputs (trigger initial_gap_snapshot_immutable); insert is the only write. */
public interface InitialGapSnapshotJpaRepository extends Repository<InitialGapSnapshotEntity, UUID>, InsertOnlyRepository<InitialGapSnapshotEntity> {
}
