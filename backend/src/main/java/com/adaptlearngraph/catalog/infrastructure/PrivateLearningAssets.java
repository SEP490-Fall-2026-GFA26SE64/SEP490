package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.ModuleAuthoringService.Failure;
import com.adaptlearngraph.catalog.application.port.out.*;
import com.adaptlearngraph.catalog.domain.LearningContent;
import com.adaptlearngraph.catalog.domain.LearningResources.Asset;

import io.minio.*;

import org.commonmark.ext.gfm.tables.TablesExtension;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.HtmlRenderer;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.jdbc.core.JdbcTemplate;

import java.io.*;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

public final class PrivateLearningAssets implements LearningAssetPort {
    private final MinioClient minio;
    private final String bucket;
    private final LearningContentPort content;
    private final JdbcTemplate jdbc;

    public PrivateLearningAssets(
            String endpoint,
            String key,
            String secret,
            String bucket,
            LearningContentPort content,
            JdbcTemplate jdbc) {
        this.minio = MinioClient.builder().endpoint(endpoint).credentials(key, secret).build();
        this.bucket = bucket;
        this.content = content;
        this.jdbc = jdbc;
    }

    @Override
    public Asset upload(String org, String actor, String filename, long size, InputStream input) {
        var limits = content.limits();
        String name = filename == null ? "" : Path.of(filename).getFileName().toString();
        String ext = name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        if (!Set.of("mp4", "jpg", "jpeg", "png", "webp").contains(ext))
            throw new Failure(400, "Upload MP4, JPG, PNG or WebP files only");
        long max = ext.equals("mp4") ? limits.videoBytes() : limits.imageBytes();
        if (size <= 0 || size > max)
            throw new Failure(413, "File exceeds the configured upload limit");
        Path temp = null;
        try {
            temp = Files.createTempFile("learning-upload-", "." + ext);
            long count = 0;
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (var out = Files.newOutputStream(temp)) {
                byte[] buffer = new byte[65536];
                int n;
                while ((n = input.read(buffer)) != -1) {
                    count += n;
                    if (count > max) throw new Failure(413, "File exceeds upload limit");
                    out.write(buffer, 0, n);
                    digest.update(buffer, 0, n);
                }
            }
            if (count != size) throw new Failure(400, "Incomplete upload");
            byte[] signature;
            try (var in = Files.newInputStream(temp)) {
                signature = in.readNBytes(16);
            }
            String mime;
            Double duration = null;
            if (ext.equals("mp4")) {
                mime = "video/mp4";
                duration = mp4Duration(temp);
            } else if (signature.length >= 8
                    && signature[0] == (byte) 0x89
                    && new String(signature, 1, 3, java.nio.charset.StandardCharsets.US_ASCII)
                            .equals("PNG")
                    && ext.equals("png")) mime = "image/png";
            else if (signature.length >= 3
                    && signature[0] == (byte) 0xff
                    && signature[1] == (byte) 0xd8
                    && signature[2] == (byte) 0xff
                    && Set.of("jpg", "jpeg").contains(ext)) mime = "image/jpeg";
            else if (signature.length >= 12
                    && new String(signature, 0, 4, java.nio.charset.StandardCharsets.US_ASCII)
                            .equals("RIFF")
                    && new String(signature, 8, 4, java.nio.charset.StandardCharsets.US_ASCII)
                            .equals("WEBP")
                    && ext.equals("webp")) mime = "image/webp";
            else throw new Failure(400, "File content does not match its image format");
            if (!minio.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) {
                try {
                    minio.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                } catch (Exception e) {
                    if (!minio.bucketExists(BucketExistsArgs.builder().bucket(bucket).build()))
                        throw e;
                }
            }
            String id = UUID.randomUUID().toString();
            String object = org + "/" + id + "." + ext;
            minio.uploadObject(
                    UploadObjectArgs.builder()
                            .bucket(bucket)
                            .object(object)
                            .filename(temp.toString())
                            .contentType(mime)
                            .build());
            Asset asset =
                    new Asset(
                            id,
                            org,
                            actor,
                            object,
                            name,
                            mime,
                            count,
                            HexFormat.of().formatHex(digest.digest()),
                            duration,
                            Instant.now().toString());
            content.asset(asset);
            return asset;
        } catch (Failure e) {
            throw e;
        } catch (Exception e) {
            throw new Failure(503, "Cannot store this file. Retry the upload.");
        } finally {
            if (temp != null)
                try {
                    Files.deleteIfExists(temp);
                } catch (IOException ignored) {
                }
        }
    }

