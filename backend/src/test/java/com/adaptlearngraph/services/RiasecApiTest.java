package com.adaptlearngraph.services;
import com.adaptlearngraph.apis.RiasecController;
import com.adaptlearngraph.dtos.SaveJobPositionRequest;
import com.adaptlearngraph.entities.domain.*;
import com.adaptlearngraph.helper.JobPositionMappings;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class RiasecApiTest {
    ObjectMapper json=new ObjectMapper().findAndRegisterModules();
    @Test void generatedCatalogIdsAreScopedToOrganizationAndKeepTrustedWrites() throws Exception {
        var port=mock(GetJobPositionsUseCase.class);var mapper=new ModelMapper();new JobPositionMappings().register(mapper);
        var service=new JobPositionApplicationService(port,mapper,org->"MANAGER");
        when(port.saveChange(anyString(),any())).thenAnswer(call -> {
            JobPositionChange change=call.getArgument(1);
            assertThat(change.authorId()).isEqualTo("MANAGER");
            return new JobPosition(change.id(),change.code(),change.name(),4,"ACTIVE","v1",0,0);
        });
        var request=json.readValue("{\"code\":\"ENGINEER\",\"name\":\"Engineer\"}",SaveJobPositionRequest.class);
        var first=service.createJobPosition("ORG-A",request);
        var second=service.createJobPosition("ORG-B",request);
        assertThat(first.id()).isNotEqualTo(second.id());
        assertThat(service.createJobPosition("ORG-A",request).id()).isEqualTo(first.id());
        verify(port,never()).saveJobPosition(anyString(),any());
    }
    @Test void requestCannotChooseTenantActorOrCoerceFractionalAnswers() throws Exception {
        var service=mock(RiasecService.class);var mvc=MockMvcBuilders.standaloneSetup(new RiasecController(service,json)).build();
        for(String body:new String[]{"{\"editorId\":null,\"organizationId\":\"spoof\"}","{\"answers\":{\"R01\":1.2}}","{\"answers\":{\"R01\":\"2\"}}","{\"revision\":1.5}"})
            mvc.perform(put("/api/v1/employee/riasec/draft").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void allApiOperationsPropagateEmployeeAuthorization() throws Exception {
        var service=mock(RiasecService.class);when(service.view()).thenThrow(new RoleBaselineFlow.Failure(403,"FORBIDDEN"));
        var mvc=MockMvcBuilders.standaloneSetup(new RiasecController(service,json)).build();
        mvc.perform(get("/api/v1/employee/riasec")).andExpect(status().isForbidden()).andExpect(header().string("Cache-Control","no-store"));
    }
    @Test void catalogRequiresSixStrictIntegersOrSixExplicitNullsAndPreservesOmittedFields() throws Exception {
        var port=mock(GetJobPositionsUseCase.class);var mapper=new ModelMapper();new JobPositionMappings().register(mapper);
        var service=new JobPositionApplicationService(port,mapper,org->"MANAGER");
        when(port.saveChange(anyString(),any())).thenReturn(new JobPosition("J","J","Job",4,"ACTIVE","v1",0,0));
        service.updateJobPosition("ORG","J",json.readValue("{\"name\":\"Job\"}",SaveJobPositionRequest.class));
        var captor=org.mockito.ArgumentCaptor.forClass(JobPositionChange.class);verify(port).saveChange(eq("ORG"),captor.capture());
        assertThat(captor.getValue().interestProfile()).isNull();reset(port);
        String fields="\"interestRealistic\":%s,\"interestInvestigative\":%s,\"interestArtistic\":%s,\"interestSocial\":%s,\"interestEnterprising\":%s,\"interestConventional\":%s";
        for(String number:new String[]{"1.0","\"1\"","-1","41"}) {
            var r=json.readValue("{"+fields.formatted(number,number,number,number,number,number)+"}",SaveJobPositionRequest.class);
            assertThatThrownBy(()->service.updateJobPosition("ORG","J",r)).hasMessage("INVALID_RIASEC_PROFILE");
        }
        var partial=json.readValue("{\"interestRealistic\":20}",SaveJobPositionRequest.class);
        assertThatThrownBy(()->service.updateJobPosition("ORG","J",partial)).hasMessage("INVALID_RIASEC_PROFILE");
        verifyNoInteractions(port);
        when(port.saveChange(anyString(),any())).thenReturn(new JobPosition("J","J","Job",4,"ACTIVE","v1",0,0));
        for(String value:new String[]{"40","null"})service.updateJobPosition("ORG","J",json.readValue("{"+fields.formatted(value,value,value,value,value,value)+"}",SaveJobPositionRequest.class));
        verify(port,times(2)).saveChange(eq("ORG"),captor.capture());assertThat(captor.getValue().interestProfile()).isEmpty();
    }
}
