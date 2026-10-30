package com.adaptlearngraph.assessment.bank;

import com.adaptlearngraph.assessment.bank.domain.QuestionBank.Failure;
import com.adaptlearngraph.assessment.bank.infrastructure.Neo4jQuestionBankSkillReader;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;
import org.neo4j.driver.SessionConfig;
import org.neo4j.driver.TransactionConfig;
import org.neo4j.driver.async.AsyncSession;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class Neo4jQuestionBankSkillReaderTest {
    @Test void stalledResultAndCleanupCannotHoldCallerIndefinitely() {
        var driver=mock(Driver.class);var session=mock(AsyncSession.class);
        var pending=new CompletableFuture<List<String>>();
        when(driver.asyncSession(any(SessionConfig.class))).thenReturn(session);
        when(session.<List<String>>executeReadAsync(any(),any(TransactionConfig.class))).thenReturn(pending);
        when(session.closeAsync()).thenReturn(new CompletableFuture<>());
        var reader=new Neo4jQuestionBankSkillReader(driver,"neo4j",Duration.ofMillis(40));
        assertTimeoutPreemptively(Duration.ofSeconds(3),()->{
            var failure=assertThrows(Failure.class,()->reader.requireSkill("skill"));
            assertEquals(503,failure.status());
        });
        assertTrue(pending.isCancelled());verify(session).closeAsync();
    }

    @Test void anotherReadCanRecoverAfterAnUnavailableConnection() {
        var driver=mock(Driver.class);var failed=mock(AsyncSession.class);var healthy=mock(AsyncSession.class);
        when(driver.asyncSession(any(SessionConfig.class))).thenReturn(failed,healthy);
        when(failed.<List<String>>executeReadAsync(any(),any(TransactionConfig.class))).thenReturn(CompletableFuture.failedFuture(new IllegalStateException("Internal transport detail")));
        when(healthy.<List<String>>executeReadAsync(any(),any(TransactionConfig.class))).thenReturn(CompletableFuture.completedFuture(List.of("Approved skill")));
        when(failed.closeAsync()).thenReturn(CompletableFuture.completedFuture(null));
        when(healthy.closeAsync()).thenReturn(CompletableFuture.completedFuture(null));
        var reader=new Neo4jQuestionBankSkillReader(driver,"neo4j",Duration.ofSeconds(1));
        var failure=assertThrows(Failure.class,()->reader.requireSkill("skill"));
        assertEquals(503,failure.status());assertFalse(failure.getMessage().contains("transport detail"));
        assertEquals("Approved skill",reader.requireSkill("skill"));
        verify(failed).closeAsync();verify(healthy).closeAsync();
    }

    @Test void missingAndAmbiguousSkillsRemainInvalidRatherThanInvented() {
        var driver=mock(Driver.class);var session=mock(AsyncSession.class);
        when(driver.asyncSession(any(SessionConfig.class))).thenReturn(session);
        when(session.<List<String>>executeReadAsync(any(),any(TransactionConfig.class)))
                .thenReturn(CompletableFuture.completedFuture(List.of()),CompletableFuture.completedFuture(List.of("One","Two")));
        when(session.closeAsync()).thenReturn(CompletableFuture.completedFuture(null));
        var reader=new Neo4jQuestionBankSkillReader(driver,"neo4j",Duration.ofSeconds(1));
        assertEquals(400,assertThrows(Failure.class,()->reader.requireSkill("missing")).status());
        assertEquals(400,assertThrows(Failure.class,()->reader.requireSkill("ambiguous")).status());
    }
}
