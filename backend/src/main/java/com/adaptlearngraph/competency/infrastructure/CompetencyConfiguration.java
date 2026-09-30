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
    }
}

