package com.adaptlearngraph.catalog.domain;

import java.net.URI;
import java.util.*;

/** Versioned lesson data. File bytes and learning progress have separate storage owners. */
public final class LearningContent {
    private LearningContent() {}

    public static final String MANIFEST_TYPE = "application/vnd.adapt-learning.lessons+json";

    public record Lesson(
            String id,
            String title,
            String type,
            String body,
            String bodyFormat,
            double durationSeconds,
            String durationSource,
            String videoSource,
            String assetId,
            String videoUrl) {
        public Lesson {
            ModuleAuthoring.text(id, "lesson id", 100);
            if (!id.matches("[A-Za-z0-9_-]{1,100}"))
                throw new IllegalArgumentException(
                        "Lesson IDs use letters, numbers, hyphens or underscores");
            if (type == null || !Set.of("TEXT", "VIDEO").contains(type))
                throw new IllegalArgumentException("Unknown lesson type");
            if (title == null || title.length() > 240 || body != null && body.length() > 500_000)
                throw new IllegalArgumentException("Lesson text exceeds supported length");
            if (!Double.isFinite(durationSeconds)
                    || durationSeconds < 0
                    || durationSeconds > 604800)
                throw new IllegalArgumentException("Invalid lesson duration");
            if (durationSource == null
                    || !Set.of("ESTIMATED", "MANUAL", "MEDIA").contains(durationSource))
                throw new IllegalArgumentException("Invalid duration source");
            if (type.equals("TEXT")) {
                if (bodyFormat == null || !Set.of("MARKDOWN", "HTML").contains(bodyFormat))
                    throw new IllegalArgumentException("Invalid text format");
                if (videoSource != null || assetId != null || videoUrl != null)
                    throw new IllegalArgumentException("Text cannot have a video source");
            } else {
                if (body != null && !body.isBlank())
                    throw new IllegalArgumentException("Video lesson cannot contain a text body");
                if (videoSource == null
                        || !Set.of("UPLOAD", "YOUTUBE", "VIMEO").contains(videoSource))
                    throw new IllegalArgumentException("Unsupported video source");
                if (videoSource.equals("UPLOAD") && videoUrl != null
                        || !videoSource.equals("UPLOAD") && assetId != null)
                    throw new IllegalArgumentException("Use exactly one video source");
                if (videoUrl != null && !videoUrl.isBlank())
                    validateVideoUrl(videoSource, videoUrl);
            }
        }

        public boolean complete() {
            return !title.isBlank()
                    && durationSeconds > 0
                    && (type.equals("TEXT")
                            ? body != null
                                    && !body.replaceAll("<[^>]+>", " ")
                                            .replace("&nbsp;", " ")
                                            .isBlank()
                            : videoSource.equals("UPLOAD")
                                    ? assetId != null && !assetId.isBlank()
                                    : videoUrl != null && !videoUrl.isBlank());
        }

        /**
         * Identity and actual content determine progress compatibility; title/order/duration do
         * not.
         */
        public boolean sameContent(Lesson other) {
            return other != null
                    && id.equals(other.id)
                    && type.equals(other.type)
                    && Objects.equals(body, other.body)
                    && Objects.equals(bodyFormat, other.bodyFormat)
                    && Objects.equals(assetId, other.assetId)
                    && Objects.equals(videoSource, other.videoSource)
                    && Objects.equals(videoUrl, other.videoUrl);
        }
    }

    public static void validateVideoUrl(String provider, String url) {
        if (provider == null || url == null)
            throw new IllegalArgumentException("Select a video provider and link");
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            if (!"https".equals(uri.getScheme())
                    || uri.getUserInfo() != null
                    || uri.getPort() != -1
                    || host == null)
                throw new IllegalArgumentException("Use an HTTPS YouTube or Vimeo link");
            host = host.toLowerCase(Locale.ROOT);
            boolean youtube =
                    Set.of("youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com")
                            .contains(host);
            boolean vimeo = Set.of("vimeo.com", "www.vimeo.com", "player.vimeo.com").contains(host);
            if (!(provider.equals("YOUTUBE") && youtube || provider.equals("VIMEO") && vimeo))
                throw new IllegalArgumentException("Video provider does not match the link");
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException(
                    "Use a valid HTTPS link from the selected video provider");
        }
    }

    public static List<Lesson> lessons(List<Lesson> lessons) {
        if (lessons == null || lessons.stream().anyMatch(Objects::isNull))
            throw new IllegalArgumentException("Provide a lesson list");
        List<Lesson> result = List.copyOf(lessons);
        if (result.size() > 200
                || result.stream().map(Lesson::id).distinct().count() != result.size())
            throw new IllegalArgumentException("Use at most 200 lessons with unique IDs");
        return result;
    }

    public static void requireComplete(List<Lesson> lessons) {
        if (lessons.isEmpty() || lessons.stream().anyMatch(l -> !l.complete()))
            throw new IllegalArgumentException(
                    "Provide at least one lesson and complete every lesson before submitting");
    }

    public record Interval(double start, double end) {
        public Interval {
            if (!Double.isFinite(start) || !Double.isFinite(end) || start < 0 || end <= start)
                throw new IllegalArgumentException("Invalid watched interval");
        }
    }

    public static List<Interval> merge(
            List<Interval> existing, Interval incoming, double duration) {
        if (incoming.end() > duration + 1)
            throw new IllegalArgumentException("Playback exceeds video duration");
        List<Interval> all = new ArrayList<>(existing);
        all.add(new Interval(incoming.start(), Math.min(incoming.end(), duration)));
        all.sort(Comparator.comparingDouble(Interval::start));
        List<Interval> result = new ArrayList<>();
        for (Interval interval : all) {
            if (result.isEmpty() || result.getLast().end() < interval.start()) result.add(interval);
            else {
                Interval previous = result.removeLast();
                result.add(
                        new Interval(previous.start(), Math.max(previous.end(), interval.end())));
            }
        }
        if (result.size() > 10000)
            throw new IllegalArgumentException("Too many playback intervals");
        return List.copyOf(result);
    }

    public static boolean watchedEnough(List<Interval> intervals, double duration) {
        return duration > 0
                && intervals.stream().mapToDouble(i -> i.end() - i.start()).sum() / duration >= .9;
    }
}
