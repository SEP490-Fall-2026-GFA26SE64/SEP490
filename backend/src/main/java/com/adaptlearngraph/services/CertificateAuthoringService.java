package com.adaptlearngraph.services;

import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.CertificateAuthoringStore.Document;
import com.adaptlearngraph.repository.QuestionBankPorts;
import com.adaptlearngraph.entities.domain.CertificateCatalog.*;
import com.adaptlearngraph.entities.domain.QuestionBank.Actor;
import com.adaptlearngraph.repository.InitialPathwayPorts.Failure;
import com.adaptlearngraph.services.CertificateCatalogService.CreateInput;
import java.util.*;
import org.springframework.transaction.support.TransactionTemplate;

/** Draft commands commit in PostgreSQL. The durable publication queue projects only manager-approved versions. */
public final class CertificateAuthoringService {
 public record Edit(long revision,CreateInput input) {}
 public record Decision(UUID id,long revision,String decision,String reason) {}
 public record Directory(List<Document> drafts,List<Definition> published,List<CertificateCatalogRepository.SkillChoice> skills,boolean manager,List<com.adaptlearngraph.entities.domain.QuestionBank.Choice> experts) {}
 private final QuestionBankPorts.Actors actors;private final QuestionBankPorts.Catalog people;
 private final CertificateCatalogRepository catalog;private final CertificateAuthoringStore store;
 private final ReviewSubmissionNotifications submissionNotices;
 private final LearningNotificationJpaRepository notices;private final TransactionTemplate tx;
 public CertificateAuthoringService(QuestionBankPorts.Actors actors,QuestionBankPorts.Catalog people,CertificateCatalogRepository catalog,CertificateAuthoringStore store,LearningNotificationJpaRepository notices,TransactionTemplate tx,ReviewSubmissionNotifications submissions){this.submissionNotices=submissions;this.actors=actors;this.people=people;this.catalog=catalog;this.store=store;this.notices=notices;this.tx=tx;}
 private Actor actor(){var a=actors.require();if(!a.manager()&&!a.expert())throw new Failure(403,"FORBIDDEN");return a;}
 private Actor expert(){var a=actor();if(!a.expert())throw new Failure(403,"EXPERT_REQUIRED");return a;}
 public Directory directory(){var a=actor();var drafts=store.list(a.organization());if(drafts.size()>1000)throw new Failure(422,"CERTIFICATE_DIRECTORY_CAPACITY");return new Directory(drafts,published(a),catalog.choices(a.organization()),a.manager(),people.experts(a));}
 private List<Definition> published(Actor a){var all=new ArrayList<Definition>();for(int offset=0;offset<1000;offset+=100){var page=catalog.list(a.organization(),offset,100);all.addAll(page);if(page.size()<100)return all;}throw new Failure(422,"CERTIFICATE_DIRECTORY_CAPACITY");}
 public Create validate(CreateInput i){var a=expert();if(i==null)throw new Failure(400,"INVALID_REQUEST");var c=new Create(i.skillId(),com.adaptlearngraph.entities.domain.KnowledgeLevel.valueOf(i.knowledgeLevel()),i.name(),i.referenceUrl(),i.expectedSkillVersion(),i.replacesDefinitionId(),i.description());catalog.validate(a.organization(),c);return c;}
 public record Selection(CreateInput input,UUID draftId,Long draftRevision) {}
 public boolean canEdit(Document d){var a=expert();return a.id().equals(d.authorId())&&Set.of("DRAFT","REJECTED","PUBLISH_FAILED","SUBMITTED").contains(d.state());}
 public List<UUID> submit(UUID key,List<CreateInput> inputs){return submitSelections(key,inputs==null?null:inputs.stream().map(i->new Selection(i,null,null)).toList());}
 public List<UUID> submitSelections(UUID key,List<Selection> selections){
  if(selections==null||selections.stream().anyMatch(x->x==null||x.input()==null))throw new Failure(400,"INVALID_REQUEST");
  var inputs=selections.stream().map(Selection::input).toList();
  var a=expert();if(key==null||inputs==null||inputs.isEmpty()||inputs.size()>500)throw new Failure(400,"INVALID_REQUEST");
  String hash=RoleBaselineFlow.hash(store.encode(selections));
  return tx.execute(s->{store.actor(a.organization(),a.id());var replay=store.replay(a.organization(),a.id(),key,hash);if(replay.isPresent())return replay.get();
   var sorted=inputs.stream().sorted(Comparator.comparing(CreateInput::skillId).thenComparing(CreateInput::knowledgeLevel)).toList();var keys=new HashSet<String>();var ids=new ArrayList<UUID>();
   for(var i:sorted){var c=validate(i);if(!keys.add(c.skillId()+":"+c.knowledgeLevel()))throw new Failure(409,"DUPLICATE_IMPORT_SCOPE");store.scope(a.organization(),c.skillId(),c.knowledgeLevel().name());
    var selection=selections.stream().filter(x->x.input()==i).findFirst().orElseThrow();
    Document replacement=null;
    if(selection.draftId()!=null){replacement=store.lock(a.organization(),selection.draftId());if(!canEdit(replacement)||selection.draftRevision()==null||replacement.revision()!=selection.draftRevision()||!replacement.input().skillId().equals(c.skillId())||!replacement.input().knowledgeLevel().equals(c.knowledgeLevel().name()))throw new Failure(409,"CERTIFICATE_DRAFT_CHANGED");}
    else if(store.open(a.organization(),c.skillId(),c.knowledgeLevel().name()))throw new Failure(409,"CERTIFICATE_OPEN_DRAFT_EXISTS");
    catalog.requireReplacement(a.organization(),c);UUID id=replacement==null?UUID.randomUUID():replacement.id();
    var normalized=new CreateInput(c.skillId(),c.knowledgeLevel().name(),c.name(),c.referenceUrl(),c.expectedSkillVersion(),c.replacesDefinitionId(),c.description());
    String name=catalog.choices(a.organization()).stream().filter(x->x.skillId().equals(c.skillId())).findFirst().orElseThrow(()->new Failure(409,"SKILL_VERSION_CHANGED")).skillName();
    if(replacement==null)store.insert(a.organization(),a.id(),id,normalized,name);else store.edit(a.organization(),id,normalized);
    store.event(a.organization(),store.lock(a.organization(),id),a.id(),replacement==null?"DRAFT_CREATED":"DRAFT_UPDATED");
    store.state(a.organization(),id,"SUBMITTED",null,"");store.event(a.organization(),store.lock(a.organization(),id),a.id(),"SUBMITTED");ids.add(id);
   }
   store.receipt(a.organization(),a.id(),key,hash,ids);submissionNotices.submitted(a.organization().toString(),a.id().toString(),"CERTIFICATES",ids.size());return ids;
  });
 }
 public Document edit(UUID id,Edit e){var a=expert();return tx.execute(s->{var d=store.lock(a.organization(),id);if(!a.id().equals(d.authorId()))throw new Failure(403,"CERTIFICATE_AUTHOR_REQUIRED");if(e!=null&&d.state().equals("DRAFT")&&d.revision()==e.revision()+1&&store.encode(d.input()).equals(store.encode(e.input())))return d;if(e==null||e.revision()!=d.revision()||!Set.of("DRAFT","REJECTED","PUBLISH_FAILED").contains(d.state()))throw new Failure(409,"STALE_CERTIFICATE_REVISION");
  var c=validate(e.input());if(!c.skillId().equals(d.input().skillId())||!c.knowledgeLevel().name().equals(d.input().knowledgeLevel()))throw new Failure(409,"CERTIFICATE_SCOPE_LOCKED");catalog.requireReplacement(a.organization(),c);store.edit(a.organization(),id,e.input());var result=store.lock(a.organization(),id);store.event(a.organization(),result,a.id(),"DRAFT_UPDATED");return result;});}
 public Document resubmit(UUID id,long revision){var a=expert();UUID retry=UUID.nameUUIDFromBytes(("CERTIFICATE-RESUBMIT:"+id+":"+revision).getBytes(java.nio.charset.StandardCharsets.UTF_8));String hash=RoleBaselineFlow.hash("RESUBMIT:"+id+":"+revision);return tx.execute(s->{store.actor(a.organization(),a.id());if(store.replay(a.organization(),a.id(),retry,hash).isPresent())return store.lock(a.organization(),id);var d=store.lock(a.organization(),id);if(!a.id().equals(d.authorId()))throw new Failure(403,"CERTIFICATE_AUTHOR_REQUIRED");if(d.revision()!=revision||!Set.of("DRAFT","REJECTED","PUBLISH_FAILED").contains(d.state()))throw new Failure(409,"STALE_CERTIFICATE_REVISION");var c=validate(d.input());catalog.requireReplacement(a.organization(),c);if(!d.state().equals("DRAFT"))store.edit(a.organization(),id,d.input());store.state(a.organization(),id,"SUBMITTED",null,"");var result=store.lock(a.organization(),id);store.event(a.organization(),result,a.id(),"SUBMITTED");store.receipt(a.organization(),a.id(),retry,hash,List.of(id));submissionNotices.submitted(a.organization().toString(),a.id().toString(),"CERTIFICATES",1);return result;});}
 public Document viewed(UUID id,long revision){var a=actor();if(!a.manager())throw new Failure(403,"MANAGER_REQUIRED");return tx.execute(s->{var d=store.lock(a.organization(),id);if(d.revision()!=revision||!d.state().equals("SUBMITTED"))throw new Failure(409,"STALE_CERTIFICATE_REVISION");store.viewed(a.organization(),d,a.id());return d;});}
 public List<Document> decide(List<Decision> decisions){var a=actor();if(!a.manager())throw new Failure(403,"MANAGER_REQUIRED");if(decisions==null||decisions.isEmpty()||decisions.size()>100||decisions.stream().anyMatch(Objects::isNull)||decisions.stream().map(Decision::id).distinct().count()!=decisions.size())throw new Failure(400,"INVALID_REQUEST");return tx.execute(s->{var result=new ArrayList<Document>();
  for(var c:decisions.stream().sorted(Comparator.comparing(Decision::id)).toList()){
   var d=store.lock(a.organization(),c.id());if(c.revision()!=d.revision())throw new Failure(409,"STALE_CERTIFICATE_REVISION");
   if(!Set.of("APPROVE","REJECT").contains(c.decision()))throw new Failure(400,"INVALID_DECISION");
   String target=c.decision().equals("APPROVE")?"PUBLISHING":"REJECTED";
   if((d.state().equals(target)||c.decision().equals("APPROVE")&&d.state().equals("PUBLISHED"))&&a.id().equals(d.reviewerId())&&Objects.equals(d.reason(),c.reason()==null?"":c.reason().strip())){result.add(d);continue;}
   if(!d.state().equals("SUBMITTED"))throw new Failure(409,"CERTIFICATE_NOT_SUBMITTED");if(!store.hasViewed(a.organization(),d,a.id()))throw new Failure(409,"REVIEW_EXACT_CERTIFICATE_FIRST");
   if(a.id().equals(d.authorId()))throw new Failure(403,"SELF_REVIEW_FORBIDDEN");
   String reason=c.reason()==null?"":c.reason().strip();if(reason.length()>2000||target.equals("REJECTED")&&reason.isBlank())throw new Failure(400,"REJECTION_REASON_REQUIRED");
   if(target.equals("PUBLISHING")){var i=d.input();catalog.validate(a.organization(),new Create(i.skillId(),com.adaptlearngraph.entities.domain.KnowledgeLevel.valueOf(i.knowledgeLevel()),i.name(),i.referenceUrl(),i.expectedSkillVersion(),i.replacesDefinitionId(),i.description()));}
   store.state(a.organization(),d.id(),target,a.id(),reason);var next=store.lock(a.organization(),d.id());store.event(a.organization(),next,a.id(),c.decision());
   if(target.equals("REJECTED"))notifyAuthor(a.organization(),next,"CERTIFICATE_DEFINITION_REJECTED",reason);result.add(next);
  }return result;});}

