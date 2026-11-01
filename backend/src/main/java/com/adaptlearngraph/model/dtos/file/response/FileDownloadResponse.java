package com.adaptlearngraph.model.dtos.file.response;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/** Downloadable file returned as an HTTP attachment. */
public record FileDownloadResponse(String fileName, String mediaType, byte[] content) {
    public ResponseEntity<byte[]> toResponseEntity() {
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=" + fileName)
                .contentType(MediaType.parseMediaType(mediaType))
                .body(content);
    }
}
