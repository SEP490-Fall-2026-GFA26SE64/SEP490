package com.adaptlearngraph.helper;

import static org.assertj.core.api.Assertions.assertThat;

import com.adaptlearngraph.dtos.AssessmentPolicyDto.PageResponse;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.PinResponse;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.SavedResponse;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.StateResponse;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.ValuesResponse;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.VersionResponse;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.Page;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.Pin;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.Saved;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.State;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.Values;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.Version;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;

/** Organization policy TypeMaps copy every value and expose no derived policy internals. */
class AssessmentPolicyMappingsTest {
    private static final UUID ORGANIZATION = new UUID(0L, 1);
    private static final UUID VERSION = new UUID(0L, 2);
    private static final UUID ACTOR = new UUID(0L, 3);
    private static final Instant CREATED = Instant.parse("2026-10-05T10:00:00Z");

    private final ModelMapper mapper = ModelMapperFactory.create(List.of(new AssessmentPolicyMappings()));

    @Test
    void mapsStatePageAndSavedVersions() throws Exception {
        var values = new Values(0.3, 0.35, 0.5, 2.0);
        var version = new Version(new Pin(ORGANIZATION, VERSION, values.hash(), values), 4, ACTOR, CREATED);
        var expected = new VersionResponse(new PinResponse(ORGANIZATION, VERSION, values.hash(),
                new ValuesResponse(0.3, 0.35, 0.5, 2.0)), 4, ACTOR, CREATED);

        assertThat(mapper.map(new State(version, 7), StateResponse.class)).isEqualTo(new StateResponse(expected, 7));
        assertThat(mapper.map(new State(null, 0), StateResponse.class)).isEqualTo(new StateResponse(null, 0));
        assertThat(mapper.map(new Page(List.of(version), 11, 1, 10), PageResponse.class))
                .isEqualTo(new PageResponse(List.of(expected), 11, 1, 10));
        assertThat(mapper.map(new Saved(version, true), SavedResponse.class)).isEqualTo(new SavedResponse(expected, true));
        assertThat(new ObjectMapper().findAndRegisterModules().writeValueAsString(new ValuesResponse(0.3, 0.35, 0.5, 2.0)))
                .isEqualTo("{\"stopSe\":0.3,\"highConfidenceSe\":0.35,\"mediumConfidenceSe\":0.5,\"k\":2.0}");
    }
}