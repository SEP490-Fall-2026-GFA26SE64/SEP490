package com.adaptlearngraph.pathway.api;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.pathway.application.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;

class InitialPathwayActivationTest {
    WebApplicationContextRunner context(String... profiles) {
        return new WebApplicationContextRunner().withInitializer(c->c.getEnvironment().setActiveProfiles(profiles))
                .withPropertyValues("pathway.initial.enabled=true","assessment.baseline.workspace.enabled=true")
                .withBean(RoleGapPreview.class,()->mock(RoleGapPreview.class)).withBean(InitialPathwayAdmission.class,()->mock(InitialPathwayAdmission.class))
                .withBean(InitialPathwayReview.class,()->mock(InitialPathwayReview.class)).withBean(InitialPathwayView.class,()->mock(InitialPathwayView.class))
                .withBean(ObjectMapper.class,ObjectMapper::new).withUserConfiguration(InitialPathwayController.class);
    }
    @Test void R13_productionAlwaysDeniesControllerEvenWhenFlagsEnabled(){context("local","workspace-baseline","prod").run(c->assertThat(c).doesNotHaveBean(InitialPathwayController.class));}
    @Test void R13_flagOffAndMixedPersonaProfilesNeverActivateController(){context("local","workspace-baseline").withPropertyValues("pathway.initial.enabled=false").run(c->assertThat(c).doesNotHaveBean(InitialPathwayController.class));context("local","workspace-baseline","local-baseline-demo").run(c->assertThat(c).doesNotHaveBean(InitialPathwayController.class));}
    @Test void R13_explicitWorkspaceProfileAndBothFlagsAreRequired(){context("local","workspace-baseline").run(c->assertThat(c).hasSingleBean(InitialPathwayController.class));context("local").run(c->assertThat(c).doesNotHaveBean(InitialPathwayController.class));}
}
