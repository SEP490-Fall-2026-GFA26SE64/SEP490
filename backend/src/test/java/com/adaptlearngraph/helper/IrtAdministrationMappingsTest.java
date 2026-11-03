package com.adaptlearngraph.helper;

import static org.assertj.core.api.Assertions.assertThat;

import com.adaptlearngraph.dtos.IrtAdministrationDto.CandidateView;
import com.adaptlearngraph.dtos.IrtAdministrationDto.ItemFitResponse;
import com.adaptlearngraph.dtos.IrtAdministrationDto.ItemPinResponse;
import com.adaptlearngraph.dtos.IrtAdministrationDto.ResultResponse;
import com.adaptlearngraph.dtos.IrtAdministrationDto.RunView;
import com.adaptlearngraph.dtos.IrtAdministrationDto.ScopeResponse;
import com.adaptlearngraph.dtos.IrtAdministrationDto.SelectionResponse;
import com.adaptlearngraph.dtos.IrtAdministrationDto.SkillFitResponse;
import com.adaptlearngraph.entities.domain.Calibration.Candidate;
import com.adaptlearngraph.entities.domain.Calibration.Envelope;
import com.adaptlearngraph.entities.domain.Calibration.ItemFit;
import com.adaptlearngraph.entities.domain.Calibration.ItemPin;
import com.adaptlearngraph.entities.domain.Calibration.ModelPin;
import com.adaptlearngraph.entities.domain.Calibration.Origin;
import com.adaptlearngraph.entities.domain.Calibration.Request;
import com.adaptlearngraph.entities.domain.Calibration.Result;
import com.adaptlearngraph.entities.domain.Calibration.Run;
import com.adaptlearngraph.entities.domain.Calibration.Scope;
import com.adaptlearngraph.entities.domain.Calibration.SkillFit;
import com.adaptlearngraph.entities.domain.Calibration.Source;
import com.adaptlearngraph.entities.domain.Calibration.Status;
import com.adaptlearngraph.repository.PromotionPorts.Selection;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.RecordComponent;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;

/**
 * Calibration runs never expose the worker lease or envelope (actor, dataset reference, pins, model approval);
 * candidate diagnostics keep the established fitted-parameter contract for System Administrators.
 */
class IrtAdministrationMappingsTest {
    private static final UUID ORGANIZATION = uuid(1);
    private static final UUID BANK = uuid(2);
    private static final UUID MODEL = uuid(3);
    private static final UUID RUN = uuid(4);
    private static final UUID OUTPUT = uuid(5);
    private static final UUID ACTOR = UUID.fromString("ac70a000-0000-4000-8000-0000000000aa");
    private static final UUID APPROVER = UUID.fromString("a99a0000-0000-4000-8000-0000000000bb");
    private static final UUID WORKER_TOKEN = UUID.fromString("70ce0000-0000-4000-8000-0000000000cc");
    private static final String DATASET_REF = "private-dataset-ref";
    private static final String ARTIFACT_REF = "private-model-artifact";
    private static final Instant CREATED = Instant.parse("2026-10-20T08:00:00Z");
    private static final Instant STARTED = Instant.parse("2026-10-20T08:01:00Z");
    private static final Instant COMPLETED = Instant.parse("2026-10-20T08:02:00Z");
    private static final Instant LEASE_EXPIRES = Instant.parse("2026-10-20T09:59:59Z");

    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    private final ModelMapper mapper = ModelMapperFactory.create(List.of(new IrtAdministrationMappings()));

