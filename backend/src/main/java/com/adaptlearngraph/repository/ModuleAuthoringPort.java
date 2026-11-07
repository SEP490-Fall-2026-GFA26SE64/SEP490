package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.ModuleAuthoring.*;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

public interface ModuleAuthoringPort {
    Actor actor();
    <T> T transaction(Supplier<T> work);
    List<String> jobPositions(Actor actor);
    List<Grant> grants(String organizationId);
    void grant(String organizationId, String expertId, String jobPositionId, boolean active);
    List<Document> documents(String organizationId);
    default List<Document> releasedCandidates(String organizationId,List<String> skills,int maximum) {
        throw new UnsupportedOperationException("Bounded released module lookup is unavailable");
    }
    default List<RetainedModule> retainedCandidates(String organizationId,String learnerId,List<String> skills,List<String> currentModules,int maximum) {
        throw new UnsupportedOperationException("Bounded retained module lookup is unavailable");
    }
    List<CatalogModule> graphModules(String organizationId);
    List<String> managedModuleIds();
    List<Intake> intakes(String organizationId);
    boolean intakeExists(String id);
    void lockCatalogIdentity(String id);
    void saveIntake(Intake intake);
    String importedMarkdown(String uri);
    Optional<Document> lock(String organizationId, String id);
    void save(Document document);
    void delete(Document document);
    List<Content> contents(String organizationId);
    void saveContent(String organizationId, Content content);
    List<Choice> catalog(String kind);
    KnowledgeDefinition requireKnowledge(String organizationId,String skillId,String knowledgeLevel,List<String> outcomeCodes);
    void project(Document document, Revision revision, boolean archived);
    boolean referenced(Document document);
    boolean retainsCoverage(Document document);
    void pin(String organizationId, String learnerId, String moduleId, int revision);
    Optional<Integer> pinned(String organizationId, String learnerId, String moduleId);
}
