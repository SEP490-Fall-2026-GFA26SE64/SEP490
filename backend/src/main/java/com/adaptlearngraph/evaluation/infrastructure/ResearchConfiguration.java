package com.adaptlearngraph.evaluation.infrastructure;

import com.adaptlearngraph.evaluation.application.*;
import com.adaptlearngraph.evaluation.application.port.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.neo4j.driver.Driver;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import java.nio.file.Path;
import java.sql.Connection;
import java.util.concurrent.*;

@Configuration(proxyBeanMethods=false)
@ConditionalOnProperty(name="research.enabled",havingValue="true")
public class ResearchConfiguration {
    @Bean ResearchSource researchSource(ObjectMapper mapper,@Value("${research.source}")String path){return new JsonOntologySource(Path.of(path),mapper);}
    @Bean ResearchStore researchStore(JdbcTemplate jdbc,ObjectMapper mapper){return new JdbcResearchStore(jdbc,mapper);}
    @Bean ResearchReport researchReport(@Value("${research.rules}")String path){return new PdfResearchReport(Path.of(path));}
    @Bean(destroyMethod="close") Neo4jResearchGraph researchGraph(Driver primary,
        @Value("${research.neo4j-uri}")String uri,@Value("${research.neo4j-user:neo4j}")String user,
        @Value("${research.neo4j-password}")String password,@Value("${research.environment-label}")String environment){
        return new Neo4jResearchGraph(primary,uri,user,password,environment);
    }
    @Bean(destroyMethod="close") ResearchLease researchLease(JdbcTemplate jdbc) throws Exception {return new ResearchLease(jdbc);}
    @Bean(destroyMethod="shutdownNow") ExecutorService researchExecutor(){return Executors.newSingleThreadExecutor(r->{Thread t=new Thread(r,"rq2-benchmark");t.setDaemon(true);return t;});}
    @Bean ResearchService researchService(ResearchStore store,ResearchSource source,ResearchGraphPort graph,
        ResearchReport report,ExecutorService researchExecutor,ResearchLease lease){
        store.recoverInterrupted();return new ResearchService(store,source,graph,report,researchExecutor);
    }
    /** Session lock keeps a second API from resetting the first API's graph or recovery state. */
    public static final class ResearchLease implements AutoCloseable {
        private final Connection connection;
        public ResearchLease(JdbcTemplate jdbc)throws Exception{
            connection=jdbc.getDataSource().getConnection();
            try(var stmt=connection.createStatement();var row=stmt.executeQuery("SELECT pg_try_advisory_lock(332034035)")){
                row.next();if(!row.getBoolean(1)){connection.close();throw new IllegalStateException("Only one Research API worker may run per PostgreSQL database");}
            }
        }
        public void close()throws Exception{try(var stmt=connection.createStatement()){stmt.execute("SELECT pg_advisory_unlock(332034035)");}finally{connection.close();}}
    }
}
