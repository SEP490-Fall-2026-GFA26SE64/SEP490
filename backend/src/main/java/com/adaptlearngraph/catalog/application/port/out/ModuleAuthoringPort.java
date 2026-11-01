package com.adaptlearngraph.catalog.application.port.out;

import com.adaptlearngraph.catalog.domain.ModuleAuthoring.*;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

public interface ModuleAuthoringPort {
    Actor actor();
    <T> T transaction(Supplier<T> work);
    List<String> occupations(Actor actor);
    List<Grant> grants(String organizationId);
    void grant(String organizationId, String expertId, String occupationId, boolean active);
    List<Document> documents(String organizationId);
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
    void project(Document document, Revision revision, boolean archived);
    boolean referenced(Document document);
    boolean retainsCoverage(Document document);
    void pin(String organizationId, String learnerId, String moduleId, int revision);
    Optional<Integer> pinned(String organizationId, String learnerId, String moduleId);
}
