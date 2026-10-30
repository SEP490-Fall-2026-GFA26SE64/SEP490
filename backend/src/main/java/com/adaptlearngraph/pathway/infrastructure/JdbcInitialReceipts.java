package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import java.util.*;
import org.springframework.jdbc.core.namedparam.*;

public final class JdbcInitialReceipts implements Receipts {
    private final NamedParameterJdbcTemplate jdbc;
    public JdbcInitialReceipts(NamedParameterJdbcTemplate jdbc) { this.jdbc=jdbc; }
    private MapSqlParameterSource key(Actor actor,String operation,String resource,String key) {
        return new MapSqlParameterSource("org",actor.organizationId()).addValue("actor",actor.accountId())
                .addValue("operation",operation).addValue("resource",resource).addValue("key",key);
    }
    @Override public Optional<Receipt> find(Actor actor,String operation,String resource,String key) {
        return jdbc.query("""
                SELECT http_status,body_hash,response FROM platform.initial_pathway_receipt
                WHERE organization_id=:org AND actor_id=:actor AND operation=:operation AND resource=:resource AND retry_key=:key
                """,key(actor,operation,resource,key),(rs,n)->new Receipt(rs.getInt(1),rs.getString(2),rs.getString(3))).stream().findFirst();
    }
    @Override public void save(Actor actor,String operation,String resource,String key,Receipt receipt) {
        InitialJdbc.requireTransaction();
        jdbc.update("""
                INSERT INTO platform.initial_pathway_receipt(organization_id,actor_id,operation,resource,retry_key,body_hash,http_status,response)
                VALUES(:org,:actor,:operation,:resource,:key,:hash,:status,CAST(:response AS jsonb))
                """,key(actor,operation,resource,key).addValue("hash",receipt.bodyHash()).addValue("status",receipt.status()).addValue("response",receipt.responseJson()));
    }
}
