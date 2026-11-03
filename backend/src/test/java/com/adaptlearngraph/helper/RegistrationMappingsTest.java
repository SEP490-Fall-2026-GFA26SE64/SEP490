package com.adaptlearngraph.helper;

import static org.assertj.core.api.Assertions.assertThat;

import com.adaptlearngraph.dtos.RegistrationDto.CompletionResponse;
import com.adaptlearngraph.dtos.RegistrationDto.EnrollmentResponse;
import com.adaptlearngraph.dtos.RegistrationDto.FieldsResponse;
import com.adaptlearngraph.dtos.RegistrationDto.ProofRequest;
import com.adaptlearngraph.dtos.RegistrationDto.SignInRequest;
import com.adaptlearngraph.dtos.RegistrationDto.SignupRequest;
import com.adaptlearngraph.dtos.RegistrationDto.ViewResponse;
import com.adaptlearngraph.entities.domain.RegistrationFields;
import com.adaptlearngraph.services.RegistrationUseCase;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;

class RegistrationMappingsTest {
    private static final Pattern SENSITIVE = Pattern.compile("(?i).*(password|hash|encrypted|token|totp|actor|session|csrf).*");
    private final ModelMapper mapper = ModelMapperFactory.create(List.of(new RegistrationMappings()));
    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();

    @Test
    void mapsThePublicRegistrationViewOnly() throws Exception {
        UUID registrationId = UUID.randomUUID();
        Instant resend = Instant.parse("2026-11-03T10:15:30Z");
        Instant verified = Instant.parse("2026-11-03T10:20:00Z");
        Instant completed = Instant.parse("2026-11-03T10:30:00Z");
        var fields = new RegistrationFields("Acme Learning", "acme-learning", "Software Engineering & AI",
                "21 - 50 employees", "Ada Admin", "Ada@Example.test");
        var view = new RegistrationUseCase.View(registrationId, "COMPLETE", "ada@example.test", fields, "SENT",
                resend, verified, completed);

        ViewResponse response = mapper.map(view, ViewResponse.class);

        assertThat(response).isEqualTo(new ViewResponse(registrationId, "COMPLETE", "ada@example.test",
                new FieldsResponse("Acme Learning", "acme-learning", "Software Engineering & AI", "21 - 50 employees",
                        "Ada Admin", "ada@example.test"),
                "SENT", resend, verified, completed));
        assertNoSensitiveComponents(ViewResponse.class);
        assertNoSensitiveComponents(FieldsResponse.class);
        assertThat(json.writeValueAsString(response))
                .contains("\"registrationId\":\"" + registrationId + "\"", "\"adminEmail\":\"ada@example.test\"")
                .doesNotContainIgnoringCase("password").doesNotContainIgnoringCase("secret");
    }

    @Test
    void keepsNullFieldsAndTimestamps() {
        var view = new RegistrationUseCase.View(null, "PASSWORD_PROVEN", "ada@example.test", null, null, null, null, null);

        assertThat(mapper.map(view, ViewResponse.class))
                .isEqualTo(new ViewResponse(null, "PASSWORD_PROVEN", "ada@example.test", null, null, null, null, null));
    }

    @Test
    void enrollmentExposesOnlyTheManualSecretAndNeverTheEncryptedSecret() throws Exception {
        String encrypted = "v1:ENCRYPTED-TOTP-SECRET-0f9e8d7c";
        var enrollment = new RegistrationUseCase.Enrollment(encrypted, "JBSWY3DPEHPK3PXP", "ada@example.test");

        EnrollmentResponse response = mapper.map(enrollment, EnrollmentResponse.class);

        assertThat(response.manualSecret()).isEqualTo("JBSWY3DPEHPK3PXP");
        assertThat(response.email()).isEqualTo("ada@example.test");
        assertThat(componentNames(EnrollmentResponse.class)).containsExactly("manualSecret", "email");
        assertNoSensitiveComponents(EnrollmentResponse.class);
        assertThat(json.writeValueAsString(response)).doesNotContain(encrypted).doesNotContain("encryptedSecret");
        assertThat(response.toString()).doesNotContain("JBSWY3DPEHPK3PXP");
    }

    @Test
    void requestAndCompletionBodiesRedactSecretsFromToString() {
        var signup = new SignupRequest("Acme", null, null, null, "Ada", "ada@example.test", "correct horse battery", List.of());
        var signIn = new SignInRequest("ada@example.test", "correct horse battery");
        var proof = new ProofRequest("123456");
        var completion = new CompletionResponse(null, List.of("RECOVERY-CODE-1"));

        assertThat(signup.toString()).doesNotContain("correct horse battery");
        assertThat(signIn.toString()).doesNotContain("correct horse battery");
        assertThat(proof.toString()).doesNotContain("123456");
        assertThat(completion.toString()).doesNotContain("RECOVERY-CODE-1");
        assertNoSensitiveComponents(CompletionResponse.class);
    }

    private static void assertNoSensitiveComponents(Class<? extends Record> type) {
        assertThat(componentNames(type)).noneMatch(name -> SENSITIVE.matcher(name).matches());
    }

    private static List<String> componentNames(Class<? extends Record> type) {
        return Arrays.stream(type.getRecordComponents()).map(component -> component.getName()).toList();
    }
}
