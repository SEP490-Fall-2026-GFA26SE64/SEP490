package com.adaptlearngraph.evaluation.application.port;
import com.adaptlearngraph.evaluation.domain.Research.*;
import java.util.Map;
public interface ResearchGraphPort {
    Map<String,String> environment();
    void replace(Graph graph);
    Sample measure(int iteration, Workload workload);
}
