package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.DemoCheckpointStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.minio.MinioClient;
import org.neo4j.driver.Driver;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration(proxyBeanMethods=false)
@Profile("local & !prod")
@ConditionalOnProperty(name="demo.checkpoint.enabled",havingValue="true")
public class DemoCheckpointConfiguration {
    @Bean com.adaptlearngraph.services.BrightpathDemoMembers brightpathDemoMembers(com.adaptlearngraph.repository.JpaMemberActivationAdapter.Repositories data,
            com.adaptlearngraph.repository.RegistrationSecrets secrets,com.adaptlearngraph.repository.AuditEventJpaRepository audit,JdbcTemplate jdbc,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA) org.springframework.transaction.PlatformTransactionManager manager,
            Environment env) {
        return new com.adaptlearngraph.services.BrightpathDemoMembers(data,secrets,audit,jdbc,new org.springframework.transaction.support.TransactionTemplate(manager),env.getRequiredProperty("demo.checkpoint.member-password"));
    }
    @Bean DemoCheckpointStore demoCheckpointStore(JdbcTemplate jdbc,Driver graph,ObjectMapper json,Environment env) {
        var files=MinioClient.builder().endpoint(env.getRequiredProperty("learning.assets.endpoint"))
                .credentials(env.getRequiredProperty("learning.assets.access-key"),env.getRequiredProperty("learning.assets.secret-key")).build();
        return new DemoCheckpointStore(jdbc,graph,files,env.getRequiredProperty("learning.assets.bucket"),json,
                env.getRequiredProperty("demo.checkpoint.directory"),env.getRequiredProperty("demo.checkpoint.isolation-id"),env.getRequiredProperty("demo.checkpoint.capture-token"));
    }
    @Bean org.springframework.boot.web.servlet.FilterRegistrationBean<org.springframework.web.filter.OncePerRequestFilter> demoCheckpointMaintenance(DemoCheckpointStore store) {
        var filter=new org.springframework.web.filter.OncePerRequestFilter(){
            @Override protected void doFilterInternal(jakarta.servlet.http.HttpServletRequest request,jakarta.servlet.http.HttpServletResponse response,jakarta.servlet.FilterChain chain) throws java.io.IOException,jakarta.servlet.ServletException {
                String path=request.getRequestURI();
                if(path.startsWith("/api/") && !path.equals("/api/v1/demo/reset") && !path.startsWith("/api/v1/demo/checkpoint/") && store.restoring()) {
                    response.setStatus(503);response.setContentType("application/json");response.getWriter().write("{\"code\":\"DEMO_CHECKPOINT_RESTORE_INCOMPLETE\"}");return;
                }
                chain.doFilter(request,response);
            }
        };
        var registration=new org.springframework.boot.web.servlet.FilterRegistrationBean<org.springframework.web.filter.OncePerRequestFilter>(filter);
        registration.setOrder(org.springframework.core.Ordered.HIGHEST_PRECEDENCE+5);return registration;
    }
}
