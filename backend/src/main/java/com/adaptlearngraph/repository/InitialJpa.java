package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AuditEventEntity;
import com.adaptlearngraph.entities.OutboxEventEntity;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.adaptlearngraph.repository.InitialPathwayStore.*;
import com.adaptlearngraph.entities.domain.InitialPathwayState.*;
import java.util.*;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Shared projection mapping and atomic audit/outbox participant. No independent transaction manager. */
public final class InitialJpa {
    public final InitialPathwayRepositories data; public final Codec codec;
    InitialJpa(InitialPathwayRepositories data,Codec codec) { this.data=data;this.codec=codec; }
    public static void requireTransaction() { if(!TransactionSynchronizationManager.isActualTransactionActive())throw new IllegalStateException("Initial pathway write requires owner transaction"); }
    Request map(InitialPathwayRequestJpaRepository.Row row) {
        var scope=new Scope(row.organizationId(),row.learnerId());
        var frozen=codec.decode(row.frozenInput(),Frozen.class);
        if(!frozen.selection().id().equals(row.selectionId()) || frozen.selection().revision()!=row.selectionRevision()
                || !frozen.planningHash().equals(row.planningInputHash()))throw new Failure(503,"PATHWAY_INTEGRITY_FAILURE");
        return new Request(row.requestId(),scope,frozen.selection(),frozen,Generation.valueOf(row.generationStatus()),
                row.reasonCode(),Review.valueOf(row.reviewStatus()),row.currentRevision(),
                row.validationStatus()==null?null:Validation.valueOf(row.validationStatus()),row.contentHash());
    }
    /** Every row is mapped (integrity-checked) before the first is returned, as the former row-mapper query did. */
    Optional<Request> first(List<InitialPathwayRequestJpaRepository.Row> rows) {
        return rows.stream().map(this::map).toList().stream().findFirst();
    }
    public void event(Scope scope,UUID id,long revision,String action,UUID actor,Map<String,?> fields) {
        requireTransaction(); var payload=new TreeMap<String,Object>(fields);
        payload.put("payloadVersion",1);payload.put("organizationId",scope.organizationId());payload.put("learnerId",scope.learnerId());
        payload.put("pathwayId",id);payload.put("revision",revision);
        data.outbox().insert(new OutboxEventEntity(UUID.randomUUID(),action,id,revision,PersistenceValues.document(codec.encode(payload)),id,null));
        data.audit().insert(new AuditEventEntity(UUID.randomUUID(),actor,"initial-pathway",action,id,Long.toString(revision),null,"SUCCEEDED",id));
    }
}