    /** Read movie duration and verify an AVC video track without buffering a whole video. */
    static double mp4Duration(Path file) throws IOException {
        try (RandomAccessFile in = new RandomAccessFile(file.toFile(), "r")) {
            in.seek(4);
            byte[] type = new byte[4];
            in.readFully(type);
            if (!new String(type, java.nio.charset.StandardCharsets.US_ASCII).equals("ftyp"))
                throw new Failure(400, "Use a browser-playable MP4 with an ftyp header");
            double[] info = {0, 0};
            scan(in, 0, in.length(), info, 0);
            if (info[0] <= 0 || info[0] > 604800 || info[1] == 0)
                throw new Failure(
                        400,
                        "Use an H.264 MP4 with a valid duration; automatic conversion is not"
                            + " supported");
            return info[0];
        }
    }

    private static void scan(RandomAccessFile in, long start, long end, double[] info, int depth)
            throws IOException {
        if (depth > 10) throw new Failure(400, "Invalid MP4 structure");
        for (long pos = start; pos + 8 <= end; ) {
            in.seek(pos);
            long size = Integer.toUnsignedLong(in.readInt());
            byte[] bytes = new byte[4];
            in.readFully(bytes);
            String type = new String(bytes, java.nio.charset.StandardCharsets.US_ASCII);
            long header = 8;
            if (size == 1) {
                size = in.readLong();
                header = 16;
            }
            if (size == 0) size = end - pos;
            if (size < header || pos + size > end) throw new Failure(400, "Invalid MP4 box");
            if (type.equals("mvhd")) {
                int version = in.readUnsignedByte();
                in.skipBytes(3);
                in.skipBytes(version == 1 ? 16 : 8);
                long scale = Integer.toUnsignedLong(in.readInt());
                long duration = version == 1 ? in.readLong() : Integer.toUnsignedLong(in.readInt());
                if (scale > 0) info[0] = (double) duration / scale;
            }
            if (type.equals("stsd")) {
                in.skipBytes(4);
                int count = in.readInt();
                for (int n = 0; n < count && n < 100; n++) {
                    long at = in.getFilePointer();
                    long entry = Integer.toUnsignedLong(in.readInt());
                    in.readFully(bytes);
                    if (new String(bytes, java.nio.charset.StandardCharsets.US_ASCII)
                            .equals("avc1")) info[1] = 1;
                    if (entry < 8 || at + entry > pos + size) break;
                    in.seek(at + entry);
                }
            }
            if (Set.of("moov", "trak", "mdia", "minf", "stbl").contains(type))
                scan(in, pos + header, pos + size, info, depth + 1);
            pos += size;
        }
    }

    @Override
    public InputStream open(Asset asset, long offset, long length) {
        try {
            return minio.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucket)
                            .object(asset.objectKey())
                            .offset(offset)
                            .length(length)
                            .build());
        } catch (Exception e) {
            throw new Failure(503, "File is temporarily unavailable");
        }
    }

    @Override
    public String renderMarkdown(String markdown) {
        var extensions = List.of(TablesExtension.create());
        return sanitizedHtml(
                HtmlRenderer.builder()
                        .extensions(extensions)
                        .escapeHtml(true)
                        .sanitizeUrls(true)
                        .build()
                        .render(Parser.builder().extensions(extensions).build().parse(markdown)));
    }

    @Override
    public String sanitizedHtml(String html) {
        String clean =
                Jsoup.clean(
                        html,
                        Safelist.relaxed()
                                .addTags("pre", "code", "hr")
                                .addAttributes("th", "colspan", "rowspan")
                                .addAttributes("td", "colspan", "rowspan")
                                .removeProtocols("a", "href", "ftp")
                                .removeProtocols("img", "src", "http", "https"));
        var document = Jsoup.parseBodyFragment(clean);
        document.select("img")
                .forEach(
                        image -> {
                            if (!image.attr("src")
                                    .matches("/api/v1/module-management/assets/[0-9a-fA-F-]{36}"))
                                image.remove();
                        });
        document.select("a").attr("rel", "noopener noreferrer");
        return document.body().html();
    }

    @Override
    public void verifyExternal(
            String org, String actor, String provider, String url, double seconds) {
        LearningContent.validateVideoUrl(provider, url);
        if (!Double.isFinite(seconds) || seconds <= 0 || seconds > 604800)
            throw new Failure(400, "Invalid video duration");
        ExternalLearningVideo.check(provider, url);
        jdbc.update(
                "INSERT INTO platform.learning_video_verification VALUES (?,?,?, ?,now()) ON"
                    + " CONFLICT(organization_id,actor_id,video_url) DO UPDATE SET"
                    + " duration_seconds=EXCLUDED.duration_seconds,verified_at=now()",
                org,
                actor,
                url,
                seconds);
    }
}
