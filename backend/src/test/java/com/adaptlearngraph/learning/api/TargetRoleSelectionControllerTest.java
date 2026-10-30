package com.adaptlearngraph.learning.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.identity.infrastructure.LocalCatalogSecurityConfiguration;
import com.adaptlearngraph.learning.application.TargetRoleSelectionException;
import com.adaptlearngraph.learning.application.TargetRoleSelectionException.Code;
import com.adaptlearngraph.learning.application.port.in.ChooseTargetRoleCommand;
import com.adaptlearngraph.learning.application.port.in.TargetRoleSelectionResult;
import com.adaptlearngraph.learning.application.port.in.TargetRoleSelectionResult.Disposition;
import com.adaptlearngraph.learning.application.port.in.TargetRoleSelectionUseCase;
import com.adaptlearngraph.learning.domain.TargetRoleSelection;
import com.adaptlearngraph.learning.domain.TargetRoleSnapshot;
import com.adaptlearngraph.learning.domain.TargetRoleSnapshot.CareerTrack;
import com.adaptlearngraph.learning.domain.TargetRoleSnapshot.Seniority;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TargetRoleSelectionController.class)
@Import(LocalCatalogSecurityConfiguration.class)
@ActiveProfiles("local")
@TestPropertySource(properties = "catalog.local-actor.enabled=true")
class TargetRoleSelectionControllerTest {
    private static final UUID SELECTION_ID = uuid(1);
    private static final UUID ROLE_ID = uuid(2);
    private static final UUID ROLE_REFERENCE_ID = uuid(3);
    private static final UUID LEARNER_ID = uuid(4);
    private static final UUID EXPECTED_SELECTION_ID = uuid(5);
    private static final Instant SELECTED_AT = Instant.parse("2026-10-02T04:00:00Z");

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private TargetRoleSelectionUseCase selections;

    @Test
    void getReturnsNoContentWhenThereIsNoActiveSelection() throws Exception {
        when(selections.getCurrentSelection()).thenReturn(Optional.empty());

        mvc.perform(get("/api/v1/employee/target-role-selection"))
                .andExpect(status().isNoContent());

        verify(selections).getCurrentSelection();
    }

