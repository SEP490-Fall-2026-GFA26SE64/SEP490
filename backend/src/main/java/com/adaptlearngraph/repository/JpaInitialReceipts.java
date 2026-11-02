package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.InitialPathwayReceiptEntity;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import java.util.*;

public final class JpaInitialReceipts implements Receipts {
    private final InitialPathwayReceiptJpaRepository receipts;
    public JpaInitialReceipts(InitialPathwayReceiptJpaRepository receipts) { this.receipts=receipts; }
    @Override public Optional<Receipt> find(Actor actor,String operation,String resource,String key) {
        return receipts.find(actor.organizationId(),actor.accountId(),operation,resource,key).stream()
                .map(row->new Receipt(row.httpStatus(),row.bodyHash(),row.response())).findFirst();
    }
    @Override public void save(Actor actor,String operation,String resource,String key,Receipt receipt) {
        InitialJpa.requireTransaction();
        receipts.insert(new InitialPathwayReceiptEntity(actor.organizationId(),actor.accountId(),operation,resource,key,receipt.bodyHash(),
                receipt.status(),receipt.responseJson(),null));
    }
}
