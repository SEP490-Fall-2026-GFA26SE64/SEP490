package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.ModuleAuthoringService.Failure;
import com.adaptlearngraph.catalog.domain.LearningContent;

import java.net.*;
import java.net.http.*;
import java.time.Duration;

/** Fixed provider endpoints only; never fetch a user-selected host or follow redirects. */
final class ExternalLearningVideo {
    private static final HttpClient HTTP =
            HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(5))
                    .followRedirects(HttpClient.Redirect.NEVER)
                    .build();

    private ExternalLearningVideo() {}

    static String metadataUrl(String provider, String url) {
        if (!provider.equals("VIMEO")) return url;
        URI parsed = URI.create(url);
        String[] parts = parsed.getPath().split("/");
        int index = -1;
        for (int i = 0; i < parts.length; i++)
            if (parts[i].matches("\\d+")) {
                index = i;
                break;
            }
        if (index < 0) throw new Failure(400, "Use a Vimeo link containing its video ID");
        String hash = null;
        if (parsed.getRawQuery() != null)
            for (String pair : parsed.getRawQuery().split("&")) {
                String[] item = pair.split("=", 2);
                if (item[0].equals("h") && item.length == 2)
                    hash = URLDecoder.decode(item[1], java.nio.charset.StandardCharsets.UTF_8);
            }
        if (hash == null && index + 1 < parts.length && !parts[index + 1].isBlank())
            hash = parts[index + 1];
        return "https://vimeo.com/"
                + parts[index]
                + (hash == null
                        ? ""
                        : "/" + URLEncoder.encode(hash, java.nio.charset.StandardCharsets.UTF_8));
    }

    static void check(String provider, String url) {
        LearningContent.validateVideoUrl(provider, url);
        String endpoint =
                provider.equals("YOUTUBE")
                        ? "https://www.youtube.com/oembed?format=json&url="
                        : "https://vimeo.com/api/oembed.json?url=";
        try {
            var response =
                    HTTP.send(
                            HttpRequest.newBuilder(
                                            URI.create(
                                                    endpoint
                                                            + URLEncoder.encode(
                                                                    metadataUrl(provider, url),
                                                                    java.nio.charset
                                                                            .StandardCharsets
                                                                            .UTF_8)))
                                    .timeout(Duration.ofSeconds(8))
                                    .GET()
                                    .build(),
                            HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 404 || response.statusCode() == 403)
                throw new Failure(400, "Video is unavailable or cannot be embedded");
            if (response.statusCode() != 200 || !response.body().contains("iframe"))
                throw new Failure(503, "Unable to verify video. Retry.");
        } catch (Failure e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new Failure(503, "Video verification interrupted. Retry.");
        } catch (Exception e) {
            throw new Failure(503, "Unable to verify video. Retry.");
        }
    }
}
