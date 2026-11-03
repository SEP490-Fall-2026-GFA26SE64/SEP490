package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.LearningContentDto.AssetResponse;
import com.adaptlearngraph.dtos.LearningContentDto.ImportPreviewResponse;
import com.adaptlearngraph.dtos.LearningContentDto.LearningViewResponse;
import com.adaptlearngraph.dtos.LearningContentDto.LimitsRequest;
import com.adaptlearngraph.dtos.LearningContentDto.LimitsResponse;
import com.adaptlearngraph.dtos.LearningContentDto.NotificationResponse;
import com.adaptlearngraph.dtos.LearningContentDto.ProgressResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.DocumentResponse;
import com.adaptlearngraph.entities.domain.LearningResources.Asset;
import com.adaptlearngraph.entities.domain.LearningResources.Limits;
import com.adaptlearngraph.entities.domain.ModuleAuthoring;
import com.adaptlearngraph.repository.LearningAssetPort;
import com.adaptlearngraph.repository.ModuleAuthoringPort;
import com.adaptlearngraph.services.ModuleAuthoringService.Failure;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Objects;
import org.modelmapper.ModelMapper;
import org.springframework.core.io.InputStreamSource;

/**
 * DTO boundary of the learning content API. The acting staff member and organization always come from the trusted
 * module session; upload limit changes never take audit identity from the request body.
 */
public class LearningContentApplicationService {
    /** An accessible asset whose bytes are streamed lazily by the HTTP adapter. */
    public static final class AssetContent {
        private final Asset asset;
        private final LearningAssetPort files;

        private AssetContent(Asset asset, LearningAssetPort files) {
            this.asset = asset;
            this.files = files;
        }

        public String mediaType() {
            return asset.mediaType();
        }

        public long byteSize() {
            return asset.byteSize();
        }

        public InputStream open(long offset, long length) {
            return files.open(asset, offset, length);
        }
    }

    private final LearningContentService content;
    private final ModuleAuthoringPort modules;
    private final LearningAssetPort files;
    private final LearningImportUseCase imports;
    private final ModelMapper mapper;

    public LearningContentApplicationService(LearningContentService content, ModuleAuthoringPort modules,
            LearningAssetPort files, LearningImportUseCase imports, ModelMapper mapper) {
        this.content = content;
        this.modules = modules;
        this.files = files;
        this.imports = imports;
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public byte[] importTemplate() {
        return imports.template();
    }

    public ImportPreviewResponse previewImport(String filename, long size, InputStream input) {
        return map(imports.preview(filename, size, input), ImportPreviewResponse.class);
    }

    public ImportPreviewResponse validateImport(String id) {
        return map(imports.validate(id), ImportPreviewResponse.class);
    }

    public List<DocumentResponse> commitImport(String id, boolean confirmOwnedDuplicates) {
        return list(imports.commit(id, confirmOwnedDuplicates), DocumentResponse.class);
    }

    public LimitsResponse limits() {
        return map(content.limits(), LimitsResponse.class);
    }

    public LimitsResponse limits(LimitsRequest input) {
        var next = new Limits(input.videoBytes(), input.imageBytes(), input.zipBytes(), input.version(), null, null);
        return map(content.limits(next), LimitsResponse.class);
    }

    /** Expert-only upload; the stream is opened only after the session is authorized. */
    public AssetResponse upload(InputStreamSource file, String filename, long size) throws IOException {
        var actor = modules.actor();
        if (!actor.expert()) throw new Failure(403, "Expert upload required");
        try (var input = file.getInputStream()) {
            return map(files.upload(actor.organizationId(), actor.id(), filename, size, input), AssetResponse.class);
        }
    }

    public AssetContent asset(String id) {
        return new AssetContent(content.accessibleAsset(id), files);
    }

    public void verifyVideo(String provider, String url, double durationSeconds, boolean played) {
        var actor = modules.actor();
        if (!actor.expert() && !actor.manager()) throw new Failure(403, "Staff preview required");
        if (!played) throw new Failure(400, "Play this video in preview first");
        files.verifyExternal(actor.organizationId(), actor.id(), provider, url, durationSeconds);
    }

    public String render(String body, String format) {
        var actor = modules.actor();
        if (!actor.expert() && !actor.manager() && !actor.roles().contains("EMPLOYEE"))
            throw new Failure(403, "Learning access required");
        ModuleAuthoring.text(body, "body", 500000);
        return format.equals("MARKDOWN") ? files.renderMarkdown(body) : files.sanitizedHtml(body);
    }

    public LearningViewResponse view(String id, boolean start) {
        return map(content.view(id, start), LearningViewResponse.class);
    }

    public ProgressResponse progress(String id, String lessonId, double positionSeconds, Double segmentStart,
            Double segmentEnd, boolean reachedEnd, boolean complete, int revision) {
        return map(content.progress(id, lessonId, positionSeconds, segmentStart, segmentEnd, reachedEnd, complete, revision),
                ProgressResponse.class);
    }

    public LearningViewResponse switchVersion(String id, int revision) {
        return map(content.switchVersion(id, revision), LearningViewResponse.class);
    }

    public void issue(String id, String lessonId, String detail, String commandId) {
        content.issue(id, lessonId, detail, commandId);
    }

    public List<NotificationResponse> notifications() {
        return list(content.notifications(), NotificationResponse.class);
    }

    public void read(String id) {
        content.read(id);
    }

    private <D> D map(Object source, Class<D> type) {
        return source == null ? null : mapper.map(source, type);
    }

    private <D> List<D> list(List<?> source, Class<D> type) {
        return source == null ? null : source.stream().map(item -> map(item, type)).toList();
    }
}