package com.adaptlearngraph.config;

import com.adaptlearngraph.constants.LocalDemoIdentity;
import com.adaptlearngraph.repository.DevelopmentSeedJpaRepository;
import java.util.*;
import org.springframework.boot.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Explicit local fixture, not a password login, assignment row or approval. */
public final class LocalExpertProvisioning implements ApplicationRunner {
    private final DevelopmentSeedJpaRepository seeds;private final PlatformTransactionManager transactions;private final UUID expert;
    LocalExpertProvisioning(DevelopmentSeedJpaRepository seeds,PlatformTransactionManager transactions,UUID expert){
        this.seeds=seeds;this.transactions=transactions;this.expert=expert;
    }
    @Override public void run(ApplicationArguments arguments) {
        new TransactionTemplate(transactions).executeWithoutResult(status->{
            seeds.insertAccountIfAbsent(expert,LocalDemoIdentity.ORG,"local-pathway-demo-expert","local-pathway-demo-expert","DEMO_NO_PASSWORD_LOGIN");
            if(!seeds.fixtureAccountExists(expert,LocalDemoIdentity.ORG,"local-pathway-demo-expert","DEMO_NO_PASSWORD_LOGIN"))
                throw new IllegalStateException("Local Expert fixture identity drift");
            seeds.insertAccountRoleIfAbsent(expert,"DOMAIN_EXPERT");
        });
    }
}