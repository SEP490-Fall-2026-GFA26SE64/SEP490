package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.Neo4jCompetencyRepository;
import com.adaptlearngraph.repository.LearningModuleNodeRepository;
import com.adaptlearngraph.repository.Neo4jLearningModuleRepository;
import com.adaptlearngraph.repository.Neo4jJobPositionRepository;
import com.adaptlearngraph.repository.Neo4jTargetRoleCatalogAdapter;
import com.adaptlearngraph.repository.Neo4jTargetRoleRepository;
import com.adaptlearngraph.helper.CompetencyMappings;
import com.adaptlearngraph.helper.LearningModuleMappings;
import com.adaptlearngraph.helper.ModelMapperRegistrar;
import com.adaptlearngraph.helper.JobPositionMappings;
import com.adaptlearngraph.helper.DepartmentMappings;
import com.adaptlearngraph.services.JobPositionApplicationService;
import com.adaptlearngraph.services.DepartmentApplicationService;
import com.adaptlearngraph.services.JobPositionService;
import com.adaptlearngraph.services.DepartmentService;
import com.adaptlearngraph.services.GetJobPositionsUseCase;
import com.adaptlearngraph.services.GetDepartmentsUseCase;
import com.adaptlearngraph.repository.JobPositionRepository;
import com.adaptlearngraph.repository.DepartmentRepository;
import com.adaptlearngraph.repository.JobPositionNodeRepository;
import com.adaptlearngraph.repository.DepartmentNodeRepository;
import com.adaptlearngraph.repository.Neo4jJobPositionRepository;
import com.adaptlearngraph.repository.Neo4jDepartmentRepository;
import com.adaptlearngraph.helper.TargetRoleMappings;
import com.adaptlearngraph.services.CompetencyApplicationService;
import com.adaptlearngraph.services.LearningModuleApplicationService;
import com.adaptlearngraph.services.JobPositionApplicationService;
import com.adaptlearngraph.services.OrganizationTargetRoleApplicationService;
import com.adaptlearngraph.services.TargetRoleService;
import org.modelmapper.ModelMapper;
import org.springframework.context.annotation.Import;
import com.adaptlearngraph.services.CreateTargetRoleUseCase;
import com.adaptlearngraph.services.ManageTargetRoleUseCase;
import com.adaptlearngraph.dtos.TargetRoleFilter;
import com.adaptlearngraph.services.ViewTargetRolesUseCase;
import com.adaptlearngraph.repository.TargetRoleCatalogPort;
import com.adaptlearngraph.repository.TargetRoleRepository;
import com.adaptlearngraph.entities.domain.TargetRole;
import com.adaptlearngraph.entities.domain.TargetRoleId;
import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.repository.CompetencyNodeRepository;
import com.adaptlearngraph.repository.JobPositionNodeRepository;
import com.adaptlearngraph.repository.TargetRoleNodeRepository;
import org.neo4j.driver.Driver;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.data.neo4j.core.mapping.Neo4jMappingContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;


@Configuration(proxyBeanMethods = false)
@Import(ModelMapperConfiguration.class)
public class CatalogConfiguration {

    @Bean
    public ModelMapperRegistrar targetRoleMappings() {
        return new TargetRoleMappings();
    }

    @Bean
    public ModelMapperRegistrar jobPositionMappings() {
        return new JobPositionMappings();
    }

    @Bean
    public ModelMapperRegistrar departmentMappings() {
        return new DepartmentMappings();
    }

    @Bean
    public ModelMapperRegistrar competencyMappings() {
        return new CompetencyMappings();
    }

    @Bean
    public ModelMapperRegistrar learningModuleMappings() {
        return new LearningModuleMappings();
    }

