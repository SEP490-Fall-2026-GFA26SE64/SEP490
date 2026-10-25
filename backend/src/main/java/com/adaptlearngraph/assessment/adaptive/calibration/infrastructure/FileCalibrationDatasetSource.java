package com.adaptlearngraph.assessment.adaptive.calibration.infrastructure;

import com.adaptlearngraph.assessment.adaptive.calibration.application.CalibrationPorts.*;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

/** Optional server-owned registry, not a request-controlled file/URI resolver. No registration/default dataset. */
public final class FileCalibrationDatasetSource implements DatasetSource {
    private final Map<Scope,Map<String,Path>> references;
    private final CalibrationJson json;
    public FileCalibrationDatasetSource(Map<Scope,Map<String,Path>> references,CalibrationJson json) {
        this.references=references.entrySet().stream().collect(java.util.stream.Collectors.toUnmodifiableMap(Map.Entry::getKey,e->Map.copyOf(e.getValue())));
        this.json=java.util.Objects.requireNonNull(json);
    }
    @Override public Dataset load(Grant grant,String reference,String expectedHash) {
        Path path=references.getOrDefault(grant.scope(),Map.of()).get(reference);
        if (path==null) throw new Failure(Code.FORBIDDEN);
        try (var stream=Files.newInputStream(path)) {
            byte[] bytes=stream.readNBytes(67_108_865);
            if (bytes.length>67_108_864) throw new Failure(Code.RESOURCE_LIMIT);
            if (!CalibrationJson.bytesHash(bytes).equals(expectedHash)) throw new Failure(Code.CONFLICT);
            json.boundTokens(bytes);
            return json.read(new String(bytes,java.nio.charset.StandardCharsets.UTF_8),Dataset.class);
        } catch (java.io.IOException unavailable) { throw new Failure(Code.DEPENDENCY_UNAVAILABLE); }
    }
}
