package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.DemoResetStore;
import com.adaptlearngraph.services.DemoResetService;
import io.minio.MinioClient;
import org.neo4j.driver.Driver;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration(proxyBeanMethods = false)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class DemoResetConfiguration {
    @Bean DemoResetService demoResetService(JdbcTemplate jdbc, ObjectProvider<Driver> neo4j,
            @Value("${learning.assets.endpoint:}") String endpoint,
            @Value("${learning.assets.access-key:unconfigured}") String access,
            @Value("${learning.assets.secret-key:unconfigured}") String secret,
            @Value("${learning.assets.bucket:learning-content}") String bucket) {
        MinioClient files = endpoint.isBlank() || "unconfigured".equals(access) ? null
                : MinioClient.builder().endpoint(endpoint).credentials(access, secret).build();
        return new DemoResetService(new DemoResetStore(jdbc, neo4j.getIfAvailable(), files, bucket),
                DemoOrganizationsSeedBootstrap.retainedOrganizations());
    }
}
