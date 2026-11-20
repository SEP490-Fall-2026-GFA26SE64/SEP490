package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.DemoResetResultDto;
import com.adaptlearngraph.repository.DemoResetStore;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Recycles a demo environment: keeps the seed organization and platform catalog, removes everything onboarded since. */
public class DemoResetService {
    private static final Logger log = LoggerFactory.getLogger(DemoResetService.class);

    private final DemoResetStore store;
    private final UUID retainedOrganization;

    public DemoResetService(DemoResetStore store, UUID retainedOrganization) {
        this.store = store;
        this.retainedOrganization = retainedOrganization;
    }

    public synchronized DemoResetResultDto reset() {
        var postgres = store.resetPostgres(retainedOrganization);
        List<String> warnings = new ArrayList<>();
        int nodes = 0;
        int files = 0;
        try {
            nodes = store.resetGraph(postgres.remainingOrganizations());
        } catch (RuntimeException failure) {
            log.warn("Demo reset could not clean the knowledge graph", failure);
            warnings.add("Knowledge graph cleanup failed; run the reset again.");
        }
        try {
            files = store.resetFiles(postgres.remainingOrganizations());
        } catch (Exception failure) {
            log.warn("Demo reset could not clean private learning files", failure);
            warnings.add("File storage cleanup failed; run the reset again.");
        }
        log.info("Demo reset removed {} organizations, {} accounts, {} graph nodes and {} files",
                postgres.organizations(), postgres.accounts(), nodes, files);
        return new DemoResetResultDto(postgres.organizations(), postgres.accounts(), postgres.registrations(), postgres.rows(),
                nodes, files, postgres.remainingOrganizations().size(), List.copyOf(warnings));
    }
}
