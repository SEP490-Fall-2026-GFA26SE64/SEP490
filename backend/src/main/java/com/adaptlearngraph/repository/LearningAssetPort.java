package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.LearningResources.Asset;

import java.io.InputStream;

public interface LearningAssetPort {
    Asset upload(
            String organizationId, String actorId, String filename, long size, InputStream input);
    default Asset uploadCertificate(String organizationId,String actorId,String filename,long size,InputStream input) {
        throw new UnsupportedOperationException("Private certificate uploads are unavailable");
    }
    default Asset uploadCertificate(String organizationId,String actorId,java.util.UUID retry,String filename,long size,InputStream input) {
        return uploadCertificate(organizationId,actorId,filename,size,input);
    }

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
