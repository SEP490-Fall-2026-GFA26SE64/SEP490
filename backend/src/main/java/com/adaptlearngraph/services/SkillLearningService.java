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
    public interface Admission { String reason(Actor actor,Document document,Revision revision); }
    private final Admission admission;
    private final ModuleAuthoringPort modules;
    private final LearningContentPort learning;
    public SkillLearningService(ModuleAuthoringPort modules, LearningContentPort learning) {
        this(modules,learning,(a,d,r)->learning.assignedRevision(a.organizationId(),a.id(),d.id(),r.number())?null:"MODULE_NOT_AUTHORIZED");
    }
    public SkillLearningService(ModuleAuthoringPort modules,LearningContentPort learning,Admission admission) {
        this.modules=modules; this.learning=learning; this.admission=admission;
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
    private void requireCatalogSkill(String skill) {
        if(modules.catalog("MicroSkill").stream().noneMatch(s->s.id().equals(skill)))throw new Failure(404,"Skill not found");
    }
    private static boolean teaches(Revision r,String skill) {
        return r!=null && r.payload().teachings().size()==1 && r.payload().teachings().getFirst().skillId().equals(skill);
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
            Actor a=employee();requireCatalogSkill(skill);
            var proofs=learning.completions(a.organizationId(),a.id(),skill);
            return modules.documents(a.organizationId()).stream().filter(d->available(d,skill))
                    .sorted(Comparator.comparing(d->d.released().payload().title()))
                    .flatMap(d->{
                        var pin=modules.pinned(a.organizationId(),a.id(),d.id());
                        Revision r=pin.flatMap(n->d.revisions().stream().filter(v->v.number()==n).findFirst()).orElse(d.released());
                        if(!teaches(r,skill))return java.util.stream.Stream.empty();
                        boolean completed=proofs.stream().anyMatch(p->p.moduleId().equals(d.id()) && p.revision()==r.number());
                        return java.util.stream.Stream.of(new OptionalModule(d.id(),r.payload().title(),r.payload().contentVersion(),pin.isPresent(),completed,admission.reason(a,d,r),r.payload().knowledgeLevel(),r.payload().skillVersion(),r.number()));
                    }).toList();
        });
    }
    /** One organization-scoped search; expensive live admission checks run only for the requested page. */
    public ModuleSearchPage search(String search,String skillId,String level,int page) {
        String query=search==null?"":search.strip().toLowerCase(Locale.ROOT);
        if(query.length()>100 || skillId!=null && (skillId.isBlank() || skillId.length()>200) || page<0 || page>10000)
            throw new Failure(400,"Invalid module search");
        com.adaptlearngraph.entities.domain.KnowledgeLevel knowledge=null;
        if(level!=null)try {knowledge=com.adaptlearngraph.entities.domain.KnowledgeLevel.valueOf(level);}
        catch(IllegalArgumentException invalid){throw new Failure(400,"Invalid knowledge level");}
        final var requested=knowledge;
        return modules.transaction(()->{
            Actor actor=employee();
            var skills=new HashMap<String,String>();modules.catalog("ModuleSkill").forEach(c->skills.put(c.id(),c.name()));
            record Candidate(Document document,Revision revision,String skill,boolean started) {}
            var candidates=new ArrayList<Candidate>();
            for(var doc:modules.documents(actor.organizationId())) {
                if(!actor.organizationId().equals(doc.organizationId()) || doc.released()==null || doc.released().payload().teachings().size()!=1)continue;
                String skill=doc.released().payload().teachings().getFirst().skillId();
                if(!skills.containsKey(skill) || skillId!=null && !skillId.equals(skill) || !available(doc,skill))continue;
                var pin=modules.pinned(actor.organizationId(),actor.id(),doc.id());
                var revision=pin.flatMap(n->doc.revisions().stream().filter(r->r.number()==n).findFirst()).orElse(doc.released());
                if(!teaches(revision,skill) || requested!=null && requested!=revision.payload().knowledgeLevel())continue;
                var p=revision.payload();
                String text=doc.id()+" "+p.title()+" "+skill+" "+skills.get(skill);
                if(!text.toLowerCase(Locale.ROOT).contains(query))continue;
                candidates.add(new Candidate(doc,revision,skill,pin.isPresent()));
            }
            candidates.sort(Comparator.comparing((Candidate c)->c.revision().payload().title(),String.CASE_INSENSITIVE_ORDER).thenComparing(c->c.document().id()));
            var proofs=new HashMap<String,List<SkillCompletion>>();
            var items=candidates.stream().skip((long)page*20).limit(20).map(c->{
                var p=c.revision().payload();
                var completed=proofs.computeIfAbsent(c.skill(),skill->learning.completions(actor.organizationId(),actor.id(),skill)).stream()
                    .anyMatch(proof->proof.moduleId().equals(c.document().id()) && proof.revision()==c.revision().number());
                var module=new OptionalModule(c.document().id(),p.title(),p.contentVersion(),c.started(),completed,admission.reason(actor,c.document(),c.revision()),p.knowledgeLevel(),p.skillVersion(),c.revision().number());
                return new ModuleSearchItem(c.skill(),skills.get(c.skill()),module);
            }).toList();
            return new ModuleSearchPage(items,page,20,candidates.size());
        });
    }
    public void start(String skill,String module) {
        modules.transaction(()->{
            Actor a=employee();requireCatalogSkill(skill);
            Document d=modules.lock(a.organizationId(),module).orElseThrow(()->new Failure(404,"Module not found"));
            if(!available(d,skill))throw new Failure(409,"No approved learning package for this skill");
            Revision r=modules.pinned(a.organizationId(),a.id(),module)
                    .flatMap(n->d.revisions().stream().filter(v->v.number()==n).findFirst()).orElse(d.released());
            if(!teaches(r,skill))throw new Failure(409,"Pinned module belongs to a different skill");
            String reason=admission.reason(a,d,r);
            if(reason!=null)throw new Failure(403,reason);
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
                List.of(),revision.payload().teachings().getFirst().skillName()));
    }
}
