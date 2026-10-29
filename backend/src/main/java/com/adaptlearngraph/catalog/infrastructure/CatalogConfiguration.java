package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.TargetRoleService;
import com.adaptlearngraph.catalog.application.port.in.CreateTargetRoleUseCase;
import com.adaptlearngraph.catalog.application.port.in.ManageTargetRoleUseCase;
import com.adaptlearngraph.catalog.application.port.in.TargetRoleFilter;
import com.adaptlearngraph.catalog.application.port.in.ViewTargetRolesUseCase;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleCatalogPort;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleRepository;
import com.adaptlearngraph.catalog.domain.TargetRole;
import com.adaptlearngraph.catalog.domain.TargetRoleId;
import org.neo4j.driver.Driver;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;


@Configuration(proxyBeanMethods = false)
public class CatalogConfiguration {

    @Bean
    public TargetRoleRepository targetRoleRepository(ObjectProvider<Driver> driverProvider) {
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

    @Bean
    @Profile({"local", "prod"})
    public TargetRoleCatalogPort targetRoleCatalogPort(Driver driver) {
        return new Neo4jTargetRoleCatalogAdapter(driver);
    }

    @Bean
    public com.adaptlearngraph.catalog.application.port.out.OccupationRepository occupationRepository(ObjectProvider<Driver> driverProvider) {
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jOccupationRepository(driver);
        }
        return new com.adaptlearngraph.catalog.application.port.out.OccupationRepository() {
            @Override public java.util.List<com.adaptlearngraph.catalog.domain.Occupation> findAllOccupations() { return java.util.List.of(); }
            @Override public java.util.Optional<com.adaptlearngraph.catalog.domain.Occupation> findByIdOrCode(String idOrCode) { return java.util.Optional.empty(); }
            @Override public com.adaptlearngraph.catalog.domain.Occupation save(com.adaptlearngraph.catalog.domain.Occupation occupation) { return occupation; }
            @Override public void delete(String idOrCode) {}
        };
    }

    @Bean
    public com.adaptlearngraph.catalog.application.port.in.GetOccupationsUseCase getOccupationsUseCase(
            com.adaptlearngraph.catalog.application.port.out.OccupationRepository occupationRepository) {
        return new com.adaptlearngraph.catalog.application.OccupationService(occupationRepository);
    }

    @Bean
    public com.adaptlearngraph.catalog.application.port.out.CompetencyRepository competencyRepository(ObjectProvider<Driver> driverProvider) {
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jCompetencyRepository(driver);
        }
        return new com.adaptlearngraph.catalog.application.port.out.CompetencyRepository() {
            @Override public java.util.List<com.adaptlearngraph.catalog.domain.CompetencyRecord> findAllCompetencies(String search) { return java.util.List.of(); }
            @Override public java.util.Optional<com.adaptlearngraph.catalog.domain.CompetencyRecord> findById(String id) { return java.util.Optional.empty(); }
            @Override public com.adaptlearngraph.catalog.domain.CompetencyRecord save(com.adaptlearngraph.catalog.domain.CompetencyRecord record, java.util.List<String> skillIds, String levelId) { return record; }
            @Override public void deleteById(String id) {}
        };
    }

    @Bean
    public com.adaptlearngraph.catalog.application.port.in.ManageCompetencyUseCase manageCompetencyUseCase(
            com.adaptlearngraph.catalog.application.port.out.CompetencyRepository competencyRepository) {
        return new com.adaptlearngraph.catalog.application.CompetencyService(competencyRepository);
    }

    @Bean
    public com.adaptlearngraph.catalog.application.port.out.LearningModuleRepository learningModuleRepository(ObjectProvider<Driver> driverProvider) {
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jLearningModuleRepository(driver);
        }
        return new com.adaptlearngraph.catalog.application.port.out.LearningModuleRepository() {
            @Override public java.util.List<com.adaptlearngraph.catalog.domain.LearningModuleRecord> findAll(String organizationId) { return java.util.List.of(); }
            @Override public java.util.Optional<com.adaptlearngraph.catalog.domain.LearningModuleRecord> findById(String organizationId, String id) { return java.util.Optional.empty(); }
            @Override public com.adaptlearngraph.catalog.domain.LearningModuleRecord save(String organizationId, com.adaptlearngraph.catalog.domain.LearningModuleRecord module) { return module; }
            @Override public void delete(String organizationId, String id) {}
        };
    }

    @Bean
    public com.adaptlearngraph.catalog.application.port.in.ManageLearningModuleUseCase manageLearningModuleUseCase(
            com.adaptlearngraph.catalog.application.port.out.LearningModuleRepository learningModuleRepository) {
        return new com.adaptlearngraph.catalog.application.LearningModuleService(learningModuleRepository);
    }

    private static class InMemoryFallbackTargetRoleRepository implements TargetRoleRepository {
        private final Map<String, TargetRole> store = new ConcurrentHashMap<>();

        @Override
        public boolean existsByOrganizationIdAndCode(String organizationId, String code) {
            return store.values().stream()
                    .anyMatch(r -> r.getOrganizationId().equals(organizationId) && r.getCode().equalsIgnoreCase(code));
        }

        @Override
        public boolean existsByOrganizationIdAndCodeAndVersion(String organizationId, String code, String version) {
            return store.values().stream()
                    .anyMatch(r -> r.getOrganizationId().equals(organizationId)
                            && r.getCode().equalsIgnoreCase(code)
                            && r.getVersion().equalsIgnoreCase(version));
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
