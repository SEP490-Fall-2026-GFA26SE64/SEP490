package com.adaptlearngraph.evaluation;

import com.adaptlearngraph.evaluation.application.*;
import com.adaptlearngraph.evaluation.application.port.*;
import com.adaptlearngraph.evaluation.domain.*;
import com.adaptlearngraph.evaluation.domain.Research.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ResearchStudyTest {
    private record Harness(ResearchService service, ResearchStore store, ResearchGraphPort port, Map<String,Graph> graphs) {}
    private Harness harness() {
        ResearchStore store=mock(ResearchStore.class);ResearchGraphPort port=mock(ResearchGraphPort.class);ResearchReport report=mock(ResearchReport.class);
        Map<String,Graph> graphs=new HashMap<>();
        when(report.rules()).thenReturn("v3 frozen rules");when(port.environment()).thenReturn(Map.of("neo4jVersion","5.26"));
        doAnswer(i->{Graph g=i.getArgument(1);graphs.put(g.seed()+":"+g.nodes().size(),g);return null;}).when(store).saveGraph(any(),any());
        when(store.graph(any(),anyInt(),anyLong())).thenAnswer(i->graphs.get(i.getArgument(2)+":"+i.getArgument(1)));
        when(port.measure(anyInt(),any())).thenAnswer(i->{Workload w=i.getArgument(1);int n=i.getArgument(0);return new Sample(n,w.hops(),w.startId(),w.moduleId(),n+1,w.hops());});
        return new Harness(new ResearchService(store,ResearchDomainTest::source,port,report,Runnable::run),store,port,graphs);
    }
    private Run last(Harness h) {
        var capture=org.mockito.ArgumentCaptor.forClass(Run.class);verify(h.store,atLeastOnce()).save(capture.capture());return capture.getValue();
    }
    @Test void repeatsDistinctPairsAcrossRoundsAndSeedsWithFullWarmupAndExactProgress() {
        Harness h=harness();h.service.startStudy("admin",List.of(1L,2L),List.of(1000,5000),7,3);Run run=last(h);
        assertEquals("SUCCEEDED",run.status());assertTrue(run.planReady());assertEquals(252,run.totalQueries());assertEquals(run.totalQueries(),run.completedQueries());assertEquals(12,run.results().size());assertEquals(4,h.graphs.size());
        verify(h.port,times(336)).measure(anyInt(),any());verify(h.port,times(4)).replace(any());
        for(long seed:List.of(1L,2L))for(int size:List.of(1000,5000)) {
            List<Result> trials=run.results().stream().filter(r->r.nodeCount()==size&&r.trial().seed()==seed).toList();
            List<Set<Workload>> sets=new ArrayList<>();
            for(Result r:trials) {
                assertEquals(21,r.trial().attempted());assertEquals(21,r.trial().warmupQueries());assertEquals(Map.of(3,7,4,7,5,7),r.trial().uniqueByHop());
                assertEquals(0,r.trial().errors());assertEquals(11,r.overall().medianMs());assertEquals(20,r.overall().p95Ms());
                assertEquals(2.0*r.edgeCount()/r.nodeCount(),r.trial().structure().averageDegree());assertTrue(r.trial().structure().maxDegree()>0);
                sets.add(new HashSet<>(r.samples().stream().map(s->new Workload(s.hops(),s.startId(),s.moduleId())).toList()));
                assertEquals(21,sets.getLast().size());
            }
            assertEquals(sets.get(0),sets.get(1));assertEquals(sets.get(1),sets.get(2));
            assertNotEquals(trials.get(0).samples().stream().map(Sample::startId).toList(),trials.get(1).samples().stream().map(Sample::startId).toList());
        }
        Harness replay=harness();replay.service.startStudy("admin",List.of(1L,2L),List.of(1000,5000),7,3);
        Run repeated=last(replay);
        assertEquals(run.results().stream().map(Result::samples).toList(),repeated.results().stream().map(Result::samples).toList());
        assertEquals(h.graphs,replay.graphs);
    }
    @Test void recordsTimeoutAndErrorWithoutRetryAndDoesNotIncludeThemInLatencyMetrics() {
        Harness h=harness();AtomicInteger measured=new AtomicInteger();
        doAnswer(i->{int n=i.getArgument(0);Workload w=i.getArgument(1);if(n>=0){int count=measured.incrementAndGet();if(count==1)throw new IllegalStateException("Query timed out");if(count==2)throw new IllegalStateException("Connection unavailable");}return new Sample(n,w.hops(),w.startId(),w.moduleId(),5,w.hops());}).when(h.port).measure(anyInt(),any());
        h.service.startStudy("admin",List.of(1L),List.of(1000),2,2);Run run=last(h);Result first=run.results().getFirst();
        assertEquals("SUCCEEDED",run.status());assertEquals(12,run.completedQueries());assertEquals(2,first.trial().errors());assertEquals(1,first.trial().timeouts());assertEquals(4,first.overall().count());assertEquals(5,first.overall().meanMs());assertEquals(6,first.samples().size());assertEquals("TIMEOUT",first.samples().getFirst().outcome());verify(h.port,times(18)).measure(anyInt(),any());
    }
    @Test void failedWarmupStopsStudyWithoutReportingItAsComplete() {
        Harness h=harness();doThrow(new IllegalStateException("Dependency failed")).when(h.port).measure(anyInt(),any());
        h.service.startStudy("admin",List.of(1L),List.of(1000),2,1);Run run=last(h);assertEquals("FAILED",run.status());assertEquals(0,run.completedQueries());assertTrue(run.results().isEmpty());
    }
    @Test void validatesStudyBeforeWritingOrTouchingDependencies() {
        Harness h=harness();clearInvocations(h.store,h.port);
        for(List<Long> seeds:List.of(List.<Long>of(),List.of(1L,1L),List.of(-1L),List.of(9007199254740992L)))assertThrows(ResearchException.class,()->h.service.startStudy("admin",seeds,List.of(1000),1,1));
        for(int pairs:List.of(0,10001))assertThrows(ResearchException.class,()->h.service.startStudy("admin",List.of(1L),List.of(1000),pairs,1));
        assertThrows(ResearchException.class,()->h.service.startStudy("admin",List.of(1L),List.of(1000),1,11));
        assertThrows(ResearchException.class,()->h.service.startStudy("admin",List.of(1L,2L),List.of(1000,5000,10000),10000,10));
        verifyNoInteractions(h.store,h.port);
    }
    @Test void workloadNeverPadsMissingPairsAndMedianHandlesOddAndEvenCounts() {
        List<Edge> edges=List.of(new Edge("HAS_ROLE","o","r",Map.of()),new Edge("HAS_LEVEL","r","l",Map.of()),new Edge("HAS_COMPETENCY","l","c",Map.of()),new Edge("HAS_SKILL","c","s",Map.of()),new Edge("TEACHES","m","s",Map.of()));
        var pool=OntologyGenerator.workload(edges,1,500);assertEquals(3,pool.size());assertEquals(3,new HashSet<>(pool).size());
        assertEquals(2,Metrics.of(List.of(new Sample(0,3,"s","m",1,3),new Sample(1,3,"s","m",3,3))).medianMs());
        assertEquals(3,Metrics.of(List.of(new Sample(0,3,"s","m",1,3),new Sample(1,3,"s","m",3,3),new Sample(2,3,"s","m",20,3))).medianMs());
    }
    @Test void freezesReducedDenominatorWhenTheGraphHasFewerDistinctPairsThanRequested() {
        Harness h=harness();h.service.startStudy("admin",List.of(1L),List.of(1000),10000,1);Run run=last(h);
        Result result=run.results().getFirst();int actual=result.trial().uniqueByHop().values().stream().mapToInt(n->n).sum();
        assertTrue(actual<30000);assertEquals(actual,run.totalQueries());assertEquals(actual,run.completedQueries());assertEquals(actual,result.samples().size());assertEquals(actual,result.trial().warmupQueries());
        assertEquals(actual,new HashSet<>(result.samples().stream().map(s->new Workload(s.hops(),s.startId(),s.moduleId())).toList()).size());
        verify(h.port,times(actual*2)).measure(anyInt(),any());
    }
    @Test void allFailedAttemptsAreRetainedAndEmptyLatencyGroupsAreNotClaimedAsSuccessful() {
        Harness h=harness();doAnswer(i->{int n=i.getArgument(0);Workload w=i.getArgument(1);if(n>=0)throw new IllegalStateException("Timeout");return new Sample(n,w.hops(),w.startId(),w.moduleId(),1,w.hops());}).when(h.port).measure(anyInt(),any());
        h.service.startStudy("admin",List.of(1L),List.of(1000),1,1);Run run=last(h);Result result=run.results().getFirst();
        assertEquals(3,run.completedQueries());assertEquals(3,result.samples().size());assertEquals(3,result.trial().errors());assertEquals(3,result.trial().timeouts());assertEquals(0,result.overall().count());assertNull(result.overall().medianMs());
        result.byHop().values().forEach(m->assertEquals(0,m.count()));
    }

}
