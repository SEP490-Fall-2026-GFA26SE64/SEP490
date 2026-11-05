package com.adaptlearngraph.services;

import com.adaptlearngraph.repository.PlatformCatalogTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SingleSkillTemplateTest {
    ObjectMapper json=new ObjectMapper();
    ObjectNode release()throws Exception {return (ObjectNode)json.readTree(Files.readAllBytes(Path.of("../documents/dataset/import/ontology_seed-v012.json")));}
    @Test void forwardTemplateClosureRetainsExactlyOneSkillForEveryIncludedModule()throws Exception {
        var template=new PlatformCatalogTemplate(json.writeValueAsBytes(release()),json);
        var service=new PlatformCatalogService(()->Optional.of(template));
        var closure=service.closure(List.of("MOD-DE-J-MODEL-01"));
        assertTrue(closure.nodeIds().contains("MS-DE01"));
        for(String id:closure.nodeIds())if(template.nodes().get(id).label().equals("LearningModule"))
            assertEquals(1,closure.edges().stream().filter(e->e.type().equals("TEACHES")&&e.fromId().equals(id)).count());
    }
    @Test void multiSkillTemplateCannotEnterWorkspaceImport()throws Exception {
        var data=release();var edges=(ArrayNode)data.get("relationships");
        ObjectNode extra=(ObjectNode)edges.findParents("type").stream().filter(e->"TEACHES".equals(e.path("type").asText())).findFirst().orElseThrow().deepCopy();
        extra.put("id","unexpected-second-edge");extra.put("toId","MS-CORE01");edges.add(extra);
        assertThrows(IllegalArgumentException.class,()->new PlatformCatalogTemplate(json.writeValueAsBytes(data),json));
    }
    @Test void retiredFocusAndDifficultyCannotEnterWorkspaceImport()throws Exception {
        var data=release();
        for(var e:data.get("relationships"))if("TEACHES".equals(e.path("type").asText())){((ObjectNode)e).put("difficultyLevel","LOW");break;}
        assertThrows(IllegalArgumentException.class,()->new PlatformCatalogTemplate(json.writeValueAsBytes(data),json));
    }
}
