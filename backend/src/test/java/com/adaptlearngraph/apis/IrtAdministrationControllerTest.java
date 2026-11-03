package com.adaptlearngraph.apis;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.entities.domain.Calibration;
import com.adaptlearngraph.entities.domain.Calibration.Envelope;
import com.adaptlearngraph.entities.domain.Calibration.ModelPin;
import com.adaptlearngraph.entities.domain.Calibration.Origin;
import com.adaptlearngraph.entities.domain.Calibration.Request;
import com.adaptlearngraph.entities.domain.Calibration.Run;
import com.adaptlearngraph.entities.domain.Calibration.Scope;
import com.adaptlearngraph.entities.domain.Calibration.Source;
import com.adaptlearngraph.entities.domain.Calibration.Status;
import com.adaptlearngraph.helper.CalibrationJson;
import com.adaptlearngraph.helper.IrtAdministrationMappings;
import com.adaptlearngraph.helper.ModelMapperFactory;
import com.adaptlearngraph.repository.CalibrationPorts;
import com.adaptlearngraph.repository.CalibrationPorts.Action;
import com.adaptlearngraph.repository.CalibrationPorts.Grant;
import com.adaptlearngraph.repository.PromotionPorts;
import com.adaptlearngraph.services.IrtAdministrationApplicationService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** Trusted scope precedes body parsing; calibration failures keep their code/message; worker leases never leave. */
class IrtAdministrationControllerTest {
    private static final UUID ORGANIZATION = new UUID(0L, 1);
    private static final UUID BANK = new UUID(0L, 2);
    private static final UUID MODEL = new UUID(0L, 3);
    private static final UUID RUN = new UUID(0L, 4);
    private static final UUID ACTOR = new UUID(0L, 5);
    private static final Scope SCOPE = new Scope(ORGANIZATION, BANK, MODEL);
    private static final String PATH = "/api/v1/admin/irt/banks/" + BANK + "/models/" + MODEL;

    private final CalibrationPorts.Authorization authorization = mock(CalibrationPorts.Authorization.class);
    private final CalibrationPorts.UseCase calibration = mock(CalibrationPorts.UseCase.class);
    private final PromotionPorts.UseCase promotion = mock(PromotionPorts.UseCase.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new IrtAdministrationController(
            new IrtAdministrationApplicationService(authorization, calibration, promotion, new CalibrationJson(),
                    ModelMapperFactory.create(List.of(new IrtAdministrationMappings()))))).build();

    @BeforeEach
    void trustedScope() {
        when(authorization.currentScope(BANK, MODEL)).thenReturn(SCOPE);
        when(authorization.require(eq(SCOPE), any(Action.class))).thenReturn(new Grant(ACTOR, SCOPE));
    }

    @Test
    void runReadNeverExposesTheWorkerLeaseOrEnvelope() throws Exception {
        when(calibration.read(SCOPE, RUN)).thenReturn(new Run(RUN, envelope(), Status.RUNNING, null,
                Map.of("workerToken", "lease-token", "expiresAt", "2026-10-20T09:00:00Z", "phase", "FIT"),
                Instant.parse("2026-10-20T08:00:00Z"), Instant.parse("2026-10-20T08:01:00Z"), null));

        mvc.perform(get(PATH + "/calibration-runs/" + RUN))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.runId").value(RUN.toString()))
                .andExpect(jsonPath("$.status").value("RUNNING"))
                .andExpect(jsonPath("$.origin").value("SYNTHETIC"))
                .andExpect(jsonPath("$.diagnostics.phase").value("FIT"))
                .andExpect(jsonPath("$.diagnostics.workerToken").doesNotExist())
                .andExpect(jsonPath("$.diagnostics.expiresAt").doesNotExist())
                .andExpect(jsonPath("$.envelope").doesNotExist());
    }

    @Test
    void foreignScopeIsForbiddenBeforeAnyCalibrationRead() throws Exception {
        when(authorization.currentScope(BANK, MODEL)).thenReturn(new Scope(ORGANIZATION, new UUID(0L, 99), MODEL));

        mvc.perform(get(PATH + "/calibration-runs/" + RUN))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.message").value("Calibration: FORBIDDEN"));
        verifyNoInteractions(calibration);
    }

    @Test
    void runRequestUsesTrustedScopeAndRejectsMissingSource() throws Exception {
        mvc.perform(post(PATH + "/calibration-runs").contentType("application/json").content("{\"runId\":\"" + RUN + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.message").value("Calibration: INVALID_INPUT"));
        verifyNoInteractions(calibration);

        when(calibration.execute(any())).thenThrow(new Calibration.Failure(Calibration.Code.NOT_READY));
        String body = "{\"runId\":\"" + RUN + "\",\"source\":{\"bankId\":\"" + BANK + "\",\"manifestVersion\":\"v1\","
                + "\"manifestHash\":\"" + hash('a') + "\",\"scopeHash\":\"" + hash('b') + "\",\"ontologyHash\":\"" + hash('c')
                + "\"},\"datasetRef\":\"dataset-1\",\"datasetHash\":\"" + hash('d') + "\",\"modelConfigurationHash\":\""
                + hash('e') + "\",\"modelParameterHash\":\"" + hash('f') + "\",\"algorithmHash\":\"" + hash('9') + "\"}";
        mvc.perform(post(PATH + "/calibration-runs").contentType("application/json").content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NOT_READY"));
        verify(calibration).execute(argThat((Request request) -> request.scope().equals(SCOPE) && request.runId().equals(RUN)
                && request.source().equals(new Source(BANK, "v1", hash('a'), hash('b'), hash('c')))
                && request.datasetRef().equals("dataset-1")));
    }

    @Test
    void promotionRequiresAnIdempotencyKey() throws Exception {
        mvc.perform(post(PATH + "/promotions").contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        verifyNoInteractions(promotion);
    }

    private static Envelope envelope() {
        var source = new Source(BANK, "v1", hash('a'), hash('b'), hash('c'));
        var request = new Request(RUN, SCOPE, source, "dataset-1", hash('d'), hash('e'), hash('f'), hash('9'));
        var model = new ModelPin(MODEL, "MML-EM", "1", hash('f'), hash('e'), "artifact", ACTOR, Instant.parse("2026-10-01T00:00:00Z"));
        return new Envelope(2, ACTOR, request, List.of(), Origin.SYNTHETIC, hash('8'), 7L, model);
    }

    private static String hash(char value) {
        return String.valueOf(value).repeat(64);
    }
}