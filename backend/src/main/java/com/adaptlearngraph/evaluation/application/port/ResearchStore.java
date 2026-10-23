package com.adaptlearngraph.evaluation.application.port;
import com.adaptlearngraph.evaluation.domain.Research.*;
import java.util.*;
public interface ResearchStore {
    void create(Run run);
    void save(Run run);
    Run get(UUID id);
    List<Run> list();
    void saveGraph(UUID runId, Graph graph);
    Graph graph(UUID runId, int size);
    default Graph graph(UUID runId,int size,long seed) { return graph(runId,size); }
    void recoverInterrupted();
}
