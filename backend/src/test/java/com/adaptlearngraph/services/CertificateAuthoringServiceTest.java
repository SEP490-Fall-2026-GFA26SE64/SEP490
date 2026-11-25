package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.CertificateCatalog.Definition;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.QuestionBank.Actor;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.CertificateAuthoringStore.Document;
import com.adaptlearngraph.repository.CertificateCatalogRepository.SkillChoice;
import com.adaptlearngraph.repository.InitialPathwayPorts.Failure;
import com.adaptlearngraph.services.CertificateAuthoringService.Decision;
import com.adaptlearngraph.services.CertificateAuthoringService.Selection;
import com.adaptlearngraph.services.CertificateCatalogService.CreateInput;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** FR-CERT-01 submit of imported selections and FR-CERT-02 L&D batch review / publication. */
class CertificateAuthoringServiceTest {
    final UUID org = UUID.randomUUID(), expert = UUID.randomUUID(), manager = UUID.randomUUID();
    Actor actor;
    CertificateAuthoringStore store;
    CertificateCatalogRepository catalog;
    LearningNotificationJpaRepository notices;
    ReviewSubmissionNotifications submissions;
    CertificateAuthoringService service;
    Map<UUID, Document> docs;
    Set<String> viewed;

    @BeforeEach void setup() {
        actor = new Actor(manager, org, "LD_MANAGER");
        store = mock(CertificateAuthoringStore.class);
        catalog = mock(CertificateCatalogRepository.class);
        notices = mock(LearningNotificationJpaRepository.class);
        submissions = mock(ReviewSubmissionNotifications.class);
        var tx = mock(TransactionTemplate.class);
        when(tx.execute(any())).thenAnswer(call -> call.<TransactionCallback<?>>getArgument(0).doInTransaction(null));
        docs = new HashMap<>(); viewed = new HashSet<>();
        when(store.encode(any())).thenAnswer(call -> String.valueOf(call.<Object>getArgument(0)));
        when(store.replay(any(), any(), any(), any())).thenReturn(Optional.empty());
        when(store.lock(eq(org), any())).thenAnswer(call -> Optional.ofNullable(docs.get(call.<UUID>getArgument(1)))
                .orElseThrow(() -> new Failure(404, "CERTIFICATE_NOT_FOUND")));
        doAnswer(call -> { Document d = docs.get(call.<UUID>getArgument(1));
            docs.put(d.id(), new Document(d.id(), d.revision() + 1, call.getArgument(2), d.input(), d.skillName(), d.authorId(),
                    call.getArgument(3), call.getArgument(4), d.definitionId(), d.updatedAt())); return null; })
                .when(store).state(eq(org), any(), any(), any(), any());
        doAnswer(call -> { UUID id = call.getArgument(2);
            docs.put(id, new Document(id, 1, "DRAFT", call.getArgument(3), call.getArgument(4), call.getArgument(1), null, "", null, "now")); return null; })
                .when(store).insert(eq(org), any(), any(), any(), any());
        doAnswer(call -> { viewed.add(call.<Document>getArgument(1).id() + ":" + call.<Document>getArgument(1).revision()); return null; })
                .when(store).viewed(eq(org), any(), any());
        when(store.hasViewed(eq(org), any(), any())).thenAnswer(call -> viewed.contains(call.<Document>getArgument(1).id() + ":" + call.<Document>getArgument(1).revision()));
        when(catalog.choices(org)).thenReturn(List.of(new SkillChoice("skill-oop", "MS-JAVA-OOP", "Java OOP", "1.0", List.of("ADVANCED")),
                new SkillChoice("skill-coll", "MS-JAVA-COLL", "Java Collections", "1.0", List.of("ADVANCED"))));
        service = new CertificateAuthoringService(() -> actor, mock(QuestionBankPorts.Catalog.class), catalog, store, notices, tx, submissions);
    }

    CreateInput input(String skill, String name) { return new CreateInput(skill, "ADVANCED", name, "https://example.org/" + skill, "1.0", null, "Description"); }

