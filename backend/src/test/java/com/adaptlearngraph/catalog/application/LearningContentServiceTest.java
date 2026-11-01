package com.adaptlearngraph.catalog.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.adaptlearngraph.catalog.application.port.out.*;
import com.adaptlearngraph.catalog.domain.*;
import com.adaptlearngraph.catalog.domain.LearningContent.Lesson;
import com.adaptlearngraph.catalog.domain.LearningResources.*;
import com.adaptlearngraph.catalog.domain.ModuleAuthoring.*;

import org.junit.jupiter.api.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.function.Supplier;

class LearningContentServiceTest {
    ModuleAuthoringPort modules = mock(ModuleAuthoringPort.class);
    LearningContentPort content = mock(LearningContentPort.class);
    ModuleAuthoringService authoring = mock(ModuleAuthoringService.class);
    LearningContentService service = new LearningContentService(modules, content, authoring);
    Actor actor = new Actor("learner", "org", Set.of("EMPLOYEE"));
    Lesson text =
            new Lesson(
                    "text",
                    "Reading",
                    "TEXT",
                    "Read this",
                    "MARKDOWN",
                    60,
                    "ESTIMATED",
                    null,
                    null,
                    null);
    Lesson video =
            new Lesson(
                    "video", "Video", "VIDEO", null, null, 100, "MEDIA", "UPLOAD", "asset", null);
    Revision revision;

    @BeforeEach
    void setup() {
        when(modules.actor()).thenAnswer(c -> actor);
        when(modules.transaction(any())).thenAnswer(c -> c.<Supplier<?>>getArgument(0).get());
        var meta = new Metadata("module", "1", "ACTIVE", "APPROVED", "reviewer", "time");
        var payload =
                new ModuleAuthoring.Package(
                        meta,
                        "Module",
                        "LESSON_AND_PRACTICE",
                        "module-content:c",
                        LearningContent.MANIFEST_TYPE,
                        "1",
                        3,
                        new BigDecimal("1000"),
                        List.of(new Teaching(meta, "skill", "Skill", "PRIMARY", "LOW")),
                        new Content(
                                "c",
                                "Title",
                                "",
                                LearningContent.MANIFEST_TYPE,
                                "1",
                                List.of("occ"),
                                "expert",
                                "time",
                                List.of(text, video)));
        revision = new Revision(1, "RELEASED", payload, "expert", "time", "reviewer", "time", null);
        when(authoring.learning("module", false)).thenReturn(revision);
        when(content.progress(anyString(), anyString(), anyString(), anyInt()))
                .thenReturn(List.of());
    }

    @Test
    void cannotCompleteUnreadTextOrUnwatchedVideo() {
        assertThrows(
                ModuleAuthoringService.Failure.class,
                () -> service.progress("module", "text", 0, null, null, false, true, 1));
        assertThrows(
                ModuleAuthoringService.Failure.class,
                () -> service.progress("module", "video", 100, null, null, false, true, 1));
        verify(content, never())
                .progress(anyString(), anyString(), anyString(), anyInt(), any(Progress.class));
        assertNotNull(
                service.progress("module", "text", 0, null, null, true, true, 1).completedAt());
    }

    @Test
    void completionIsExplicitEvenAfterNinetyPercent() {
        var old =
                new Progress(
                        "video",
                        90,
                        List.of(new LearningContent.Interval(0, 90)),
                        false,
                        null,
                        "2026-10-29T00:00:00Z");
        when(content.progress(anyString(), anyString(), anyString(), anyInt()))
                .thenReturn(List.of(old));
        assertNull(
                service.progress("module", "video", 90, null, null, false, false, 1).completedAt());
        assertNotNull(
                service.progress("module", "video", 90, null, null, false, true, 1).completedAt());
        assertThrows(
                ModuleAuthoringService.Failure.class,
                () -> service.progress("module", "video", 90, 0.0, 90.0, false, false, 1));
        assertThrows(
                ModuleAuthoringService.Failure.class,
                () -> service.progress("module", "video", 90, null, null, false, true, 2));
    }

    @Test
    void positionHeartbeatDoesNotResetTheWatchedSegmentClock() {
        var now = java.time.Instant.now();
        var old =
                new Progress(
                        "video",
                        0,
                        List.of(),
                        false,
                        null,
                        now.toString(),
                        now.minusSeconds(6).toString());
        when(content.progress(anyString(), anyString(), anyString(), anyInt()))
                .thenReturn(List.of(old));
        var heartbeat = service.progress("module", "video", 3, null, null, false, false, 1);
        assertEquals(old.coverageUpdatedAt(), heartbeat.coverageUpdatedAt());
        var watched = service.progress("module", "video", 5.055, 0.0, 5.055, false, false, 1);
        assertEquals(List.of(new LearningContent.Interval(0, 5.055)), watched.watchedIntervals());
        assertNotEquals(old.coverageUpdatedAt(), watched.coverageUpdatedAt());
        var recent =
                new Progress("video", 0, List.of(), false, null, now.toString(), now.toString());
        when(content.progress(anyString(), anyString(), anyString(), anyInt()))
                .thenReturn(List.of(recent));
        assertThrows(
                ModuleAuthoringService.Failure.class,
                () -> service.progress("module", "video", 14, 0.0, 14.0, false, false, 1));
    }

