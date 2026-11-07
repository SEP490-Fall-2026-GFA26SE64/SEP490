package com.adaptlearngraph.helper;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;

/** Every registrar the application exposes validates together on the single shared mapper without TypeMap clashes. */
class ApplicationMappingsTest {
    private static final List<Supplier<ModelMapperRegistrar>> REGISTRARS = List.of(
            JobPositionMappings::new, CompetencyMappings::new, MicroSkillMappings::new,
            TargetRoleMappings::new, LearningModuleMappings::new, SystemStatusMappings::new, RegistrationMappings::new,
            SubscriptionMappings::new, AssessmentPolicyMappings::new, () -> new BaselineAuthoringMappings(new ObjectMapper()),
            InitialPathwayMappings::new, IrtAdministrationMappings::new, QuestionBankMappings::new,
            ModuleAuthoringMappings::new, LearningContentMappings::new);

    @Test
    void allRegistrarsValidateTogetherWithoutSharingATypeMap() {
        int separately = REGISTRARS.stream()
                .mapToInt(registrar -> ModelMapperFactory.create(List.of(registrar.get())).getTypeMaps().size()).sum();

        var shared = ModelMapperFactory.create(REGISTRARS.stream().map(Supplier::get).toList());

        assertThat(shared.getTypeMaps()).hasSize(separately);
    }
}