 private void notifyAuthor(UUID org,Document d,String kind,String body){notices.pathway(UUID.randomUUID(),org.toString(),d.authorId().toString(),"CERT:"+d.id()+":"+d.revision()+":"+kind,kind,kind.endsWith("PUBLISH_FAILED")?"Certificate needs attention":kind.endsWith("REJECTED")?"Certificate rejected / Chứng chỉ bị từ chối":"Certificate published / Chứng chỉ đã được duyệt",d.input().name()+"\n"+body,"/expert/certificates?certificate="+d.id());}
 /** SKIP LOCKED plus graph idempotency make an interrupted projection recoverable without republishing A/B. */
 public boolean publishOne(){return Boolean.TRUE.equals(tx.execute(s->{var next=store.next();if(next.isEmpty())return false;var d=next.get();var org=store.organization(d.id());try{
   var i=d.input();var c=new Create(i.skillId(),com.adaptlearngraph.entities.domain.KnowledgeLevel.valueOf(i.knowledgeLevel()),i.name(),i.referenceUrl(),i.expectedSkillVersion(),i.replacesDefinitionId(),i.description());
   var published=catalog.publish(org,d.authorId(),d.reviewerId(),d.id(),c);store.published(org,d,published.id());var result=store.lock(org,d.id());store.event(org,result,d.reviewerId(),"PUBLISHED");notifyAuthor(org,result,"CERTIFICATE_DEFINITION_PUBLISHED", "Applies to new pathways only / Chỉ áp dụng cho pathway tạo mới.");
  }catch(com.adaptlearngraph.exception.InitialPathwayFailure failure){store.retry(d.id(),failure.code(),failure.status()<500);var failed=store.lock(org,d.id());if(failed.state().equals("PUBLISH_FAILED")){store.event(org,failed,d.reviewerId(),"PUBLISH_FAILED");notifyAuthor(org,failed,"CERTIFICATE_DEFINITION_PUBLISH_FAILED",failure.code());}}catch(RuntimeException failure){throw failure;}
  return true;
 }));}
}
