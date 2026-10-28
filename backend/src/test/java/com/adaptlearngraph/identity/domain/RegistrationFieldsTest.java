package com.adaptlearngraph.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class RegistrationFieldsTest {
    @Test
    void preservesOptionalNullsAndNormalizesIdentity() {
        var fields = fields("  Acme Learning  ", "  Acme-Team ", null, "");
        assertThat(fields.organizationName()).isEqualTo("Acme Learning");
        assertThat(fields.subdomain()).isEqualTo("acme-team");
        assertThat(fields.industry()).isNull();
        assertThat(fields.headcount()).isNull();
        assertThat(fields.adminEmail()).isEqualTo("owner@example.test");
    }

    @Test
    void generatesBoundedSlugWithFallbackAndStableSuffix() {
        assertThat(fields("Acme Learning", null, null, null).generatedSlug("k7p4m2"))
                .isEqualTo("acme-learning-k7p4m2");
        assertThat(fields("\u4f01\u696d", null, null, null).generatedSlug("k7p4m2"))
                .isEqualTo("workspace-k7p4m2");
        assertThat(fields("a".repeat(200), null, null, null).generatedSlug("k7p4m2"))
                .hasSize(63);
    }

    @Test
    void rejectsInvalidAndReservedSuppliedSlugs() {
        for (String slug : new String[]{"a", "ab", "-abc", "abc-", "www", "admin", "a".repeat(64), "has space"}) {
            assertThatThrownBy(() -> fields("Acme", slug, null, null))
                    .isInstanceOf(RegistrationFailure.class)
                    .extracting("field").isEqualTo("subdomain");
        }
    }

    @Test
    void acceptsEveryDropdownValueAndRejectsFabricatedDefaults() {
        for (String industry : RegistrationFields.INDUSTRIES) {
            for (String headcount : RegistrationFields.HEADCOUNTS) {
                var fields = fields("Acme", null, industry, headcount);
                assertThat(fields.industry()).isEqualTo(industry);
                assertThat(fields.headcount()).isEqualTo(headcount);
            }
        }
        assertThatThrownBy(() -> fields("Acme", null, null, "50 - 200 employees"))
                .isInstanceOf(RegistrationFailure.class);
    }

    @Test
    void validatesPasswordAtBothBoundariesWithoutTrimming() {
        RegistrationFields.validatePassword("a".repeat(12));
        RegistrationFields.validatePassword("a".repeat(128));
        RegistrationFields.validatePassword("  password  ");
        for (String password : new String[]{"", "a".repeat(11), "a".repeat(129)}) {
            assertThatThrownBy(() -> RegistrationFields.validatePassword(password))
                    .isInstanceOf(RegistrationFailure.class);
        }
    }

    @Test
    void rejectsInvalidEmailAndRequiredFields() {
        for (String email : new String[]{"", "x", "x@@example.test", ".x@example.test", "x..y@example.test"}) {
            assertThatThrownBy(() -> new RegistrationFields("Acme", null, null, null, "Owner", email))
                    .isInstanceOf(RegistrationFailure.class);
        }
        assertThatThrownBy(() -> fields(" ", null, null, null)).isInstanceOf(RegistrationFailure.class);
    }

    private static RegistrationFields fields(String name, String slug, String industry, String headcount) {
        return new RegistrationFields(name, slug, industry, headcount, "Owner", " Owner@Example.Test ");
    }
}
