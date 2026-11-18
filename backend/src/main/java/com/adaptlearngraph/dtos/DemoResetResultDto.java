package com.adaptlearngraph.dtos;

import java.util.List;

/** Outcome of a demo data reset: what was removed and what was retained. */
public record DemoResetResultDto(int organizationsRemoved, int accountsRemoved, int registrationsRemoved, int relatedRowsRemoved,
        int graphNodesRemoved, int filesRemoved, int organizationsRetained, List<String> warnings) {}
