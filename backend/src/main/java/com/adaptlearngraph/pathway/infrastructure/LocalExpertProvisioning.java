package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.assessment.adaptive.demo.LocalDemoIdentity;
import java.util.*;
import javax.sql.DataSource;
import org.springframework.boot.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Explicit local fixture, not a password login, assignment row or approval. */
final class LocalExpertProvisioning implements ApplicationRunner {
    private final DataSource source;private final UUID expert;
    LocalExpertProvisioning(DataSource source,UUID expert){this.source=source;this.expert=expert;}
    @Override public void run(ApplicationArguments arguments) {
        var jdbc=new NamedParameterJdbcTemplate(source);
        var parameters=Map.of("org",LocalDemoIdentity.ORG,"expert",expert);
        new TransactionTemplate(new JdbcTransactionManager(source)).executeWithoutResult(status->{
            jdbc.update("""
                    INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash)
                    VALUES(:expert,:org,'local-pathway-demo-expert','local-pathway-demo-expert','DEMO_NO_PASSWORD_LOGIN')
                    ON CONFLICT(account_id) DO NOTHING
                    """,parameters);
            if(!Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM platform.account WHERE account_id=:expert AND organization_id=:org
                      AND active AND identifier='local-pathway-demo-expert' AND password_hash='DEMO_NO_PASSWORD_LOGIN')
                    """,parameters,Boolean.class)))throw new IllegalStateException("Local Expert fixture identity drift");
            jdbc.update("INSERT INTO platform.account_role(account_id,role_code) VALUES(:expert,'DOMAIN_EXPERT') ON CONFLICT DO NOTHING",parameters);
        });
    }
}