    @Bean
    public OrganizationTargetRoleApplicationService organizationTargetRoleApplicationService(
            CreateTargetRoleUseCase createTargetRoleUseCase, ViewTargetRolesUseCase viewTargetRolesUseCase,
            ManageTargetRoleUseCase manageTargetRoleUseCase, ModelMapper modelMapper) {
        return new OrganizationTargetRoleApplicationService(createTargetRoleUseCase, viewTargetRolesUseCase,
                manageTargetRoleUseCase, modelMapper);
    }

    @Bean
    public JobPositionApplicationService jobPositionApplicationService(
            GetJobPositionsUseCase getJobPositionsUseCase, ModelMapper modelMapper) {
        return new JobPositionApplicationService(getJobPositionsUseCase, modelMapper);
    }

    @Bean
    public DepartmentApplicationService departmentApplicationService(
            GetDepartmentsUseCase getDepartmentsUseCase, ModelMapper modelMapper) {
        return new DepartmentApplicationService(getDepartmentsUseCase, modelMapper);
    }

    @Bean
    public CompetencyApplicationService competencyApplicationService(
            com.adaptlearngraph.services.ManageCompetencyUseCase manageCompetencyUseCase, ModelMapper modelMapper) {
        return new CompetencyApplicationService(manageCompetencyUseCase, modelMapper);
    }

    @Bean
    public LearningModuleApplicationService learningModuleApplicationService(
            com.adaptlearngraph.services.ManageLearningModuleUseCase manageLearningModuleUseCase, ModelMapper modelMapper) {
        return new LearningModuleApplicationService(manageLearningModuleUseCase, modelMapper);
    }

    @Bean
    public TargetRoleRepository targetRoleRepository(ObjectProvider<Driver> driverProvider,
            ObjectProvider<TargetRoleNodeRepository> roles, ObjectProvider<Neo4jClient> client,
            ObjectProvider<Neo4jMappingContext> mappingContext,
            @Qualifier(TransactionManagers.NEO4J) ObjectProvider<PlatformTransactionManager> transactions) {
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jTargetRoleRepository(roles.getObject(), client.getObject(), mappingContext.getObject(),
                    transactions.getObject());
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
    public TargetRoleCatalogPort targetRoleCatalogPort(Neo4jClient client,
            @Qualifier(TransactionManagers.NEO4J) PlatformTransactionManager transactions) {
        return new Neo4jTargetRoleCatalogAdapter(client, transactions);
    }

    @Bean
    public com.adaptlearngraph.repository.JobPositionRepository jobPositionRepository(ObjectProvider<Driver> driverProvider,
            ObjectProvider<JobPositionNodeRepository> jobPositions, ObjectProvider<Neo4jClient> client,
            @Qualifier(TransactionManagers.NEO4J) ObjectProvider<PlatformTransactionManager> transactions) {
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jJobPositionRepository(jobPositions.getObject(), client.getObject(), transactions.getObject());
        }
        return new com.adaptlearngraph.repository.JobPositionRepository() {
            @Override public java.util.List<com.adaptlearngraph.entities.domain.JobPosition> findAllJobPositions(String organizationId) { return java.util.List.of(); }
            @Override public java.util.Optional<com.adaptlearngraph.entities.domain.JobPosition> findByIdOrCode(String organizationId, String idOrCode) { return java.util.Optional.empty(); }
            @Override public com.adaptlearngraph.entities.domain.JobPosition save(String organizationId, com.adaptlearngraph.entities.domain.JobPosition jobPosition) { return jobPosition; }
            @Override public void delete(String organizationId, String idOrCode) {}
        };
    }





    @Bean
    public GetJobPositionsUseCase getJobPositionsUseCase(JobPositionRepository jobPositionRepository) {
        return new JobPositionService(jobPositionRepository);
    }

