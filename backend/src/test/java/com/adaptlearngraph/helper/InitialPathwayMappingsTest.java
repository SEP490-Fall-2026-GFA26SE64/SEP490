package com.adaptlearngraph.helper;

import static org.assertj.core.api.Assertions.assertThat;

import com.adaptlearngraph.dtos.InitialPathwayDto.OutcomeResponse;
import com.adaptlearngraph.repository.InitialPathwayPorts.Receipt;
import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Retained command receipts replay status and body only; the stored request hash never leaves the server. */
class InitialPathwayMappingsTest {
    @Test
    void outcomeKeepsStatusAndBodyButNotTheRequestHash() {
        var mapper = ModelMapperFactory.create(List.of(new InitialPathwayMappings()));
        String hash = "f".repeat(64);

        var outcome = mapper.map(new Receipt(201, hash, "{\"revision\":5}"), OutcomeResponse.class);

        assertThat(outcome).isEqualTo(new OutcomeResponse(201, "{\"revision\":5}"));
        assertThat(Arrays.stream(OutcomeResponse.class.getRecordComponents()).map(RecordComponent::getName))
                .doesNotContain("bodyHash");
        assertThat(outcome.toString()).doesNotContain(hash);
    }
}