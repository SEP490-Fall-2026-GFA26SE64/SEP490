package com.adaptlearngraph.helper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class WorkspaceLinksTest {
    @Test void prefixesWorkspacePathsWithAValidSlug() {
        assertEquals("/workspace/acme-learning/admin/subscription/payment-result",
                WorkspaceLinks.path("acme-learning", "/admin/subscription/payment-result"));
        assertEquals("/workspace/technova/employee/modules/M%201", WorkspaceLinks.path("technova", "/employee/modules/M%201"));
    }

    @Test void fallsBackToTheLegacyPathWithoutAUsableSlug() {
        assertEquals("/expert/modules", WorkspaceLinks.path(null, "/expert/modules"));
        assertEquals("/expert/modules", WorkspaceLinks.path("../evil", "/expert/modules"));
        assertEquals("/expert/modules", WorkspaceLinks.path("UPPER", "/expert/modules"));
        assertThrows(IllegalArgumentException.class, () -> WorkspaceLinks.path("acme", "relative"));
    }
}
