package com.adaptlearngraph.competency.infrastructure;

import com.adaptlearngraph.competency.application.MicroSkillService;
import com.adaptlearngraph.competency.application.port.in.CreateMicroSkillUseCase;
import com.adaptlearngraph.competency.application.port.out.MicroSkillRepository;
import com.adaptlearngraph.competency.domain.MicroSkill;
import com.adaptlearngraph.competency.domain.MicroSkillId;
import org.neo4j.driver.Driver;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

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
    public com.adaptlearngraph.competency.application.port.in.GetMicroSkillsUseCase getMicroSkillsUseCase(MicroSkillService microSkillService) {
        return microSkillService;
    }

    @Bean
    public com.adaptlearngraph.competency.application.port.out.MacroCompetencyRepository macroCompetencyRepository(ObjectProvider<Driver> driverProvider) {
        Driver driver = driverProvider.getIfAvailable();
        if (driver != null) {
            return new Neo4jMacroCompetencyRepository(driver);
        }
        return new InMemoryFallbackMacroCompetencyRepository();
    }

    @Bean
    public com.adaptlearngraph.competency.application.MacroCompetencyService macroCompetencyService(
            com.adaptlearngraph.competency.application.port.out.MacroCompetencyRepository macroCompetencyRepository) {
        return new com.adaptlearngraph.competency.application.MacroCompetencyService(macroCompetencyRepository);
    }

    @Bean
    public com.adaptlearngraph.competency.application.port.in.GetMacroCompetenciesUseCase getMacroCompetenciesUseCase(
            com.adaptlearngraph.competency.application.MacroCompetencyService macroCompetencyService) {
        return macroCompetencyService;
    }

    private static class InMemoryFallbackMacroCompetencyRepository implements com.adaptlearngraph.competency.application.port.out.MacroCompetencyRepository {
        @Override
        public java.util.List<com.adaptlearngraph.competency.domain.MacroCompetency> findAll() {
            java.time.Instant now = java.time.Instant.now();
            return java.util.List.of(
                    new com.adaptlearngraph.competency.domain.MacroCompetency("macro-knowledge", "KNOWLEDGE", "Technical & Domain Knowledge", "Foundational knowledge and operational mastery in domain concepts", "ACTIVE", now, now),
                    new com.adaptlearngraph.competency.domain.MacroCompetency("macro-comm", "COMMUNICATION", "Team Communication & Collaboration", "Interpersonal skills, cross-functional communication, and stakeholder alignment", "ACTIVE", now, now),
                    new com.adaptlearngraph.competency.domain.MacroCompetency("macro-innov", "INNOVATION", "Problem Solving & Innovation", "Algorithmic thinking, architectural innovation, and creative engineering resolution", "ACTIVE", now, now)
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
            if (skill != null && skill.getOrganizationId().equals(organizationId)) {
                return Optional.of(skill);
            }
            return Optional.empty();
        }

        @Override
        public Optional<MicroSkill> findByCode(String organizationId, String code) {
            return store.values().stream()
                    .filter(m -> m.getOrganizationId().equals(organizationId) && m.getCode().equalsIgnoreCase(code))
                    .findFirst();
        }

        @Override
        public java.util.List<MicroSkill> findAll(String organizationId) {
            return store.values().stream()
                    .filter(m -> m.getOrganizationId() == null || m.getOrganizationId().equals(organizationId))
                    .toList();
        }
    }
}

