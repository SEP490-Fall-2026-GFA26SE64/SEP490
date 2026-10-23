package com.adaptlearngraph.evaluation;
import com.adaptlearngraph.evaluation.application.*;
import com.adaptlearngraph.evaluation.application.port.*;
import com.adaptlearngraph.evaluation.domain.Research.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ResearchServiceTest {
    @Test void measuresExactly1000Plus30WarmupsPerSizeAndPersistsResults(){
        ResearchStore store=mock(ResearchStore.class);ResearchGraphPort graph=mock(ResearchGraphPort.class);ResearchReport report=mock(ResearchReport.class);
        when(report.rules()).thenReturn("frozen rules");when(graph.environment()).thenReturn(Map.of("neo4jVersion","5.26"));
        when(graph.measure(anyInt(),any())).thenAnswer(i->{Workload w=i.getArgument(1);return new Sample(i.getArgument(0),w.hops(),w.startId(),w.moduleId(),2,w.hops());});
        var service=new ResearchService(store,ResearchDomainTest::source,graph,report,Runnable::run);
        service.start("admin",42,List.of(1000));
        var capture=org.mockito.ArgumentCaptor.forClass(Run.class);verify(store,atLeastOnce()).save(capture.capture());
        Run completed=capture.getValue();assertEquals("SUCCEEDED",completed.status());assertEquals(1000,completed.completedQueries());assertEquals("frozen rules",completed.rulesMarkdown());
        assertEquals(334,completed.results().getFirst().byHop().get(3).count());assertEquals(333,completed.results().getFirst().byHop().get(4).count());
        verify(graph,times(1030)).measure(anyInt(),any());verify(store).saveGraph(any(),any());
        assertThrows(ResearchException.class,()->service.start("admin",42,List.of(999)));
        assertThrows(ResearchException.class,()->service.start("admin",-1,List.of(1000)));
        assertThrows(ResearchException.class,()->service.start("admin",1,List.of(1000,1000)));
    }
    @Test void failureIsNotReportedAsSuccessAndPreviousSizeIsRetained(){
        ResearchStore store=mock(ResearchStore.class);ResearchGraphPort graph=mock(ResearchGraphPort.class);ResearchReport report=mock(ResearchReport.class);
        when(report.rules()).thenReturn("rules");when(graph.environment()).thenReturn(Map.of());AtomicInteger count=new AtomicInteger();
        when(graph.measure(anyInt(),any())).thenAnswer(i->{if(count.incrementAndGet()>1030)throw new IllegalStateException("Query timeout");Workload w=i.getArgument(1);return new Sample(i.getArgument(0),w.hops(),w.startId(),w.moduleId(),1,w.hops());});
        var service=new ResearchService(store,ResearchDomainTest::source,graph,report,Runnable::run);service.start("admin",1,List.of(1000,5000));
        var capture=org.mockito.ArgumentCaptor.forClass(Run.class);verify(store,atLeastOnce()).save(capture.capture());Run failed=capture.getValue();assertEquals("FAILED",failed.status());assertEquals(1,failed.results().size());assertEquals(1000,failed.completedQueries());
        when(store.get(failed.id())).thenReturn(failed);assertThrows(ResearchException.class,()->service.pdf(failed.id()));
    }
    @Test void customCountsDriveEverySizeAndUnevenHopAllocation() {
        for(int iterations:List.of(3,37,38,10000)) {
            ResearchStore store=mock(ResearchStore.class);ResearchGraphPort graph=mock(ResearchGraphPort.class);ResearchReport report=mock(ResearchReport.class);
            when(report.rules()).thenReturn("rules");when(graph.environment()).thenReturn(Map.of());
            when(graph.measure(anyInt(),any())).thenAnswer(i->{Workload w=i.getArgument(1);return new Sample(i.getArgument(0),w.hops(),w.startId(),w.moduleId(),1,w.hops());});
            var service=new ResearchService(store,ResearchDomainTest::source,graph,report,Runnable::run);
            service.start("admin",42,List.of(1000,5000),iterations);
            var capture=org.mockito.ArgumentCaptor.forClass(Run.class);verify(store,atLeastOnce()).save(capture.capture());
            Run completed=capture.getValue();assertEquals("SUCCEEDED",completed.status());assertEquals(iterations,completed.iterations());assertEquals(2*iterations,completed.completedQueries());
            for(Result result:completed.results()) {
                assertEquals(iterations,result.overall().count());assertEquals(iterations,result.samples().size());
                for(int h=3;h<=5;h++)assertEquals((iterations+5-h)/3,result.byHop().get(h).count());
            }
            verify(graph,times(2*(iterations+30))).measure(anyInt(),any());
        }
    }
    @Test void validatesBoundsBeforeCreatingAnyRun() {
        ResearchStore store=mock(ResearchStore.class);ResearchGraphPort graph=mock(ResearchGraphPort.class);ResearchReport report=mock(ResearchReport.class);
        var service=new ResearchService(store,ResearchDomainTest::source,graph,report,task->{});
        for(int n:List.of(-1,0,2,100001,Integer.MAX_VALUE))assertThrows(ResearchException.class,()->service.start("admin",42,List.of(1000),n));
        verifyNoInteractions(store,graph,report);
        when(report.rules()).thenReturn("rules");assertEquals(100000,service.start("admin",42,List.of(1000),100000).iterations());
    }

}
