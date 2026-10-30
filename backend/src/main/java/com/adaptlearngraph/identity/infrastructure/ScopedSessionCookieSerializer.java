package com.adaptlearngraph.identity.infrastructure;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

public final class ScopedSessionCookieSerializer implements CookieSerializer {
    private final CookieSerializer registration;
    private final CookieSerializer workspace;

    public ScopedSessionCookieSerializer(boolean secure) {
        registration = cookie("REGISTRATION_SESSION", "/api/v1/registration", secure);
        workspace = cookie("WORKSPACE_SESSION", "/api/v1", secure);
    }

    @Override
    public List<String> readCookieValues(HttpServletRequest request) {
        return (registrationRequest(request) ? registration : workspace).readCookieValues(request);
    }

    @Override
    public void writeCookieValue(CookieValue value) {
        boolean exchange = value.getRequest().getRequestURI().equals("/api/v1/registration/workspace-session");
        (registrationRequest(value.getRequest()) && !exchange ? registration : workspace).writeCookieValue(value);
    }

    private static boolean registrationRequest(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.equals("/api/v1/registration") || path.startsWith("/api/v1/registration/");
    }

    private static CookieSerializer cookie(String name, String path, boolean secure) {
        var serializer = new DefaultCookieSerializer();
        serializer.setCookieName(name);
        serializer.setCookiePath(path);
        serializer.setUseHttpOnlyCookie(true);
        serializer.setUseSecureCookie(secure);
        serializer.setSameSite("Lax");
        return serializer;
    }
}
