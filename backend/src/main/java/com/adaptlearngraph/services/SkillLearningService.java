package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.LearningResources.*;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.*;
import com.adaptlearngraph.entities.domain.LearningContent;
import com.adaptlearngraph.repository.LearningContentPort;
import com.adaptlearngraph.repository.ModuleAuthoringPort;
import com.adaptlearngraph.services.ModuleAuthoringService.Failure;
import java.util.*;

/** Authoritative learning prerequisite only; assessment readiness/scoring belongs to its owner. */
public final class SkillLearningService {
    private final ModuleAuthoringPort modules;
    private final LearningContentPort learning;
    public SkillLearningService(ModuleAuthoringPort modules, LearningContentPort learning) {
        this.modules=modules; this.learning=learning;
    }
    private Actor employee() {
        Actor a=modules.actor();
        if(!a.roles().contains("EMPLOYEE")) throw new Failure(403,"Employee access required");
        return a;
    }
    public SkillEligibility eligibility(String skill) {
        return modules.transaction(() -> {
            Actor a=employee();
            var proof=learning.completions(a.organizationId(),a.id(),skill).stream()
                    .filter(item->learning.assignedRevision(a.organizationId(),a.id(),item.moduleId(),item.revision())).findFirst();
            if(proof.isEmpty() && modules.catalog("MicroSkill").stream().noneMatch(s->s.id().equals(skill)))
                throw new Failure(404,"Skill not found");
            return new SkillEligibility(skill,proof.isPresent(),proof.isPresent()?"MODULE_COMPLETED":"NO_COMPLETED_MODULE",proof.orElse(null));
        });
    }
    private static boolean teaches(Revision r,String skill) {
        return r!=null && r.payload().teachings().size()==1 && r.payload().teachings().getFirst().skillId().equals(skill);
    }
    private void requireSkillAccess(Actor a,String skill) {
        if(modules.catalog("MicroSkill").stream().noneMatch(s->s.id().equals(skill))) throw new Failure(404,"Skill not found");
        boolean accessible=modules.documents(a.organizationId()).stream().anyMatch(d->{
            Revision pinned=modules.pinned(a.organizationId(),a.id(),d.id())
                    .flatMap(n->d.revisions().stream().filter(r->r.number()==n).findFirst()).orElse(d.released());
            return teaches(pinned,skill) && learning.assigned(a.organizationId(),a.id(),d.id());
        });
        if(!accessible)throw new Failure(403,"Start from an authorized module for this skill");
    }
    private static boolean available(Document d,String skill) {
        return !d.archived() && teaches(d.released(),skill)
                && "APPROVED".equals(d.released().payload().metadata().reviewStatus())
                && "ACTIVE".equals(d.released().payload().metadata().status())
                && !d.released().payload().content().lessons().isEmpty()
                && d.released().payload().content().lessons().stream().allMatch(LearningContent.Lesson::complete);
    }
    public List<OptionalModule> modules(String skill) {
        return modules.transaction(()->{
            Actor a=employee();requireSkillAccess(a,skill);
            var proofs=learning.completions(a.organizationId(),a.id(),skill);
            return modules.documents(a.organizationId()).stream().filter(d->available(d,skill))
                    .filter(d->learning.assigned(a.organizationId(),a.id(),d.id()))
                    .sorted(Comparator.comparing(d->d.released().payload().title()))
                    .flatMap(d->{
                        var pin=modules.pinned(a.organizationId(),a.id(),d.id());
                        Revision r=pin.flatMap(n->d.revisions().stream().filter(v->v.number()==n).findFirst()).orElse(d.released());
                        if(!teaches(r,skill))return java.util.stream.Stream.empty();
                        boolean completed=proofs.stream().anyMatch(p->p.moduleId().equals(d.id()) && p.revision()==r.number());
                        return java.util.stream.Stream.of(new OptionalModule(d.id(),r.payload().title(),r.payload().contentVersion(),pin.isPresent(),completed));
                    }).toList();
        });
    }
    public void start(String skill,String module) {
        modules.transaction(()->{
            Actor a=employee();requireSkillAccess(a,skill);
            Document d=modules.lock(a.organizationId(),module).orElseThrow(()->new Failure(404,"Module not found"));
            if(!available(d,skill))throw new Failure(409,"No approved learning package for this skill");
            Revision r=modules.pinned(a.organizationId(),a.id(),module)
                    .flatMap(n->d.revisions().stream().filter(v->v.number()==n).findFirst()).orElse(d.released());
            if(!teaches(r,skill))throw new Failure(409,"Pinned module belongs to a different skill");
            if(!learning.assignedRevision(a.organizationId(),a.id(),module,r.number()))
                throw new Failure(403,"Start from an accepted option for this exact skill and knowledge level");
            learning.admitSelfStudy(a.organizationId(),a.id(),module,r.number(),skill);
            modules.pin(a.organizationId(),a.id(),module,r.number());
            return null;
        });
    }
    /** Runs in the same locked transaction as the final lesson write; no read request creates evidence. */
    static void recordCompletion(Actor a,String module,Revision revision,LearningContentPort learning) {
        if(revision.payload().teachings().size()!=1 || revision.payload().content().lessons().isEmpty())return;
        var progress=learning.progress(a.organizationId(),a.id(),module,revision.number());
        var times=new ArrayList<java.time.Instant>();
        for(var lesson:revision.payload().content().lessons()) {
            var p=progress.stream().filter(row->row.lessonId().equals(lesson.id()) && row.completedAt()!=null).findFirst();
            if(p.isEmpty())return;
            times.add(java.time.Instant.parse(p.get().completedAt()));
        }
        String at=Collections.max(times).toString();
        learning.complete(a.organizationId(),a.id(),new SkillCompletion(revision.payload().teachings().getFirst().skillId(),
                module,revision.number(),revision.payload().contentVersion(),at,
                revision.payload().knowledgeLevel()==null?null:revision.payload().knowledgeLevel().name(),revision.payload().skillVersion(),
                revision.payload().outcomeCodes(),revision.payload().teachings().getFirst().skillName()));
    }
}
