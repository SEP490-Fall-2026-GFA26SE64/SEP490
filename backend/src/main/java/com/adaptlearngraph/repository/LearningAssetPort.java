package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.LearningResources.Asset;

import java.io.InputStream;

public interface LearningAssetPort {
    Asset upload(
            String organizationId, String actorId, String filename, long size, InputStream input);

    InputStream open(Asset asset, long offset, long length);

    String renderMarkdown(String markdown);

    String sanitizedHtml(String html);

    void verifyExternal(
            String organizationId,
            String actorId,
            String provider,
            String url,
            double durationSeconds);
}