    @Test
    void getReturnsCurrentSelectionContractWithChangedFalse() throws Exception {
        when(selections.getCurrentSelection()).thenReturn(Optional.of(selection()));

        mvc.perform(get("/api/v1/employee/target-role-selection"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.selectionId").value(SELECTION_ID.toString()))
                .andExpect(jsonPath("$.roleId").value(ROLE_ID.toString()))
                .andExpect(jsonPath("$.roleSnapshot.id").value(ROLE_ID.toString()))
                .andExpect(jsonPath("$.roleSnapshot.code").value("JAVA_P3"))
                .andExpect(jsonPath("$.roleSnapshot.name").value("Java Developer"))
                .andExpect(jsonPath("$.roleSnapshot.track").value("PROFESSIONAL"))
                .andExpect(jsonPath("$.roleSnapshot.seniority").value("P3"))
                .andExpect(jsonPath("$.selectedAt").value(SELECTED_AT.toString()))
                .andExpect(jsonPath("$.targetRevision").value(7))
                .andExpect(jsonPath("$.changed").value(false));
    }

    @Test
    void putReturnsSelectionAndForwardsOnlyHeaderAndBodyCommandFields() throws Exception {
        when(selections.chooseTargetRole(any())).thenReturn(
                new TargetRoleSelectionResult(selection(), Disposition.APPLIED));

        mvc.perform(put("/api/v1/employee/target-role-selection")
                        .header("Idempotency-Key", "  request-key  ")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "roleId": "%s",
                                  "expectedCurrentSelectionId": "%s",
                                  "organizationId": "00000000-0000-0000-0000-000000000099"
                                }
                                """.formatted(ROLE_ID, EXPECTED_SELECTION_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.selectionId").value(SELECTION_ID.toString()))
                .andExpect(jsonPath("$.targetRevision").value(7))
                .andExpect(jsonPath("$.changed").value(true));

        var command = ArgumentCaptor.forClass(ChooseTargetRoleCommand.class);
        verify(selections).chooseTargetRole(command.capture());
        assertThat(command.getValue().roleId()).isEqualTo(ROLE_ID);
        assertThat(command.getValue().expectedCurrentSelectionId()).isEqualTo(EXPECTED_SELECTION_ID);
        assertThat(command.getValue().idempotencyKey()).isEqualTo("request-key");
    }

    @Test
    void invalidHeaderBodyUuidAndNilIdentityMapToBadRequest() throws Exception {
        mvc.perform(put("/api/v1/employee/target-role-selection")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleId\":\"%s\"}".formatted(ROLE_ID)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

        mvc.perform(put("/api/v1/employee/target-role-selection")
                        .header("Idempotency-Key", " ")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleId\":\"%s\"}".formatted(ROLE_ID)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

        mvc.perform(put("/api/v1/employee/target-role-selection")
                        .header("Idempotency-Key", "key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleId\":null}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

        mvc.perform(put("/api/v1/employee/target-role-selection")
                        .header("Idempotency-Key", "key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleId\":\"not-a-uuid\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

        mvc.perform(put("/api/v1/employee/target-role-selection")
                        .header("Idempotency-Key", "key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleId\":\"00000000-0000-0000-0000-000000000000\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @ParameterizedTest
    @MethodSource("applicationErrors")
    void mapsApplicationErrorsToStableHttpContract(Code code, int expectedStatus) throws Exception {
        when(selections.chooseTargetRole(any())).thenThrow(
                new TargetRoleSelectionException(code, code.defaultMessage()));

        mvc.perform(put("/api/v1/employee/target-role-selection")
                        .header("Idempotency-Key", "error-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleId\":\"%s\"}".formatted(ROLE_ID)))
                .andExpect(status().is(expectedStatus))
                .andExpect(jsonPath("$.code").value(code.name()))
                .andExpect(jsonPath("$.message").value(code.defaultMessage()));
    }

    @Test
    void localSecurityPermitsGetAndCsrfLessPutButDeniesOtherMethods() throws Exception {
        when(selections.getCurrentSelection()).thenReturn(Optional.empty());
        when(selections.chooseTargetRole(any())).thenReturn(
                new TargetRoleSelectionResult(selection(), Disposition.UNCHANGED));

        mvc.perform(get("/api/v1/employee/target-role-selection"))
                .andExpect(status().isNoContent());
        mvc.perform(put("/api/v1/employee/target-role-selection")
                        .header("Idempotency-Key", "local-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleId\":\"%s\"}".formatted(ROLE_ID)))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/employee/target-role-selection"))
                .andExpect(status().isForbidden());
    }

    private static Stream<Arguments> applicationErrors() {
        return Stream.of(
                Arguments.of(Code.UNAUTHENTICATED, 401),
                Arguments.of(Code.FORBIDDEN, 403),
                Arguments.of(Code.ROLE_NOT_AVAILABLE, 404),
                Arguments.of(Code.IDEMPOTENCY_CONFLICT, 409),
                Arguments.of(Code.REQUEST_IN_PROGRESS, 409),
                Arguments.of(Code.STALE_SELECTION, 409),
                Arguments.of(Code.ASSESSMENT_IN_PROGRESS, 409),
                Arguments.of(Code.SELECTION_STATE_CONFLICT, 409),
                Arguments.of(Code.CATALOG_UNAVAILABLE, 503),
                Arguments.of(Code.DEPENDENCY_UNAVAILABLE, 503));
    }

    private static TargetRoleSelection selection() {
        return new TargetRoleSelection(
                SELECTION_ID,
                LEARNER_ID,
                ROLE_REFERENCE_ID,
                new TargetRoleSnapshot(
                        ROLE_ID, "JAVA_P3", "Java Developer",
                        CareerTrack.PROFESSIONAL, Seniority.P3),
                SELECTED_AT,
                null,
                7);
    }

    private static UUID uuid(long value) {
        return new UUID(0L, value);
    }
}
