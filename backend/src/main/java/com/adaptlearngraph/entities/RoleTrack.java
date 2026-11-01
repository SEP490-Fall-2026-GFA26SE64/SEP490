package com.adaptlearngraph.entities;

public enum RoleTrack {
    PROFESSIONAL,
    MANAGEMENT;

    public static RoleTrack fromString(String track) {
        if (track == null || track.isBlank()) {
            return PROFESSIONAL;
        }
        return RoleTrack.valueOf(track.trim().toUpperCase());
    }
}
