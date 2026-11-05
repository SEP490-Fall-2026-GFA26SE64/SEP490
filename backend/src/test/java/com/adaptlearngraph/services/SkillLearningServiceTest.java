package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.ModuleAuthoring;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.*;
import com.adaptlearngraph.entities.domain.LearningResources.*;
import com.adaptlearngraph.repository.*;
import org.junit.jupiter.api.*;
import java.util.*;
import java.util.function.Supplier;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class SkillLearningServiceTest {
    ModuleAuthoringPort modules; LearningContentPort learning; SkillLearningService service;
    Actor actor; List<Document> documents; Map<String,List<SkillCompletion>> completions; Set<String> assigned;
    @BeforeEach void setup() {
        modules=mock(ModuleAuthoringPort.class); learning=mock(LearningContentPort.class);
        service=new SkillLearningService(modules,learning);actor=new Actor("learner","org",Set.of("EMPLOYEE"));
        documents=new ArrayList<>();completions=new HashMap<>();assigned=new HashSet<>();
        when(modules.actor()).thenAnswer(c->actor);
        when(modules.transaction(any())).thenAnswer(c->c.<Supplier<?>>getArgument(0).get());
        when(modules.catalog("MicroSkill")).thenReturn(List.of(new Choice("skill","Skill"),new Choice("other","Other")));
        when(modules.documents(anyString())).thenAnswer(c->"org".equals(c.getArgument(0))?documents:List.of());
        when(modules.lock(anyString(),anyString())).thenAnswer(c->documents.stream().filter(d->d.organizationId().equals(c.getArgument(0))&&d.id().equals(c.getArgument(1))).findFirst());
        when(modules.pinned(anyString(),anyString(),anyString())).thenReturn(Optional.empty());
        when(learning.assigned(anyString(),anyString(),anyString())).thenAnswer(c->"org".equals(c.getArgument(0))&&"learner".equals(c.getArgument(1))&&assigned.contains(c.getArgument(2)));
        when(learning.completions(anyString(),anyString(),anyString())).thenAnswer(c->completions.getOrDefault(c.getArgument(0)+":"+c.getArgument(1)+":"+c.getArgument(2),List.of()));
    }
    Document module(String id,String skill) {
        Metadata meta=new Metadata(id,"0.12.0","ACTIVE","APPROVED","reviewer","2026-11-01T00:00:00Z");
        Content content=new Content("c-"+id,"Lesson","# Lesson","text/markdown","1",List.of(),"expert","2026-11-01T00:00:00Z");
        var payload=new ModuleAuthoring.Package(meta,id,"LESSON_AND_PRACTICE","module-content:c-"+id,"text/markdown","1",5,new BigDecimal("1000"),List.of(new Teaching(meta,skill,skill)),content);
        var r=new Revision(1,"RELEASED",payload,"expert","2026-11-01T00:00:00Z","reviewer","2026-11-01T00:00:00Z",null);
        return new Document(id,"org",List.of(),"expert","2026-11-01T00:00:00Z",1,true,false,1,List.of(r),List.of());
    }
    @Test void noCompletionReturnsExplicitFalseWithoutCreatingEvidence() {
        var r=service.eligibility("skill");assertFalse(r.eligible());assertNull(r.qualifyingCompletion());
        assertEquals("NO_COMPLETED_MODULE",r.reason());verify(learning,never()).complete(anyString(),anyString(),any());
    }
    @Test void oneCompletedOutOfAnyNumberIsEnoughAndOthersRemainStudyable() {
        for(int i=0;i<4;i++)documents.add(module("m"+i,"skill"));
        var proof=new SkillCompletion("skill","m0",1,"1","2026-11-01T00:00:00Z");
        completions.put("org:learner:skill",List.of(proof));
        assertTrue(service.eligibility("skill").eligible());assertEquals(proof,service.eligibility("skill").qualifyingCompletion());
        assertEquals(4,service.modules("skill").size());assertEquals(1,service.modules("skill").stream().filter(OptionalModule::completed).count());
        service.start("skill","m3");verify(learning).admitSelfStudy("org","learner","m3",1,"skill");verify(modules).pin("org","learner","m3",1);
    }
    @Test void otherLearnerAndOrganizationCannotUseTheCompletion() {
        completions.put("org:learner:skill",List.of(new SkillCompletion("skill","m",1,"1","2026-11-01T00:00:00Z")));
        actor=new Actor("someone-else","org",Set.of("EMPLOYEE"));assertFalse(service.eligibility("skill").eligible());
        actor=new Actor("learner","foreign",Set.of("EMPLOYEE"));assertFalse(service.eligibility("skill").eligible());
        assertThrows(ModuleAuthoringService.Failure.class,()->service.modules("skill"));
    }
    @Test void originalSkillEvidenceDoesNotFollowChangedGraphMapping() {
        completions.put("org:learner:skill",List.of(new SkillCompletion("skill","m",1,"old","2026-11-01T00:00:00Z")));
        documents.add(module("m","other"));assertTrue(service.eligibility("skill").eligible());assertFalse(service.eligibility("other").eligible());
    }
    @Test void authorizedSameSkillAnchorAllowsOptionalStartBeforeAssessmentEligibility() {
        documents.add(module("assigned","skill"));documents.add(module("optional","skill"));assigned.add("assigned");
        assertFalse(service.eligibility("skill").eligible());service.start("skill","optional");
        verify(learning).admitSelfStudy("org","learner","optional",1,"skill");verify(modules,never()).save(any());
    }
    @Test void cannotStartAnotherSkillOrAnUnreleasedModule() {
        documents.add(module("assigned","skill"));documents.add(module("other-module","other"));assigned.add("assigned");
        assertThrows(ModuleAuthoringService.Failure.class,()->service.start("skill","other-module"));
        assertThrows(ModuleAuthoringService.Failure.class,()->service.start("other","other-module"));
        verify(learning,never()).admitSelfStudy(anyString(),anyString(),anyString(),anyInt(),anyString());
    }
    @Test void wrongRoleCannotReadOrStart() {
        actor=new Actor("expert","org",Set.of("EXPERT"));
        assertThrows(ModuleAuthoringService.Failure.class,()->service.eligibility("skill"));
        assertThrows(ModuleAuthoringService.Failure.class,()->service.modules("skill"));
        assertThrows(ModuleAuthoringService.Failure.class,()->service.start("skill","m"));
    }
    @Test void finalLessonEvidenceUsesRealCompletionTimeAndNotRequestTime() {
        var d=module("m","skill");var lesson=d.released().payload().content().lessons().getFirst();
        when(learning.progress("org","learner","m",1)).thenReturn(List.of(new Progress(lesson.id(),0,List.of(),true,"2026-11-01T12:34:00Z",null)));
        SkillLearningService.recordCompletion(actor,"m",d.released(),learning);
        verify(learning).complete("org","learner",new SkillCompletion("skill","m",1,"1","2026-11-01T12:34:00Z"));
    }
    @Test void optionalListDescribesThePinnedVersionRatherThanInventingCompletionOfLatestContent() {
        var old=module("m","skill");var p=old.released().payload();
        var content=new Content("new-content","Updated lesson","# Updated","text/markdown","2",List.of(),"expert","2026-11-02T00:00:00Z");
        var updated=new ModuleAuthoring.Package(p.metadata(),"Updated title",p.moduleType(),"module-content:new-content",p.contentType(),"2",p.duration(),p.price(),p.teachings(),content);
        var latest=new Revision(2,"RELEASED",updated,"expert","2026-11-02T00:00:00Z","reviewer","2026-11-02T00:00:00Z",null);
        documents.add(new Document("m","org",List.of(),"expert",old.createdAt(),2,true,false,2,List.of(old.released(),latest),List.of()));
        when(modules.pinned("org","learner","m")).thenReturn(Optional.of(1));
        completions.put("org:learner:skill",List.of(new SkillCompletion("skill","m",1,"1","2026-11-01T00:00:00Z")));
        var item=service.modules("skill").getFirst();assertEquals("1",item.contentVersion());assertEquals("m",item.title());assertTrue(item.completed());
    }
    @Test void partialProgressCannotCreateEvidence() {
        var d=module("m","skill");when(learning.progress("org","learner","m",1)).thenReturn(List.of());
        SkillLearningService.recordCompletion(actor,"m",d.released(),learning);
        verify(learning,never()).complete(anyString(),anyString(),any());
    }
}
