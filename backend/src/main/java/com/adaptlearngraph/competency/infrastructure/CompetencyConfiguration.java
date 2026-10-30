package com.adaptlearngraph.competency.infrastructure;

import com.adaptlearngraph.competency.application.MicroSkillService;
import com.adaptlearngraph.competency.application.PrerequisiteService;
import com.adaptlearngraph.competency.application.port.in.CreateMicroSkillUseCase;
import com.adaptlearngraph.competency.application.port.in.DeleteMicroSkillUseCase;
import com.adaptlearngraph.competency.application.port.in.GetMicroSkillsUseCase;
import com.adaptlearngraph.competency.application.port.in.GetTargetRoleGraphUseCase;
import com.adaptlearngraph.competency.application.port.in.ManagePrerequisiteUseCase;
import com.adaptlearngraph.competency.application.port.in.UpdateMicroSkillUseCase;
import com.adaptlearngraph.competency.application.port.out.MacroCompetencyRepository;
import com.adaptlearngraph.competency.application.port.out.MicroSkillRepository;
import com.adaptlearngraph.competency.application.port.out.PrerequisiteRepository;
import com.adaptlearngraph.competency.application.port.out.TargetRoleGraphPort;
import com.adaptlearngraph.competency.domain.MicroSkill;
import com.adaptlearngraph.competency.domain.MicroSkillId;
import com.adaptlearngraph.competency.domain.PrerequisiteEdge;
import com.adaptlearngraph.competency.domain.SkillStatus;
import com.adaptlearngraph.competency.domain.TargetRoleGraph;
import org.neo4j.driver.Driver;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Configuration(proxyBeanMethods = false)
public class CompetencyConfiguration {

