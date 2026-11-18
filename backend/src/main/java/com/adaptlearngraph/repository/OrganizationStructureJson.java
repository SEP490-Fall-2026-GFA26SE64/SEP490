package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.OrganizationStructure;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

/** JSON form of an imported organization structure as stored in platform.registration_org_structure. */
final class OrganizationStructureJson {
    private static final ObjectMapper JSON = new ObjectMapper().disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

    private OrganizationStructureJson() {
    }

    static String write(OrganizationStructure structure) {
        try {
            return JSON.writeValueAsString(structure);
        } catch (JsonProcessingException invalid) {
            throw new IllegalStateException("Organization structure cannot be serialized", invalid);
        }
    }

    static OrganizationStructure read(String json) {
        try {
            return JSON.readValue(json, OrganizationStructure.class);
        } catch (JsonProcessingException invalid) {
            throw new IllegalStateException("Stored organization structure cannot be read", invalid);
        }
    }
}