    Document submitted(UUID author) {
        UUID id = UUID.randomUUID();
        var d = new Document(id, 3, "SUBMITTED", input("skill-oop", "Java OOP & SOLID Principles (Revision B)"), "Java OOP", author, null, "", null, "now");
        docs.put(id, d); return d;
    }

    Document view(Document d) { service.viewed(d.id(), d.revision()); return d; }

    // ---------------- FR-CERT-01 submit of imported selections
    @Test void importedSelectionsAreSubmittedForReviewAndManagersNotified() {
        actor = new Actor(expert, org, "DOMAIN_EXPERT");
        var replacing = new CreateInput("skill-oop", "ADVANCED", "Java OOP & SOLID Principles (Revision B)", "https://example.org/oop", "1.0", "def-oop", "Revision B");
        var ids = service.submitSelections(UUID.randomUUID(), List.of(new Selection(replacing, null, null), new Selection(input("skill-coll", "Collections Advanced"), null, null)));
        assertEquals(2, ids.size());
        assertTrue(ids.stream().allMatch(id -> docs.get(id).state().equals("SUBMITTED")));
        verify(catalog, times(2)).requireReplacement(eq(org), any());
        verify(submissions).submitted(org.toString(), expert.toString(), "CERTIFICATES", 2);
    }

    @Test void twoRowsForTheSameSkillAndLevelAreRejected() {
        actor = new Actor(expert, org, "DOMAIN_EXPERT");
        var e = assertThrows(Failure.class, () -> service.submit(UUID.randomUUID(), List.of(input("skill-oop", "A"), input("skill-oop", "B"))));
        assertEquals(409, e.status()); assertEquals("DUPLICATE_IMPORT_SCOPE", e.code());
        verify(submissions, never()).submitted(any(), any(), any(), anyInt());
    }

    @Test void openDraftForScopeMustBeSelectedExplicitly() {
        actor = new Actor(expert, org, "DOMAIN_EXPERT");
        when(store.open(org, "skill-oop", "ADVANCED")).thenReturn(true);
        var e = assertThrows(Failure.class, () -> service.submit(UUID.randomUUID(), List.of(input("skill-oop", "A"))));
        assertEquals(409, e.status()); assertEquals("CERTIFICATE_OPEN_DRAFT_EXISTS", e.code());
        assertTrue(docs.isEmpty());
    }

    // ---------------- FR-CERT-02 L&D batch review
    @Test void viewedApprovalMovesToPublishingAndPublicationQueuePublishes() {
        var d = view(submitted(expert));
        var result = service.decide(List.of(new Decision(d.id(), d.revision(), "APPROVE", null)));
        assertEquals("PUBLISHING", result.getFirst().state()); assertEquals(manager, result.getFirst().reviewerId());
        var publishing = docs.get(d.id());
        when(store.next()).thenReturn(Optional.of(publishing));
        when(store.organization(d.id())).thenReturn(org);
        when(catalog.publish(eq(org), eq(expert), eq(manager), eq(d.id()), any())).thenReturn(new Definition("def-new", "2", "skill-oop", "Java OOP",
                KnowledgeLevel.ADVANCED, "1.0", List.of(), publishing.input().name(), "https://example.org/skill-oop", "ACTIVE", expert.toString(), "now", "Description"));
        doAnswer(call -> { var x = docs.get(d.id()); docs.put(x.id(), new Document(x.id(), x.revision() + 1, "PUBLISHED", x.input(), x.skillName(), x.authorId(),
                x.reviewerId(), x.reason(), call.getArgument(2), x.updatedAt())); return null; }).when(store).published(eq(org), any(), any());
        assertTrue(service.publishOne());
        assertEquals("PUBLISHED", docs.get(d.id()).state()); assertEquals("def-new", docs.get(d.id()).definitionId());
    }

    @Test void approvalWithoutOpeningTheExactVersionIsRejected() {
        var d = submitted(expert);
        var e = assertThrows(Failure.class, () -> service.decide(List.of(new Decision(d.id(), d.revision(), "APPROVE", null))));
        assertEquals(409, e.status()); assertEquals("REVIEW_EXACT_CERTIFICATE_FIRST", e.code()); assertEquals("SUBMITTED", docs.get(d.id()).state());
    }

