package com.adaptlearngraph.helper;

import java.util.regex.Pattern;

/** Builds browser links into an organization workspace: {@code /workspace/{slug}/...}. */
public final class WorkspaceLinks {
    private static final Pattern SLUG = Pattern.compile("[a-z0-9][a-z0-9-]{1,61}[a-z0-9]");

    private WorkspaceLinks() {
    }

    /**
     * Prefixes an in-workspace path with the organization slug. Without a valid slug the legacy path is returned;
     * the frontend redirects it to the signed-in member's own workspace.
     */
    public static String path(String slug, String workspacePath) {
        if (workspacePath == null || !workspacePath.startsWith("/")) throw new IllegalArgumentException("Absolute path required");
        return slug != null && SLUG.matcher(slug).matches() ? "/workspace/" + slug + workspacePath : workspacePath;
    }
}
