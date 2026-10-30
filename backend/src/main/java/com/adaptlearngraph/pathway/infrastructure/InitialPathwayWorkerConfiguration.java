package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import java.time.Duration;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration(proxyBeanMethods=false)
@Profile("((local-baseline-demo & !workspace-baseline) | (local & workspace-baseline & !local-baseline-demo)) & !prod")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(name={"pathway.initial.enabled","pathway.initial.worker.enabled"},havingValue="true")
@org.springframework.boot.autoconfigure.condition.ConditionalOnExpression("${assessment.baseline.workspace.enabled:false} or (${pathway.local-auth-bypass.enabled:false} and ${assessment.baseline.local-demo.enabled:false})")
public class InitialPathwayWorkerConfiguration {
    @Bean InitialPathwayDispatch initialDispatch(InitialPathwayStore store,Coordination coordination,Bindings bindings,InitialProblemBuilder builder,Environment env) {
        var settings=new InitialPathwayDispatch.Settings(InitialPathwayConfiguration.required(env,"worker.version"),InitialPathwayConfiguration.limits(env),
                duration(env,"lease-ms"),InitialPathwayConfiguration.integer(env,"worker.max-attempts"),duration(env,"minimum-backoff-ms"),duration(env,"maximum-backoff-ms"));
        return new InitialPathwayDispatch(store,coordination,bindings,builder,settings);
    }
    private Duration duration(Environment env,String suffix){return Duration.ofMillis(Long.parseLong(InitialPathwayConfiguration.required(env,"worker."+suffix)));}
    @Bean(name="initialPathwayScheduler") ThreadPoolTaskScheduler initialPathwayScheduler(){
        var scheduler=new ThreadPoolTaskScheduler();scheduler.setPoolSize(1);scheduler.setThreadNamePrefix("initial-pathway-");return scheduler;
    }
    @Bean(destroyMethod="close") AutoCloseable initialDispatchLoop(InitialPathwayDispatch dispatch,@Qualifier("initialPathwayScheduler")ThreadPoolTaskScheduler scheduler,Environment env){
        var interval=duration(env,"poll-interval-ms");if(interval.isNegative() || interval.isZero())throw new IllegalArgumentException("Positive poll interval required");
        var logger=org.slf4j.LoggerFactory.getLogger(InitialPathwayWorkerConfiguration.class);
        var future=scheduler.scheduleWithFixedDelay(()->{try{dispatch.runOne();}catch(RuntimeException unavailable){logger.warn("Initial pathway dispatch did not complete; persisted claim will expire for recovery");}},interval);
        return ()->future.cancel(false);
    }
}
