package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.Neo4jCompetencyRepository;
import com.adaptlearngraph.repository.Neo4jLearningModuleRepository;
import com.adaptlearngraph.repository.Neo4jOccupationRepository;
import com.adaptlearngraph.repository.Neo4jTargetRoleCatalogAdapter;
import com.adaptlearngraph.repository.Neo4jTargetRoleRepository;
import com.adaptlearngraph.services.TargetRoleService;
import com.adaptlearngraph.services.CreateTargetRoleUseCase;
import com.adaptlearngraph.services.ManageTargetRoleUseCase;
import com.adaptlearngraph.dtos.TargetRoleFilter;
import com.adaptlearngraph.services.ViewTargetRolesUseCase;
import com.adaptlearngraph.repository.TargetRoleCatalogPort;
import com.adaptlearngraph.repository.TargetRoleRepository;
import com.adaptlearngraph.entities.TargetRole;
import com.adaptlearngraph.entities.TargetRoleId;
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
    public com.adaptlearngraph.repository.OccupationRepository occupationRepository(ObjectProvider<Driver> driverProvider) {
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jOccupationRepository(driver);
        }
        return new com.adaptlearngraph.repository.OccupationRepository() {
            @Override public java.util.List<com.adaptlearngraph.entities.Occupation> findAllOccupations(String organizationId) { return java.util.List.of(); }
            @Override public java.util.Optional<com.adaptlearngraph.entities.Occupation> findByIdOrCode(String organizationId, String idOrCode) { return java.util.Optional.empty(); }
            @Override public com.adaptlearngraph.entities.Occupation save(String organizationId, com.adaptlearngraph.entities.Occupation occupation) { return occupation; }
            @Override public void delete(String organizationId, String idOrCode) {}
        };
    }

    @Bean
    public com.adaptlearngraph.services.GetOccupationsUseCase getOccupationsUseCase(
            com.adaptlearngraph.repository.OccupationRepository occupationRepository) {
        return new com.adaptlearngraph.services.OccupationService(occupationRepository);
    }

    @Bean
    public com.adaptlearngraph.repository.CompetencyRepository competencyRepository(ObjectProvider<Driver> driverProvider) {
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jCompetencyRepository(driver);
        }
        return new com.adaptlearngraph.repository.CompetencyRepository() {
            @Override public java.util.List<com.adaptlearngraph.entities.CompetencyRecord> findAllCompetencies(String organizationId, String search) { return java.util.List.of(); }
            @Override public java.util.Optional<com.adaptlearngraph.entities.CompetencyRecord> findById(String organizationId, String id) { return java.util.Optional.empty(); }
            @Override public com.adaptlearngraph.entities.CompetencyRecord save(String organizationId, com.adaptlearngraph.entities.CompetencyRecord record, java.util.List<String> skillIds, String levelId) { return record; }
            @Override public void deleteById(String organizationId, String id) {}
        };
    }

    @Bean
    public com.adaptlearngraph.services.ManageCompetencyUseCase manageCompetencyUseCase(
            com.adaptlearngraph.repository.CompetencyRepository competencyRepository) {
        return new com.adaptlearngraph.services.CompetencyService(competencyRepository);
    }

    @Bean
    public com.adaptlearngraph.repository.LearningModuleRepository learningModuleRepository(ObjectProvider<Driver> driverProvider) {
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jLearningModuleRepository(driver);
        }
        return new com.adaptlearngraph.repository.LearningModuleRepository() {
            @Override public java.util.List<com.adaptlearngraph.entities.LearningModuleRecord> findAll(String organizationId) { return java.util.List.of(); }
            @Override public java.util.Optional<com.adaptlearngraph.entities.LearningModuleRecord> findById(String organizationId, String id) { return java.util.Optional.empty(); }
            @Override public com.adaptlearngraph.entities.LearningModuleRecord save(String organizationId, com.adaptlearngraph.entities.LearningModuleRecord module) { return module; }
            @Override public void delete(String organizationId, String id) {}
        };
    }

    @Bean
    public com.adaptlearngraph.services.ManageLearningModuleUseCase manageLearningModuleUseCase(
            com.adaptlearngraph.repository.LearningModuleRepository learningModuleRepository) {
        return new com.adaptlearngraph.services.LearningModuleService(learningModuleRepository);
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
