package com.adaptlearngraph.catalog.domain;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

import java.util.*;

class LearningContentTest {
    @Test
    void seekingAndRepeatedSegmentsCannotMeetNinetyPercent() {
        var intervals = LearningContent.merge(List.of(), new LearningContent.Interval(0, 45), 100);
        intervals = LearningContent.merge(intervals, new LearningContent.Interval(0, 45), 100);
        assertFalse(LearningContent.watchedEnough(intervals, 100));
        intervals = LearningContent.merge(intervals, new LearningContent.Interval(55, 100), 100);
        assertTrue(LearningContent.watchedEnough(intervals, 100));
        assertThrows(
                IllegalArgumentException.class,
                () -> LearningContent.merge(List.of(), new LearningContent.Interval(99, 200), 100));
    }

    @Test
    void legacyContentBecomesOneStableTextLessonAndIncompleteDraftCannotSubmit() {
        var content =
                new ModuleAuthoring.Content(
                        "c",
                        "Title",
                        "# Existing text",
                        "text/markdown",
                        "1",
                        List.of("occ"),
                        null,
                        "then");
        assertEquals("c-text", content.lessons().getFirst().id());
        assertEquals("# Existing text", content.lessons().getFirst().body());
        LearningContent.requireComplete(content.lessons());
        assertThrows(
                IllegalArgumentException.class, () -> LearningContent.requireComplete(List.of()));
    }

    @Test
    void providerAllowlistRejectsDeceptiveHostsCredentialsAndWrongProvider() {
        LearningContent.validateVideoUrl("YOUTUBE", "https://youtu.be/abc123");
        for (String url :
                List.of(
                        "https://youtube.com.evil.test/watch?v=x",
                        "https://youtube.com@evil.test/x",
                        "http://youtube.com/x",
                        "https://vimeo.com/123"))
            assertThrows(
                    IllegalArgumentException.class,
                    () -> LearningContent.validateVideoUrl("YOUTUBE", url));
    }
}
