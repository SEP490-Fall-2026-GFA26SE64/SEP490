package com.adaptlearngraph.catalog.domain;

/**
 * Organization-wide grade code used for exact target-role discovery filtering.
 * The grade meaning remains specific to each job domain and role family.
 */
public enum Seniority {
    P1(CareerTrack.PROFESSIONAL),
    P2(CareerTrack.PROFESSIONAL),
    P3(CareerTrack.PROFESSIONAL),
    P4(CareerTrack.PROFESSIONAL),
    P5(CareerTrack.PROFESSIONAL),
    M3(CareerTrack.MANAGEMENT),
    M4(CareerTrack.MANAGEMENT);

    private final CareerTrack track;

    Seniority(CareerTrack track) {
        this.track = track;
    }

    public CareerTrack track() {
        return track;
    }

    public boolean supportsTrack(CareerTrack candidateTrack) {
        return track == candidateTrack;
    }
}
