package com.adaptlearngraph.shared.infrastructure;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class IntegrationPolicyConfigurationTest {
    @Test
    void defaultsRemainEnabledInEveryEnvironment() {
        var configuration = new IntegrationPolicyConfiguration();
        assertDoesNotThrow(() -> configuration.integrationPolicy(true, true, true, new MockEnvironment()));
    }

    @Test
    void eachDisabledFlagRequiresExplicitDevelopmentAndNoProductionProfile() {
        var configuration = new IntegrationPolicyConfiguration();
        for (boolean[] flags : new boolean[][] {{false, true, true}, {true, false, true}, {true, true, false},
                {false, false, false}}) {
            for (String profile : new String[] {"local", "dev"}) {
                var development = new MockEnvironment().withProperty("spring.profiles.active", profile);
                development.setActiveProfiles(profile);
                var policy = configuration.integrationPolicy(flags[0], flags[1], flags[2], development);
                assertEquals(flags[0], policy.payosEnabled());
                assertEquals(flags[1], policy.emailVerificationEnabled());
                assertEquals(flags[2], policy.mfaEnabled());
            }
            for (String[] profiles : new String[][] {{}, {"test"}, {"prod"}, {"production"}, {"local", "prod"},
                    {"dev", "production"}}) {
                var environment = new MockEnvironment();
                environment.setActiveProfiles(profiles);
                assertThrows(IllegalStateException.class,
                        () -> configuration.integrationPolicy(flags[0], flags[1], flags[2], environment));
            }
        }
    }
}
