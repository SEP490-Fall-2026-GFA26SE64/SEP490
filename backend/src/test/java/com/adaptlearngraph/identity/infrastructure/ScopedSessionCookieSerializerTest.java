package com.adaptlearngraph.identity.infrastructure;

import static org.junit.jupiter.api.Assertions.*;

import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.session.web.http.CookieSerializer;

class ScopedSessionCookieSerializerTest {
    @Test
    void registrationAndWorkspaceRequestsDoNotAcceptEachOthersSessionCookie() {
        var serializer = new ScopedSessionCookieSerializer(true);
        var registration = request("/api/v1/registration/current");
        var workspace = request("/api/v1/workspace-auth/current");
        assertEquals(List.of("registration"), serializer.readCookieValues(registration));
        assertEquals(List.of("workspace"), serializer.readCookieValues(workspace));
        workspace.setCookies(new Cookie("REGISTRATION_SESSION", encoded("registration")));
        assertTrue(serializer.readCookieValues(workspace).isEmpty());
    }

    @Test
    void preservesRestrictedRegistrationCookieAndUsesSecureWorkspaceCookie() {
        var serializer = new ScopedSessionCookieSerializer(true);
        var registration = new MockHttpServletResponse();
        serializer.writeCookieValue(new CookieSerializer.CookieValue(request("/api/v1/registration/sign-in"),
                registration, "test-session"));
        assertTrue(registration.getHeader("Set-Cookie").startsWith("REGISTRATION_SESSION="));
        assertTrue(registration.getHeader("Set-Cookie").contains("Path=/api/v1/registration"));
        var workspace = new MockHttpServletResponse();
        serializer.writeCookieValue(new CookieSerializer.CookieValue(request("/api/v1/workspace-auth/sign-in"),
                workspace, "test-session"));
        String cookie = workspace.getHeader("Set-Cookie");
        assertTrue(cookie.startsWith("WORKSPACE_SESSION="));
        assertTrue(cookie.contains("Path=/api/v1"));
        assertTrue(cookie.contains("HttpOnly"));
        assertTrue(cookie.contains("Secure"));
        assertTrue(cookie.contains("SameSite=Lax"));
    }

    @Test
    void handoffReadsRegistrationAuthorityButWritesWorkspaceSession() {
        var serializer = new ScopedSessionCookieSerializer(true);
        var request = request("/api/v1/registration/workspace-session");
        assertEquals(List.of("registration"), serializer.readCookieValues(request));
        var response = new MockHttpServletResponse();
        serializer.writeCookieValue(new CookieSerializer.CookieValue(request, response, "new-session"));
        assertTrue(response.getHeader("Set-Cookie").startsWith("WORKSPACE_SESSION="));
    }

    private static MockHttpServletRequest request(String path) {
        var request = new MockHttpServletRequest("GET", path);
        request.setCookies(new Cookie("REGISTRATION_SESSION", encoded("registration")),
                new Cookie("WORKSPACE_SESSION", encoded("workspace")));
        return request;
    }

    private static String encoded(String value) {
        return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }
}