    @Test
    void runViewDropsWorkerLeaseAndEnvelope() throws Exception {
        var run = new Run(RUN, envelope(), Status.SUCCEEDED, OUTPUT, Map.of("workerToken", WORKER_TOKEN.toString(),
                "expiresAt", LEASE_EXPIRES.toString(), "iterations", 12, "phase", "DONE"), CREATED, STARTED, COMPLETED);

        var response = mapper.map(run, RunView.class);

        assertThat(response).isEqualTo(new RunView(RUN, "SUCCEEDED", OUTPUT, "SYNTHETIC",
                Map.of("iterations", 12, "phase", "DONE"), CREATED, STARTED, COMPLETED));
        assertThat(components(RunView.class)).doesNotContain("envelope", "workerToken", "expiresAt", "actorId");
        assertThat(json.writeValueAsString(response)).doesNotContain(WORKER_TOKEN.toString(), LEASE_EXPIRES.toString(),
                "workerToken", "expiresAt", ACTOR.toString(), APPROVER.toString(), DATASET_REF, ARTIFACT_REF);
    }

    @Test
    void candidateViewKeepsFittedDiagnosticsButNeverTheEnvelope() throws Exception {
        UUID candidateId = uuid(6);
        var pin = pin();
        var result = new Result(Origin.SYNTHETIC, "MML-EM", hash('1'), hash('2'), hash('3'), 42L,
                List.of(new ItemFit(pin, 1.2, -0.4, 0.15, 300, 180, 0.6, 0.58, 0.02, "LOW", true)),
                List.of(new SkillFit("skill-java", 300, 25, -820.5, -790.25, 0.0001, 0.002, true)), 1234L);
        var candidate = new Candidate(candidateId, MODEL, "SYNTHETIC", "CANDIDATE", hash('4'), result, envelope(), CREATED,
                null, null);

        var response = mapper.map(candidate, CandidateView.class);

        assertThat(response).isEqualTo(new CandidateView(candidateId, MODEL, "SYNTHETIC", "CANDIDATE", hash('4'),
                new ResultResponse("SYNTHETIC", "MML-EM", hash('1'), hash('2'), hash('3'), 42L,
                        List.of(new ItemFitResponse(new ItemPinResponse(uuid(7), uuid(8), 2, "skill-java", hash('5')), 1.2,
                                -0.4, 0.15, 300, 180, 0.6, 0.58, 0.02, "LOW", true)),
                        List.of(new SkillFitResponse("skill-java", 300, 25, -820.5, -790.25, 0.0001, 0.002, true)), 1234L),
                CREATED, null, null));
        assertThat(components(CandidateView.class)).doesNotContain("envelope");
        String body = json.writeValueAsString(response);
        assertThat(body).contains("\"cEstimated\":true")
                .doesNotContain(ACTOR.toString(), APPROVER.toString(), DATASET_REF, ARTIFACT_REF, "envelope");
    }

    @Test
    void promotionSelectionMapsScopeAndActor() {
        UUID parameterSet = uuid(9);
        Instant selected = Instant.parse("2026-10-21T10:00:00Z");
        var selection = new Selection(new Scope(ORGANIZATION, BANK, MODEL), 3, parameterSet, hash('6'), ACTOR, selected);

        assertThat(mapper.map(selection, SelectionResponse.class)).isEqualTo(new SelectionResponse(
                new ScopeResponse(ORGANIZATION, BANK, MODEL), 3, parameterSet, hash('6'), ACTOR, selected));
    }

    private static Envelope envelope() {
        var scope = new Scope(ORGANIZATION, BANK, MODEL);
        var source = new Source(BANK, "v1", hash('a'), hash('b'), hash('c'));
        var request = new Request(RUN, scope, source, DATASET_REF, hash('d'), hash('e'), hash('f'), hash('9'));
        var model = new ModelPin(MODEL, "MML-EM", "1", hash('f'), hash('e'), ARTIFACT_REF, APPROVER, CREATED);
        return new Envelope(2, ACTOR, request, List.of(pin()), Origin.SYNTHETIC, hash('8'), 7L, model);
    }

    private static ItemPin pin() {
        return new ItemPin(uuid(7), uuid(8), 2, "skill-java", hash('5'));
    }

    private static List<String> components(Class<?> type) {
        return Arrays.stream(type.getRecordComponents()).map(RecordComponent::getName).toList();
    }

    private static String hash(char value) {
        return String.valueOf(value).repeat(64);
    }

    private static UUID uuid(long value) {
        return new UUID(0L, value);
    }
}