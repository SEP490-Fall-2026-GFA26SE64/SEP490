package com.adaptlearngraph.pathway.api;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.adaptlearngraph.pathway.application.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.infrastructure.WorkspaceInitialPathwaySecurity;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Real MVC parsing and workspace SecurityFilterChain; actor/application ports are unit doubles. */
@WebMvcTest(controllers=InitialPathwayController.class,properties={"pathway.initial.enabled=true","assessment.baseline.workspace.enabled=true"})
@Import(WorkspaceInitialPathwaySecurity.class)
@ActiveProfiles({"local","workspace-baseline"})
class InitialPathwayApiBoundaryTest {
    @Autowired MockMvc mvc;
    @MockitoBean RoleGapPreview gaps;@MockitoBean InitialPathwayAdmission admission;
    @MockitoBean InitialPathwayReview review;@MockitoBean InitialPathwayView view;@MockitoBean Actors actors;
    static final UUID ID=new UUID(0,19);
    static final String PATH="/api/v1/expert/initial-pathways/"+ID;
    static final Actor EXPERT=new Actor(new UUID(0,101),new UUID(0,103),Role.DOMAIN_EXPERT);
    static final String EXPECTED="\"expectedRevision\":4,\"expectedContentHash\":\""+"a".repeat(64)+"\"";
    @BeforeEach void actor(){when(actors.require()).thenReturn(EXPERT);}
    @Test void R01_missingAuthenticationAndWrongRoleDenyBeforeApplicationRead() throws Exception {
        when(actors.require()).thenThrow(new Failure(401,"UNAUTHENTICATED"));
        mvc.perform(get(PATH)).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        doReturn(new Actor(EXPERT.organizationId(),EXPERT.accountId(),Role.EMPLOYEE)).when(actors).require();
        mvc.perform(get(PATH)).andExpect(status().isForbidden());verifyNoInteractions(review);
    }
    @ParameterizedTest @ValueSource(strings={"inclusions","exclusions","moves","removals","confirmation"})
    void R01_sessionCsrfIsMandatoryForEveryReviewMutation(String action) throws Exception {
        mvc.perform(post(PATH+"/"+action).header("Idempotency-Key","test-key").contentType("application/json").content("{"+EXPECTED+"}"))
                .andExpect(status().isForbidden());verifyNoInteractions(review);
    }
    @ParameterizedTest @ValueSource(strings={"organizationId","actorId","mastery","approved","order"})
    void R04_unknownProtectedFieldsRejectedByStrictParser(String field) throws Exception {
        mvc.perform(post(PATH+"/inclusions").with(csrf()).header("Idempotency-Key","test-key").contentType("application/json")
                .content("{"+EXPECTED+",\"moduleId\":\"M-A\",\""+field+"\":\"forged\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));verifyNoInteractions(review);
    }
    @Test void R04_missingKeyMalformedBodyNullAndOversizeRejected() throws Exception {
        mvc.perform(post(PATH+"/confirmation").with(csrf()).contentType("application/json").content("{"+EXPECTED+"}")).andExpect(status().isBadRequest());
        for(String body:List.of("null","{broken", " ".repeat(16385)))mvc.perform(post(PATH+"/confirmation").with(csrf()).header("Idempotency-Key","test-key").contentType("application/json").content(body)).andExpect(status().isBadRequest());
        verifyNoInteractions(review);
    }
    @Test void R03_moveMapsExactClientTupleAndRetainedOutcomeNoStore() throws Exception {
        var response=new Receipt(200,"body-hash","{\"pathwayId\":\""+ID+"\",\"revision\":5}");
        when(review.move(eq(ID),eq("move-key"),any())).thenReturn(response);
        mvc.perform(post(PATH+"/moves").with(csrf()).header("Idempotency-Key","move-key").contentType("application/json")
                .content("{"+EXPECTED+",\"moduleId\":\"M-B\",\"direction\":\"UP\",\"reason\":null}"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andExpect(jsonPath("$.revision").value(5));
        verify(review).move(ID,"move-key",new InitialPathwayReview.Move("M-B","UP",4L,"a".repeat(64),null));
    }
    @Test void R01_foreignOrUnassignedSafe404DoesNotExposeDetail() throws Exception {
        when(review.detail(ID)).thenThrow(new Failure(404,"PATHWAY_NOT_FOUND"));
        mvc.perform(get(PATH)).andExpect(status().isNotFound()).andExpect(header().string("Cache-Control","no-store"))
                .andExpect(jsonPath("$.code").value("PATHWAY_NOT_FOUND")).andExpect(jsonPath("$.revision").doesNotExist());
    }
    @Test void R11_adapterOutageMaps503AndSafeEnvelope() throws Exception {
        when(review.validate(ID)).thenThrow(new IllegalStateException("private adapter diagnostic"));
        mvc.perform(get(PATH+"/validation")).andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("DEPENDENCY_UNAVAILABLE"))
                .andExpect(jsonPath("$.retryable").value(true)).andExpect(jsonPath("$.message").doesNotExist());
    }
    @Test void E01_employeeOwnReadUsesServerActorAndNoStore() throws Exception {
        when(actors.require()).thenReturn(new Actor(EXPERT.organizationId(),new UUID(0,102),Role.EMPLOYEE));
        when(view.current()).thenReturn(new InitialPathwayView.View(null,List.of(),List.of(),false));
        mvc.perform(get("/api/v1/employee/pathway")).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
                .andExpect(jsonPath("$.modules").isEmpty());verify(view).current();
    }
}