    @Bean
    public com.adaptlearngraph.repository.DepartmentRepository departmentRepository(ObjectProvider<Driver> driverProvider,
            ObjectProvider<DepartmentNodeRepository> departments, ObjectProvider<Neo4jClient> client,
            @Qualifier(TransactionManagers.NEO4J) ObjectProvider<PlatformTransactionManager> transactions) {
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jDepartmentRepository(departments.getObject(), client.getObject(), transactions.getObject());
        }
        return new com.adaptlearngraph.repository.DepartmentRepository() {
            @Override public java.util.List<com.adaptlearngraph.entities.domain.Department> findAllDepartments(String organizationId) { return java.util.List.of(); }
            @Override public java.util.Optional<com.adaptlearngraph.entities.domain.Department> findByIdOrCode(String organizationId, String idOrCode) { return java.util.Optional.empty(); }
            @Override public com.adaptlearngraph.entities.domain.Department save(String organizationId, com.adaptlearngraph.entities.domain.Department department) { return department; }
            @Override public void delete(String organizationId, String idOrCode) {}
            @Override public void linkJobPosition(String organizationId, String departmentIdOrCode, String jobPositionIdOrCode) {}
            @Override public void unlinkJobPosition(String organizationId, String departmentIdOrCode, String jobPositionIdOrCode) {}
        };
    }

    @Bean
    public GetDepartmentsUseCase getDepartmentsUseCase(DepartmentRepository departmentRepository) {
        return new DepartmentService(departmentRepository);
    }

    @Bean
    public com.adaptlearngraph.repository.CompetencyRepository competencyRepository(ObjectProvider<Driver> driverProvider,
            ObjectProvider<CompetencyNodeRepository> competencies, ObjectProvider<Neo4jClient> client,
            @Qualifier(TransactionManagers.NEO4J) ObjectProvider<PlatformTransactionManager> transactions) {
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jCompetencyRepository(competencies.getObject(), client.getObject(), transactions.getObject());
        }
        return new com.adaptlearngraph.repository.CompetencyRepository() {
            @Override public java.util.List<com.adaptlearngraph.entities.domain.CompetencyRecord> findAllCompetencies(String organizationId, String search) { return java.util.List.of(); }
            @Override public java.util.Optional<com.adaptlearngraph.entities.domain.CompetencyRecord> findById(String organizationId, String id) { return java.util.Optional.empty(); }
            @Override public boolean existsByOrganizationIdAndCode(String organizationId, String code) { return false; }
            @Override public boolean existsByOrganizationIdAndCodeAndIdNot(String organizationId, String code, String id) { return false; }
            @Override public com.adaptlearngraph.entities.domain.CompetencyRecord save(String organizationId, com.adaptlearngraph.entities.domain.CompetencyRecord record, java.util.List<String> skillIds, String levelId) { return record; }
            @Override public void deleteById(String organizationId, String id) {}
        };
    }

    @Bean
    public com.adaptlearngraph.services.ManageCompetencyUseCase manageCompetencyUseCase(
            com.adaptlearngraph.repository.CompetencyRepository competencyRepository) {
        return new com.adaptlearngraph.services.CompetencyService(competencyRepository);
    }

    @Bean
    public com.adaptlearngraph.repository.LearningModuleRepository learningModuleRepository(ObjectProvider<Driver> driverProvider,
            ObjectProvider<LearningModuleNodeRepository> modules, ObjectProvider<Neo4jClient> client,
            @Qualifier(TransactionManagers.NEO4J) ObjectProvider<PlatformTransactionManager> transactions) {
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jLearningModuleRepository(modules.getObject(), client.getObject(), transactions.getObject());
        }
        return new com.adaptlearngraph.repository.LearningModuleRepository() {
            @Override public java.util.List<com.adaptlearngraph.entities.domain.LearningModuleRecord> findAll(String organizationId) { return java.util.List.of(); }
            @Override public java.util.Optional<com.adaptlearngraph.entities.domain.LearningModuleRecord> findById(String organizationId, String id) { return java.util.Optional.empty(); }
            @Override public com.adaptlearngraph.entities.domain.LearningModuleRecord save(String organizationId, com.adaptlearngraph.entities.domain.LearningModuleRecord module) { return module; }
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
