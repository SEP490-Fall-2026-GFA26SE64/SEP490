package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.PathwayRequirementSnapshotEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

public interface PathwayRequirementSnapshotJpaRepository extends Repository<PathwayRequirementSnapshotEntity,UUID>,InsertOnlyRepository<PathwayRequirementSnapshotEntity> {}
