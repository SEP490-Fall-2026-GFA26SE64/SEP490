package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.services.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Explicit opt-in; isolated from unrelated workspace seed and background worker switches. */
@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-baseline & !local-baseline-demo & !prod")
@ConditionalOnProperty(name="riasec.enabled",havingValue="true")
public class RiasecConfiguration {
    private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(RiasecConfiguration.class);
    @Bean RiasecStore riasecStore(JdbcTemplate db,ObjectMapper json,
            @Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA) PlatformTransactionManager manager) {
        return new RiasecStore(db,new TransactionTemplate(manager),json);
    }
    @Bean RiasecCatalog riasecCatalog(org.springframework.data.neo4j.core.Neo4jClient graph) {return new RiasecCatalog(graph);}
    @Bean RiasecService riasecService(RoleBaselineFlow.Identity identity,RiasecStore store,RiasecCatalog catalog) {return new RiasecService(identity,store,catalog);}
    @Bean RiasecAiClient riasecAi(ObjectMapper json,Environment env) {
        return new RiasecAiClient(json,env.getProperty("riasec.ollama-url","http://riasec-ollama:11434"),env.getProperty("riasec.model","qwen3:4b-instruct-2507-q4_K_M"));
    }
    @Bean(destroyMethod="shutdown") ThreadPoolTaskScheduler riasecMaintenance() {
        var scheduler=new ThreadPoolTaskScheduler();scheduler.setPoolSize(1);scheduler.setThreadNamePrefix("riasec-retention-");return scheduler;
    }
    @Bean(destroyMethod="shutdown") ThreadPoolTaskScheduler riasecWorker() {
        var scheduler=new ThreadPoolTaskScheduler();scheduler.setPoolSize(1);scheduler.setThreadNamePrefix("riasec-ai-");return scheduler;
    }
    @Bean org.springframework.beans.factory.SmartInitializingSingleton riasecTasks(RiasecStore store,RiasecCatalog catalog,RiasecAiClient ai,
            @Qualifier("riasecMaintenance") ThreadPoolTaskScheduler maintenance,
            @Qualifier("riasecWorker") ThreadPoolTaskScheduler worker) {
        // Schedule only after Spring initializes both managed executors; shutdown owns the actual tasks.
        return ()->{
        log.info("RIASEC worker ready: model={}, pollingSeconds=2",ai.model());
        maintenance.scheduleWithFixedDelay(store::maintenance,Duration.ofSeconds(15));
        worker.scheduleWithFixedDelay(()->store.claimJob().ifPresent(job->{
            long started=System.nanoTime();
            log.info("RIASEC job claimed: resultId={}, runId={}",job.id(),job.runId());
            try {
                var candidates=catalog.candidates(job.owner().organizationId());
                log.info("RIASEC catalog ready: resultId={}, eligiblePositions={}",job.id(),candidates.size());
                if(candidates.isEmpty())throw new IllegalStateException("NO_ELIGIBLE_POSITIONS");
                store.recordModel(job,ai.model());
                log.info("RIASEC inference started: resultId={}, model={}",job.id(),ai.model());
                var recommendations=ai.recommend(job.scores(),candidates);
                store.complete(job,recommendations,ai.model());
                log.info("RIASEC inference finished: resultId={}, recommendations={}, elapsedMs={}",job.id(),recommendations.size(),(System.nanoTime()-started)/1_000_000);
            }
            catch(InterruptedException interrupted){Thread.currentThread().interrupt();store.fail(job,"AI_INTERRUPTED");}
            catch(java.net.http.HttpTimeoutException timeout){store.fail(job,"AI_TIMEOUT");}
            catch(IllegalArgumentException invalid){store.fail(job,java.util.Set.of("AI_INVALID_OUTPUT","AI_INVALID_POSITION","AI_UNGROUNDED_SCORES","AI_UNGROUNDED_EXPLANATION","CATALOG_TOO_LARGE").contains(String.valueOf(invalid.getMessage()))?invalid.getMessage():"AI_INVALID_OUTPUT");}
            catch(IllegalStateException unavailable){store.fail(job,java.util.Set.of("AI_UNAVAILABLE","AI_INCOMPLETE","NO_ELIGIBLE_POSITIONS","AI_MODEL_NOT_FOUND","AI_ENDPOINT_UNAVAILABLE").contains(String.valueOf(unavailable.getMessage()))?unavailable.getMessage():"AI_UNAVAILABLE");}
            catch(org.springframework.dao.DataAccessException unavailable){store.fail(job,"AI_CATALOG_UNAVAILABLE");}
            catch(Exception failure){store.fail(job,"AI_UNAVAILABLE");}
        }),Duration.ofSeconds(2));};
    }
}
