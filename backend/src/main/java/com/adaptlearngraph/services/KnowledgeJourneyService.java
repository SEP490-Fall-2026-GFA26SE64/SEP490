package com.adaptlearngraph.services;

import com.adaptlearngraph.repository.KnowledgeJourneyPort;
import com.adaptlearngraph.repository.CurrentRoleSelectionStore;
import com.adaptlearngraph.services.RoleBaselineFlow.*;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import com.fasterxml.jackson.databind.*;
import java.time.Instant;
import java.util.*;

/** Own saved learning intent, deliberately not an employment/promotion or achievement projection. */
public final class KnowledgeJourneyService {
    public record Knowledge(String knowledgeLevel,String skillVersion) {}
    public record Skill(String id,String name,List<Knowledge> levels) {}
    public record Node(String id,String roleId,String roleCode,String roleName,String roleVersion,String levelId,String levelName,
                       Integer rank,Long revision,Instant selectedAt,boolean current,String source,String requirementsSource,List<Skill> skills) {}
    public record Page(Node assigned,List<Node> nodes,int page,int pageSize,boolean hasMore) {}
    private final Identity identity;private final CurrentRoleSelectionStore selections;
    private final KnowledgeJourneyPort data;private final ObjectMapper json;
    public KnowledgeJourneyService(Identity identity,CurrentRoleSelectionStore selections,KnowledgeJourneyPort data,ObjectMapper json) {
        this.identity=identity;this.selections=selections;this.data=data;this.json=json;
    }
    public Page read(int page) {
        var actor=identity.requireEmployee();if(page<0 || page>50)throw new Failure(400,"INVALID_REQUEST");
        var rows=data.targets(actor.organizationId(),actor.learnerId(),21,page*20);
        var nodes=rows.stream().limit(20).map(this::target).toList();
        Node assigned=page==0?assigned(actor):null;
        if(!actor.equals(identity.requireEmployee()))throw new Failure(403,"FORBIDDEN");
        return new Page(assigned,nodes,page,20,rows.size()>20);
    }
    private Node assigned(Actor actor) {
        var placement=selections.placement(actor);if(placement.isEmpty())return null;
        var p=placement.get();
        if(p.roleId()==null && p.roleCode()==null)return null;
        String name=p.roleName()!=null&&!p.roleName().isBlank()?p.roleName():p.roleCode()!=null?p.roleCode():p.roleId();
        String assigned=p.levelName()==null?null:p.levelName().replaceFirst("(?i)^(?:rank|level)\\s*\\d+\\s*:\\s*", "").strip();
        // Employment placement is a navigation root, not a learning target or a source of skill requirements.
        return new Node("assigned",p.roleId(),p.roleCode(),name,null,null,assigned,null,null,null,true,"ASSIGNED","UNAVAILABLE",List.of());
    }
    private Node target(KnowledgeJourneyPort.Target row) {
        try {
            var tree=json.readTree(row.snapshot());
            if(tree.has("snapshotVersion") && tree.path("snapshotVersion").asInt()!=1)throw invalid();
            Role role=json.treeToValue(tree.has("snapshotVersion")?tree.get("role"):tree,Role.class);
            String levelId=tree.path("levelId").isTextual()?tree.get("levelId").asText():null;
            if(!row.roleId().equals(role.id()) || !row.jobPositionId().equals(role.jobPositionId()))throw invalid();
            JsonNode definitions=null;String source="SELECTION";
            if(row.frozenInput()!=null) {
                var frozen=json.readTree(row.frozenInput());var input=frozen.path("input");var binding=input.path("binding");
                if(!"REQUIREMENT_PATHWAY_V1".equals(frozen.path("flowVersion").asText()) ||
                    !row.id().toString().equals(frozen.path("selectionId").asText()) || row.revision()!=frozen.path("selectionRevision").asLong(-1) ||
                    !row.roleId().equals(binding.path("roleId").asText()) || !Objects.equals(levelId,binding.path("levelId").asText(null)))throw invalid();
                role=json.treeToValue(input.get("roleSnapshot"),Role.class);
                if(!row.roleId().equals(role.id()) || !row.jobPositionId().equals(role.jobPositionId()))throw invalid();
                definitions=input.path("catalog").path("requirements");if(!definitions.isArray() || definitions.size()>1000)throw invalid();
                source="FROZEN";
            }
            final String selectedLevel=levelId;
            var matches=role.levels().stream().filter(l->l.id().equals(selectedLevel)).toList();
            if(levelId!=null && matches.size()!=1)throw invalid();
            Level level=matches.isEmpty()?null:matches.getFirst();
            return new Node(row.id().toString(),role.id(),role.code(),role.name(),role.roleVersion(),levelId,level==null?null:level.name(),
                    level==null?null:level.rank(),row.revision(),row.selectedAt(),row.current(),"TARGET",source,
                    level==null?List.of():skills(level,definitions));
        } catch(Failure failure){throw failure;}catch(Exception failure){throw invalid();}
    }
    private List<Skill> skills(Level level,JsonNode definitions) {
        if(level.skills().size()>1000)throw new Failure(422,"JOURNEY_CATALOG_CAPACITY");
        var result=new ArrayList<Skill>();var seen=new HashSet<String>();
        for(var skill:level.skills()) {
            if(!seen.add(skill.id()))throw invalid();var knowledge=new ArrayList<Knowledge>();
            for(String name:skill.requiredKnowledgeLevels()) {
                String version=null;
                if(definitions!=null) {
                    var matches=new ArrayList<JsonNode>();
                    for(var d:definitions)if(skill.id().equals(d.path("skillId").asText()) && name.equals(d.path("knowledgeLevel").asText()))matches.add(d);
                    if(matches.size()!=1)throw invalid();var value=matches.getFirst().get("skillVersion");
                    if(value!=null && !value.isNull()){if(!value.isTextual() || value.asText().isBlank())throw invalid();version=value.asText();}
                }
                knowledge.add(new Knowledge(name,version));
            }
            result.add(new Skill(skill.id(),skill.name(),List.copyOf(knowledge)));
        }
        return List.copyOf(result);
    }
    private static Failure invalid(){return new Failure(503,"JOURNEY_PROVENANCE_INVALID");}
}
