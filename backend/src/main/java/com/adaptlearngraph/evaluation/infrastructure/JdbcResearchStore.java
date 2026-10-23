package com.adaptlearngraph.evaluation.infrastructure;
import com.adaptlearngraph.evaluation.application.*;
import com.adaptlearngraph.evaluation.application.port.ResearchStore;
import com.adaptlearngraph.evaluation.domain.Research.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DuplicateKeyException;
import java.util.*;

public final class JdbcResearchStore implements ResearchStore {
    private final JdbcTemplate jdbc;private final ObjectMapper mapper;
    public JdbcResearchStore(JdbcTemplate jdbc,ObjectMapper mapper){this.jdbc=jdbc;this.mapper=mapper;}
    private String json(Object value){try{return mapper.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException("Cannot serialize research artifact",e);}}
    private <T>T read(String text,Class<T> type){try{return mapper.readValue(text,type);}catch(Exception e){throw new IllegalStateException("Invalid saved research artifact",e);}}
    public void create(Run run){try{jdbc.update("INSERT INTO platform.research_run(id,status,created_by,payload) VALUES (?,?,?,?::jsonb)",run.id(),run.status(),run.createdBy(),json(run));}catch(DuplicateKeyException e){throw new ResearchException(409,"Another benchmark is active. Wait until it finishes.");}}
    public void save(Run run){jdbc.update("UPDATE platform.research_run SET status=?,payload=?::jsonb WHERE id=?",run.status(),json(run),run.id());}
    public Run get(UUID id){List<Run> values=jdbc.query("SELECT payload::text FROM platform.research_run WHERE id=?",(rs,n)->read(rs.getString(1),Run.class),id);if(values.isEmpty())throw new ResearchException(404,"Run not found");return values.getFirst();}
    public List<Run> list(){return jdbc.query("""
        SELECT ((payload - 'rulesMarkdown') || jsonb_build_object('results',
            COALESCE((SELECT jsonb_agg(result - 'samples')
                FROM jsonb_array_elements(payload->'results') result), '[]'::jsonb)))::text
        FROM platform.research_run ORDER BY created_at DESC LIMIT 50
        """,(rs,n)->read(rs.getString(1),Run.class));}
    public void saveGraph(UUID id,Graph graph){jdbc.update("INSERT INTO platform.research_graph(run_id,node_count,seed,payload) VALUES (?,?,?,?::jsonb)",id,graph.nodes().size(),graph.seed(),json(graph));}
    public Graph graph(UUID id,int size){return graph(id,size,get(id).seed());}
    public Graph graph(UUID id,int size,long seed){List<Graph> values=jdbc.query("SELECT payload::text FROM platform.research_graph WHERE run_id=? AND node_count=? AND seed=?",(rs,n)->read(rs.getString(1),Graph.class),id,size,seed);if(values.isEmpty())throw new ResearchException(404,"Dataset is not generated yet");return values.getFirst();}
    public void recoverInterrupted(){for(Run run:jdbc.query("SELECT payload::text FROM platform.research_run WHERE status IN ('QUEUED','RUNNING')",(rs,n)->read(rs.getString(1),Run.class)))save(run.progress("FAILED",run.completedQueries(),"Interrupted","API restarted before completion; start a new run with the same seed.",run.environment(),run.results()));}
}
