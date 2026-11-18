package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.RiasecRules;
import com.adaptlearngraph.entities.domain.RiasecRules.Failure;
import java.util.*;
import org.springframework.data.neo4j.core.Neo4jClient;

/** Only position metadata crosses this boundary. Never loads Role, Skill or learner evidence. */
public final class RiasecCatalog {
    public record Position(String id,String code,String name,String description,Map<String,Integer> scores) {}
    private final Neo4jClient graph;
    public RiasecCatalog(Neo4jClient graph) {this.graph=graph;}
    public List<Position> positions(UUID org,boolean activeOnly) {
        var rows=graph.query("MATCH (j:JobPosition) WHERE j.organizationId=$org AND ($active=false OR toUpper(coalesce(j.status,'ACTIVE'))='ACTIVE') RETURN j.id AS id,j.code AS code,j.name AS name,coalesce(j.description,'') AS description, [j.interestRealistic,j.interestInvestigative,j.interestArtistic,j.interestSocial,j.interestEnterprising,j.interestConventional] AS interests ORDER BY j.id")
            .bind(org.toString()).to("org").bind(activeOnly).to("active").fetch().all();
        var result=new ArrayList<Position>();
        for(var row:rows) {String id=Objects.toString(row.get("id"),"");if(id.isBlank())continue;
            var scores=new LinkedHashMap<String,Integer>();var interests=(List<?>)row.get("interests");
            if(interests!=null && interests.size()==6)for(int i=0;i<6;i++) {
                var v=interests.get(i);
                if((v instanceof Long || v instanceof Integer) && ((Number)v).longValue()>=0 && ((Number)v).longValue()<=40)
                    scores.put(RiasecRules.DIMENSIONS.get(i),((Number)v).intValue());
            }
            result.add(new Position(id,Objects.toString(row.get("code"),""),Objects.toString(row.get("name"),""),Objects.toString(row.get("description"),""),Map.copyOf(scores)));}
        return List.copyOf(result);
    }
    public List<Position> candidates(UUID org) {
        return positions(org,true).stream().filter(p->{try{RiasecRules.validateProfile(p.scores());return true;}catch(Failure e){return false;}}).toList();
    }
}
