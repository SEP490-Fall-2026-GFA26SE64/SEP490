package com.adaptlearngraph.shared.infrastructure;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

/** Fixed shared-development fixture; never a client-selected or production identity. */
public final class DevelopmentWorkspace {
    public static final UUID ORGANIZATION = UUID.fromString("00000000-0000-0000-0000-000000000001");
    public static final String OCCUPATION = "OCC-15-1212.00";
    private DevelopmentWorkspace() {}
    public static UUID id(String name) {
        return UUID.nameUUIDFromBytes(("WORKSPACE_DEVELOPMENT:" + name).getBytes(StandardCharsets.UTF_8));
    }
    public static boolean enabled(Environment environment) {
        return environment.acceptsProfiles(Profiles.of("local & workspace-development & !prod"))
                && environment.getProperty("workspace.development-fixtures.enabled", Boolean.class, false);
    }
    public static boolean catalog(boolean enabled, UUID organization, String occupation) {
        return enabled && ORGANIZATION.equals(organization) && (OCCUPATION.equals(occupation) || "OCC-15-1252.00".equals(occupation));
    }
}