    @Test
    void peerOrEmployeeCannotAssignAndExpertCannotAssignUnreleasedModule() {
        assertThrows(
                ModuleAuthoringService.Failure.class,
                () -> service.assign("learner", "Path", List.of("module")));
        actor = new Actor("expert", "org", Set.of("EXPERT"));
        when(modules.lock("org", "module")).thenReturn(Optional.empty());
        assertThrows(
                ModuleAuthoringService.Failure.class,
                () -> service.assign("learner", "Path", List.of("module")));
        verify(content, never())
                .assign(anyString(), anyString(), anyString(), anyString(), anyList());
    }

    @Test
    void employeeCannotFetchAnUnreferencedPrivateFile() {
        when(content.asset("org", "asset"))
                .thenReturn(
                        Optional.of(
                                new Asset(
                                        "asset",
                                        "org",
                                        "expert",
                                        "object",
                                        "a.mp4",
                                        "video/mp4",
                                        10,
                                        "hash",
                                        100.0,
                                        "time")));
        when(modules.documents("org")).thenReturn(List.of());
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.accessibleAsset("asset"));
        actor = new Actor("expert", "org", Set.of("EXPERT"));
        assertEquals("asset", service.accessibleAsset("asset").id());
    }

    @Test
    void realLearningAdmissionRequiresPersistedAssignmentBeforePinAccess() {
        var real = new ModuleAuthoringService(modules, content);
        var document =
                new Document(
                        "module",
                        "org",
                        List.of("occ"),
                        "expert",
                        "time",
                        1,
                        true,
                        false,
                        1,
                        List.of(revision),
                        List.of());
        when(modules.lock("org", "module")).thenReturn(Optional.of(document));
        when(modules.pinned("org", "learner", "module")).thenReturn(Optional.of(1));
        assertThrows(ModuleAuthoringService.Failure.class, () -> real.learning("module", true));
        verify(modules, never()).pin(anyString(), anyString(), anyString(), anyInt());
        when(content.assigned("org", "learner", "module")).thenReturn(true);
        assertEquals(1, real.learning("module", true).number());
    }

    @Test
    void assignedPreviewReadsReleasedContentWithoutPinningOrChangingProgress() {
        var realAuthoring = new ModuleAuthoringService(modules, content);
        var realService = new LearningContentService(modules, content, realAuthoring);
        var document = new Document("module", "org", List.of(), "expert", "time", 1,
                true, false, 1, List.of(revision), List.of());
        when(modules.lock("org", "module")).thenReturn(Optional.of(document));
        when(modules.pinned("org", "learner", "module")).thenReturn(Optional.empty());
        when(content.assigned("org", "learner", "module")).thenReturn(true);
        var preview = realService.view("module", false);
        assertEquals(revision, preview.revision());
        assertEquals(1, preview.latestRevision());
        assertTrue(preview.progress().isEmpty());
        verify(modules, never()).pin(anyString(), anyString(), anyString(), anyInt());
        verify(content, never()).progress(anyString(), anyString(), anyString(), anyInt(), any(Progress.class));
        assertThrows(ModuleAuthoringService.Failure.class, () -> realService.progress("module", "text", 0, null, null, true, true, 1));
        realService.view("module", true);
        verify(modules).pin("org", "learner", "module", 1);
    }

    @Test
    void assignedPreviewEnforcesRoleOrganizationAssignmentAndAvailability() {
        var real = new ModuleAuthoringService(modules, content);
        var document = new Document("module", "org", List.of(), "expert", "time", 1,
                true, false, 1, List.of(revision), List.of());
        when(modules.lock("org", "module")).thenReturn(Optional.of(document));
        when(modules.pinned("org", "learner", "module")).thenReturn(Optional.empty());
        assertEquals(403, assertThrows(ModuleAuthoringService.Failure.class, () -> real.learningPreview("module")).status());
        when(content.assigned("org", "learner", "module")).thenReturn(true);
        var archived = new Document("module", "org", List.of(), "expert", "time", 1,
                true, true, 1, List.of(revision), List.of());
        when(modules.lock("org", "module")).thenReturn(Optional.of(archived));
        assertEquals(409, assertThrows(ModuleAuthoringService.Failure.class, () -> real.learningPreview("module")).status());
        actor = new Actor("learner", "other-org", Set.of("EMPLOYEE"));
        assertEquals(404, assertThrows(ModuleAuthoringService.Failure.class, () -> real.learningPreview("module")).status());
        actor = new Actor("expert", "org", Set.of("EXPERT"));
        assertEquals(403, assertThrows(ModuleAuthoringService.Failure.class, () -> real.learningPreview("module")).status());
        verify(modules, never()).pin(anyString(), anyString(), anyString(), anyInt());
    }

    @Test
    void previewRetainsPinnedVersionEvenWhenAnArchivedModuleHasANewerRelease() {
        var real = new ModuleAuthoringService(modules, content);
        var newer = new Revision(2, "RELEASED", revision.payload(), "expert", "later", "reviewer", "later", null);
        var document = new Document("module", "org", List.of(), "expert", "time", 2,
                true, true, 2, List.of(revision, newer), List.of());
        when(modules.lock("org", "module")).thenReturn(Optional.of(document));
        when(modules.pinned("org", "learner", "module")).thenReturn(Optional.of(1));
        when(content.assigned("org", "learner", "module")).thenReturn(true);
        assertEquals(revision, real.learningPreview("module"));
        verify(modules, never()).pin(anyString(), anyString(), anyString(), anyInt());
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(booleans = {false, true})
    void explicitVersionSwitchCopiesOnlyStableUnchangedLessonContent(boolean sameBytes) {
        var changedVideo =
                new Lesson(
                        "video",
                        "Video",
                        "VIDEO",
                        null,
                        null,
                        100,
                        "MEDIA",
                        "UPLOAD",
                        "new-asset",
                        null);
        var p = revision.payload();
        var newContent =
                new Content(
                        "new-content",
                        "Title",
                        "",
                        LearningContent.MANIFEST_TYPE,
                        "2",
                        List.of("occ"),
                        "expert",
                        "time",
                        List.of(text, changedVideo));
        var payload =
                new ModuleAuthoring.Package(
                        p.metadata(),
                        p.title(),
                        p.moduleType(),
                        "module-content:new",
                        LearningContent.MANIFEST_TYPE,
                        "2",
                        p.duration(),
                        p.price(),
                        p.teachings(),
                        newContent);
        var next = new Revision(2, "RELEASED", payload, "expert", "time", "reviewer", "time", null);
        var d =
                new Document(
                        "module",
                        "org",
                        List.of("occ"),
                        "expert",
                        "time",
                        2,
                        true,
                        false,
                        2,
                        List.of(revision, next),
                        List.of());
        when(modules.lock("org", "module")).thenReturn(Optional.of(d));
        when(content.asset("org", "asset"))
                .thenReturn(
                        Optional.of(
                                new Asset(
                                        "asset",
                                        "org",
                                        "expert",
                                        "object",
                                        "a.mp4",
                                        "video/mp4",
                                        100,
                                        "original-hash",
                                        100.0,
                                        "time")));
        when(content.asset("org", "new-asset"))
                .thenReturn(
                        Optional.of(
                                new Asset(
                                        "new-asset",
                                        "org",
                                        "expert",
                                        "new-object",
                                        "b.mp4",
                                        "video/mp4",
                                        100,
                                        sameBytes ? "original-hash" : "changed-hash",
                                        100.0,
                                        "time")));
        var textProgress =
                new Progress(
                        "text", 0, List.of(), true, "2026-10-29T00:00:00Z", "2026-10-29T00:00:00Z");
        var videoProgress =
                new Progress(
                        "video",
                        90,
                        List.of(new LearningContent.Interval(0, 90)),
                        false,
                        "2026-10-29T00:00:00Z",
                        "2026-10-29T00:00:00Z");
        when(content.progress("org", "learner", "module", 1))
                .thenReturn(List.of(textProgress, videoProgress));
        doAnswer(
                        call -> {
                            when(authoring.learning("module", false)).thenReturn(next);
                            when(authoring.learningPreview("module")).thenReturn(next);
                            return null;
                        })
                .when(content)
                .switchVersion("org", "learner", "module", 1, 2);
        assertEquals(2, service.switchVersion("module", 1).revision().number());
        verify(content).progress("org", "learner", "module", 2, textProgress);
        if (sameBytes) verify(content).progress("org", "learner", "module", 2, videoProgress);
        else
            verify(content, never())
                    .progress(
                            eq("org"),
                            eq("learner"),
                            eq("module"),
                            eq(2),
                            argThat(progress -> progress.lessonId().equals("video")));
    }
}