    @Bean
    public MicroSkillRepository microSkillRepository(ObjectProvider<Driver> driverProvider) {
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jMicroSkillRepository(driver);
        }
        return new InMemoryFallbackMicroSkillRepository();
    }

    @Bean
    public MicroSkillService microSkillService(MicroSkillRepository microSkillRepository) {
        return new MicroSkillService(microSkillRepository);
    }

    @Bean
    public CreateMicroSkillUseCase createMicroSkillUseCase(MicroSkillService microSkillService) {
        return microSkillService;
    }

    @Bean
    public GetMicroSkillsUseCase getMicroSkillsUseCase(MicroSkillService microSkillService) {
        return microSkillService;
    }

    @Bean
    public UpdateMicroSkillUseCase updateMicroSkillUseCase(MicroSkillService microSkillService) {
        return microSkillService;
    }

    @Bean
    public DeleteMicroSkillUseCase deleteMicroSkillUseCase(MicroSkillService microSkillService) {
        return microSkillService;
    }

    @Bean
    public MacroCompetencyRepository macroCompetencyRepository(ObjectProvider<Driver> driverProvider) {
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jMacroCompetencyRepository(driver);
        }
        return new InMemoryFallbackMacroCompetencyRepository();
    }

    @Bean
    public com.adaptlearngraph.competency.application.MacroCompetencyService macroCompetencyService(
            MacroCompetencyRepository macroCompetencyRepository) {
        return new com.adaptlearngraph.competency.application.MacroCompetencyService(macroCompetencyRepository);
    }

    @Bean
    public com.adaptlearngraph.competency.application.port.in.GetMacroCompetenciesUseCase getMacroCompetenciesUseCase(
            com.adaptlearngraph.competency.application.MacroCompetencyService macroCompetencyService) {
        return macroCompetencyService;
    }

    @Bean
    public PrerequisiteRepository prerequisiteRepository(ObjectProvider<Driver> driverProvider) {
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jPrerequisiteRepository(driver);
        }
        return new InMemoryFallbackPrerequisiteRepository();
    }

    @Bean
    public TargetRoleGraphPort targetRoleGraphPort(ObjectProvider<Driver> driverProvider) {
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jTargetRoleGraphAdapter(driver);
        }
        return (orgId, roleId) -> Optional.empty();
    }

    @Bean
    public PrerequisiteService prerequisiteService(
            PrerequisiteRepository prerequisiteRepository,
            TargetRoleGraphPort targetRoleGraphPort) {
        return new PrerequisiteService(prerequisiteRepository, targetRoleGraphPort);
    }

    @Bean
    public ManagePrerequisiteUseCase managePrerequisiteUseCase(PrerequisiteService prerequisiteService) {
        return prerequisiteService;
    }

    @Bean
    public GetTargetRoleGraphUseCase getTargetRoleGraphUseCase(PrerequisiteService prerequisiteService) {
        return prerequisiteService;
    }

    private static class InMemoryFallbackMacroCompetencyRepository implements MacroCompetencyRepository {
        @Override
        public List<com.adaptlearngraph.competency.domain.MacroCompetency> findAll() {
            Instant now = Instant.now();
            return List.of(
                    new com.adaptlearngraph.competency.domain.MacroCompetency("30000000-0000-0000-0000-000000000001", "KNOWLEDGE", "Knowledge", "Core technical and conceptual domain knowledge", "ACTIVE", now, now),
                    new com.adaptlearngraph.competency.domain.MacroCompetency("30000000-0000-0000-0000-000000000002", "COMMUNICATION", "Communication", "Interpersonal, technical communication, and collaboration", "ACTIVE", now, now),
                    new com.adaptlearngraph.competency.domain.MacroCompetency("30000000-0000-0000-0000-000000000003", "INNOVATION", "Innovation", "Creative problem solving and novel architectural solutions", "ACTIVE", now, now),
                    new com.adaptlearngraph.competency.domain.MacroCompetency("30000000-0000-0000-0000-000000000004", "RESPONSIBLE_AI", "Responsible AI", "AI safety, governance, transparency, and ethical machine learning deployments", "ACTIVE", now, now),
                    new com.adaptlearngraph.competency.domain.MacroCompetency("30000000-0000-0000-0000-000000000005", "AI_LITERACY", "AI literacy", "Foundations of artificial intelligence, LLM capabilities, and organizational enablement", "ACTIVE", now, now),
                    new com.adaptlearngraph.competency.domain.MacroCompetency("30000000-0000-0000-0000-000000000006", "GEN_AI", "Generative AI", "Modern generative AI architectures, prompt patterns, multimodal reasoning, and foundation models", "ACTIVE", now, now),
                    new com.adaptlearngraph.competency.domain.MacroCompetency("30000000-0000-0000-0000-000000000007", "MACHINE_LEARNING", "Machine Learning", "Statistical learning, model training pipelines, deep learning, and evaluation", "ACTIVE", now, now),
                    new com.adaptlearngraph.competency.domain.MacroCompetency("30000000-0000-0000-0000-000000000008", "LEADERSHIP", "Leadership and Management", "Engineering leadership, strategic technology management, and team empowerment", "ACTIVE", now, now)
            );
        }
    }

    private static class InMemoryFallbackMicroSkillRepository implements MicroSkillRepository {
        private final Map<String, MicroSkill> store = new ConcurrentHashMap<>();

        @Override
        public boolean existsByOrganizationIdAndCode(String organizationId, String code) {
            return store.values().stream().anyMatch(m -> m.getOrganizationId().equals(organizationId) && m.getCode().equalsIgnoreCase(code));
        }

        @Override
        public MicroSkill save(MicroSkill microSkill) {
            store.put(microSkill.getId().toString(), microSkill);
            return microSkill;
        }

        @Override
        public Optional<MicroSkill> findById(String organizationId, MicroSkillId id) {
            MicroSkill skill = store.get(id.toString());
            if (skill != null && (skill.getOrganizationId() == null || skill.getOrganizationId().equals(organizationId))) {
                return Optional.of(skill);
            }
            return Optional.empty();
        }

        @Override
        public Optional<MicroSkill> findByCode(String organizationId, String code) {
            return store.values().stream()
                    .filter(m -> (m.getOrganizationId() == null || m.getOrganizationId().equals(organizationId)) && m.getCode().equalsIgnoreCase(code))
                    .findFirst();
        }

        @Override
        public List<MicroSkill> findAll(String organizationId) {
            return search(organizationId, null, null, null);
        }

        @Override
        public List<MicroSkill> search(String organizationId, String query, String macroCode, SkillStatus status) {
            return store.values().stream()
                    .filter(m -> m.getOrganizationId() == null || m.getOrganizationId().equals(organizationId))
                    .filter(m -> query == null || query.isBlank()
                            || m.getName().toLowerCase().contains(query.toLowerCase())
                            || m.getCode().toLowerCase().contains(query.toLowerCase()))
                    .filter(m -> macroCode == null || macroCode.isBlank() || m.getMacroCompetencyCode().equalsIgnoreCase(macroCode))
                    .filter(m -> status == null || m.getStatus() == status)
                    .toList();
        }

        @Override
        public void delete(String organizationId, MicroSkillId id) {
            store.remove(id.toString());
        }

        @Override
        public int countDependencies(String organizationId, MicroSkillId id) {
            return 0;
        }
    }

    private static class InMemoryFallbackPrerequisiteRepository implements PrerequisiteRepository {
        private final List<PrerequisiteEdge> edges = new CopyOnWriteArrayList<>();

        @Override
        public List<PrerequisiteEdge> findAll(String organizationId) {
            return List.copyOf(edges);
        }

        @Override
        public List<PrerequisiteEdge> findForRole(String organizationId, String roleId) {
            return List.copyOf(edges);
        }

        @Override
        public boolean hasPath(String organizationId, String fromSkillId, String toSkillId) {
            if (fromSkillId.equals(toSkillId)) {
                return true;
            }
            for (PrerequisiteEdge edge : edges) {
                if (edge.sourceSkillId().equals(fromSkillId)) {
                    if (edge.targetSkillId().equals(toSkillId) || hasPath(organizationId, edge.targetSkillId(), toSkillId)) {
                        return true;
                    }
                }
            }
            return false;
        }

        @Override
        public PrerequisiteEdge savePrerequisite(String organizationId, String sourceSkillId, String targetSkillId, double minMastery, SkillStatus status) {
            deletePrerequisite(organizationId, sourceSkillId, targetSkillId);
            Instant now = Instant.now();
            PrerequisiteEdge edge = new PrerequisiteEdge(
                    sourceSkillId, "SRC", "Source Skill",
                    targetSkillId, "TGT", "Target Skill",
                    minMastery, status != null ? status : SkillStatus.ACTIVE,
                    now, now);
            edges.add(edge);
            return edge;
        }

        @Override
        public void deletePrerequisite(String organizationId, String sourceSkillId, String targetSkillId) {
            edges.removeIf(e -> e.sourceSkillId().equals(sourceSkillId) && e.targetSkillId().equals(targetSkillId));
        }
    }
}
