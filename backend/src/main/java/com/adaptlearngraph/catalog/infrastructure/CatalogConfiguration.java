package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.TargetRoleService;
import com.adaptlearngraph.catalog.application.port.in.CreateTargetRoleUseCase;
import com.adaptlearngraph.catalog.application.port.in.ManageTargetRoleUseCase;
import com.adaptlearngraph.catalog.application.port.in.TargetRoleFilter;
import com.adaptlearngraph.catalog.application.port.in.ViewTargetRolesUseCase;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleRepository;
import com.adaptlearngraph.catalog.domain.TargetRole;
import com.adaptlearngraph.catalog.domain.TargetRoleId;
import org.neo4j.driver.Driver;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import javax.sql.DataSource;

@Configuration(proxyBeanMethods = false)
public class CatalogConfiguration {

    @Bean
    public TargetRoleRepository targetRoleRepository(
            ObjectProvider<DataSource> dataSourceProvider,
            ObjectProvider<Driver> driverProvider) {
        DataSource dataSource = dataSourceProvider.getIfAvailable();
        if (dataSource != null) {
            return new PostgresTargetRoleRepository(dataSource);
        }
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jTargetRoleRepository(driver);
        }
        return new InMemoryFallbackTargetRoleRepository();
    }

    @Bean
    public TargetRoleService targetRoleService(TargetRoleRepository targetRoleRepository) {
        return new TargetRoleService(targetRoleRepository);
    }

    @Bean
    public CreateTargetRoleUseCase createTargetRoleUseCase(TargetRoleService targetRoleService) {
        return targetRoleService;
    }

    @Bean
    public ViewTargetRolesUseCase viewTargetRolesUseCase(TargetRoleService targetRoleService) {
        return targetRoleService;
    }

    @Bean
    public ManageTargetRoleUseCase manageTargetRoleUseCase(TargetRoleService targetRoleService) {
        return targetRoleService;
    }

    private static class InMemoryFallbackTargetRoleRepository implements TargetRoleRepository {
        private final Map<String, TargetRole> store = new ConcurrentHashMap<>();

        @Override
        public boolean existsByOrganizationIdAndCode(String organizationId, String code) {
            return store.values().stream()
                    .anyMatch(r -> r.getOrganizationId().equals(organizationId) && r.getCode().equalsIgnoreCase(code));
        }

        @Override
        public TargetRole save(TargetRole targetRole) {
            store.put(targetRole.getId().toString(), targetRole);
            return targetRole;
        }

        @Override
        public List<TargetRole> findByOrganizationId(String organizationId, TargetRoleFilter filter) {
            return store.values().stream()
                    .filter(r -> r.getOrganizationId().equals(organizationId))
                    .filter(r -> filter.track() == null || r.getTrack() == filter.track())
                    .filter(r -> filter.status() == null || r.getStatus() == filter.status())
                    .filter(r -> filter.assignedExpertId() == null || (r.getAssignedExpertId() != null && r.getAssignedExpertId().equals(filter.assignedExpertId())))
                    .filter(r -> filter.search() == null || r.getName().toLowerCase().contains(filter.search().toLowerCase()))
                    .toList();
        }

        @Override
        public Optional<TargetRole> findById(String organizationId, TargetRoleId id) {
            TargetRole role = store.get(id.toString());
            if (role != null && role.getOrganizationId().equals(organizationId)) {
                return Optional.of(role);
            }
            return Optional.empty();
        }

        @Override
        public Optional<TargetRole> findByCode(String organizationId, String code) {
            return store.values().stream()
                    .filter(r -> r.getOrganizationId().equals(organizationId) && r.getCode().equalsIgnoreCase(code))
                    .findFirst();
        }

        @Override
        public void deleteById(String organizationId, TargetRoleId id) {
            store.remove(id.toString());
        }
    }
}


