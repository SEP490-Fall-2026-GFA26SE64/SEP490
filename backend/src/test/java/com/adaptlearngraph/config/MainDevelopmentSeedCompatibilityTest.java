package com.adaptlearngraph.config;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
final class MainDevelopmentSeedCompatibilityTest {
    @Test void originalSecurityAndSeModelPinsRemainUnchanged() {
        assertEquals("c8762ca3b871f085ed09e28e72f1102def67de73e485699226fbdab6aff8651d",MainDevelopmentBankSeed.securityTechnicalHash());
        assertEquals("ea7fddf200acb4884468cbe7bc80c379c2d02f3a6d13179fe9ede72e87fc7821",MainDevelopmentBankSeed.seTechnicalHash());
    }
    @Test void securityTechnicalProvenanceKeepsItsPersistedPinAfterWireRename() {
        assertEquals("a568862528dad99c9c010cc360fbf5d551265f49c677594d0cd697d98b74c2bf",MainDevelopmentBankSeed.projectionHash("OCC-15-1212.00"));
        var manifest=MainDevelopmentBankSeed.projectedManifest("OCC-15-1212.00");
        assertEquals("OCC-15-1212.00",manifest.path("jobPositionId").asText());
        assertFalse(manifest.has("occupationId"));
    }
}
