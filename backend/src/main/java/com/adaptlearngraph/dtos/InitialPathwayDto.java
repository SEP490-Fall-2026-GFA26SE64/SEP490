package com.adaptlearngraph.dtos;

/** Wire shapes of the initial-pathway command API. */
public final class InitialPathwayDto {
    private InitialPathwayDto() {
    }

    /** Retained command outcome: the HTTP status and the exact JSON body replayed to the client (never its hash). */
    public record OutcomeResponse(int status, String responseJson) {}
}