    @Test void rejectionNeedsAReasonAndNotifiesTheAuthor() {
        var d = view(submitted(expert));
        var e = assertThrows(Failure.class, () -> service.decide(List.of(new Decision(d.id(), d.revision(), "REJECT", "  "))));
        assertEquals(400, e.status()); assertEquals("REJECTION_REASON_REQUIRED", e.code());
        var result = service.decide(List.of(new Decision(d.id(), d.revision(), "REJECT", "Reference URL broken")));
        assertEquals("REJECTED", result.getFirst().state()); assertEquals("Reference URL broken", result.getFirst().reason());
        verify(notices).pathway(any(), eq(org.toString()), eq(expert.toString()), any(), eq("CERTIFICATE_DEFINITION_REJECTED"), any(), any(), any());
    }

    @Test void staleRevisionIsRejected() {
        var d = view(submitted(expert));
        var e = assertThrows(Failure.class, () -> service.decide(List.of(new Decision(d.id(), d.revision() - 1, "APPROVE", null))));
        assertEquals(409, e.status()); assertEquals("STALE_CERTIFICATE_REVISION", e.code());
    }

    @Test void expertCannotDecide() {
        var d = submitted(expert); actor = new Actor(expert, org, "DOMAIN_EXPERT");
        var e = assertThrows(Failure.class, () -> service.decide(List.of(new Decision(d.id(), d.revision(), "APPROVE", null))));
        assertEquals(403, e.status()); assertEquals("MANAGER_REQUIRED", e.code());
    }

    @Test void draftCertificateCannotBeDecided() {
        UUID id = UUID.randomUUID();
        docs.put(id, new Document(id, 1, "DRAFT", input("skill-oop", "Draft"), "Java OOP", expert, null, "", null, "now"));
        var e = assertThrows(Failure.class, () -> service.decide(List.of(new Decision(id, 1, "APPROVE", null))));
        assertEquals(409, e.status()); assertEquals("CERTIFICATE_NOT_SUBMITTED", e.code());
    }

    @Test void batchOfOneHundredIsAcceptedAndOneHundredOneIsRejected() {
        var batch = new ArrayList<Decision>();
        for (int i = 0; i < 100; i++) { var d = view(submitted(expert)); batch.add(new Decision(d.id(), d.revision(), "APPROVE", null)); }
        assertEquals(100, service.decide(batch).size());
        var over = new ArrayList<Decision>();
        for (int i = 0; i < 101; i++) over.add(new Decision(UUID.randomUUID(), 1, "APPROVE", null));
        var e = assertThrows(Failure.class, () -> service.decide(over));
        assertEquals(400, e.status()); assertEquals("INVALID_REQUEST", e.code());
    }

    @Test void duplicateIdsInOneBatchAreRejected() {
        var d = view(submitted(expert));
        var e = assertThrows(Failure.class, () -> service.decide(List.of(new Decision(d.id(), d.revision(), "APPROVE", null), new Decision(d.id(), d.revision(), "REJECT", "x"))));
        assertEquals(400, e.status()); assertEquals("INVALID_REQUEST", e.code());
    }

    @Test void authorCannotReviewOwnCertificate() {
        var d = view(submitted(manager));
        var e = assertThrows(Failure.class, () -> service.decide(List.of(new Decision(d.id(), d.revision(), "APPROVE", null))));
        assertEquals(403, e.status()); assertEquals("SELF_REVIEW_FORBIDDEN", e.code());
    }

    @Test void repeatedApprovalOfPublishedCertificateIsIdempotent() {
        UUID id = UUID.randomUUID();
        var done = new Document(id, 5, "PUBLISHED", input("skill-oop", "Published"), "Java OOP", expert, manager, "", "def-1", "now");
        docs.put(id, done);
        assertEquals(done, service.decide(List.of(new Decision(id, 5, "APPROVE", null))).getFirst());
        verify(store, never()).state(any(), any(), any(), any(), any());
    }
}
