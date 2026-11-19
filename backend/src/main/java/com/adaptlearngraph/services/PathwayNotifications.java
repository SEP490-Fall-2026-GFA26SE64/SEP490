package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.repository.*;
import java.util.*;

/** Semantic notifications share the domain transaction and never mutate state from a read. */
public final class PathwayNotifications {
    private final LearningNotificationJpaRepository notifications;
    public PathwayNotifications(LearningNotificationJpaRepository notifications){this.notifications=notifications;}
    private void send(RequirementPathwayJpaRepository.Row row,String key,String kind,String title,String body) {
        InitialJpa.requireTransaction();
        notifications.pathway(UUID.randomUUID(),row.getOrganizationId().toString(),row.getLearnerId().toString(),
                "V4:"+row.getOrganizationId()+":"+row.getRequestId()+":"+key,kind,title,
                "Role / Vị trí: "+row.getRoleName()+" · "+row.getLevelName()+"\n"+body,
                "/employee/pathway?view=role&archive="+row.getRequestId());
    }
    public void event(RequirementPathwayJpaRepository.Row row,long revision,String type,Map<String,Object> detail) {
        String title=switch(type) {
            case "RULE_PATHWAY_APPROVED" -> "Pathway approved / Lộ trình được duyệt";
            case "RULE_PATHWAY_REJECTED" -> "Pathway rejected / Lộ trình bị từ chối";
            case "RULE_PATHWAY_COMPLETED" -> "Pathway completed / Hoàn tất lộ trình";
            case "CERTIFICATE_APPROVED" -> "Certificate approved / Chứng chỉ được duyệt";
            case "CERTIFICATE_REJECTED" -> "Certificate rejected / Chứng chỉ bị từ chối";
            default -> null;
        };
        if(title==null)return;
        String key=type.equals("RULE_PATHWAY_COMPLETED")?type:type+":"+detail.getOrDefault("decisionId",revision);
        String body=title+".\nPathway / Lộ trình: "+row.getRequestId()+" · revision "+revision;
        if(detail.containsKey("certificateName"))body+="\nCertificate / Chứng chỉ: "+detail.get("certificateName");
        if(detail.containsKey("skillName"))body+="\nRequirement / Yêu cầu: "+detail.get("skillName")+" · "+detail.get("knowledgeLevel")+" · step "+detail.get("stepId");
        if(detail.containsKey("reason"))body+="\nReason / Lý do: "+detail.get("reason");
        if(type.equals("RULE_PATHWAY_COMPLETED"))body+="\nRequired steps are resolved (fulfilled or bypassed). Bypass does not award achievement. / Các bước bắt buộc đã hoàn thành hoặc được bỏ qua; bỏ qua không công nhận năng lực.";
        send(row,key,type,title,body);
    }
    public void delta(RequirementPathwayJpaRepository.Row row,long revision,Plan before,Plan after,String origin,UUID event) {
        var added=new ArrayList<String>();var parallel=new ArrayList<String>();
        for(var step:after.steps()) {
            var old=before.steps().stream().filter(item->item.key().equals(step.key())).findFirst();
            var entries=new ArrayList<String>();
            for(var option:step.options())if(old.isEmpty() || old.get().options().stream().noneMatch(o->o.key().equals(option.key()) && o.moduleRevision()==option.moduleRevision()))
                entries.add("Module: "+option.title()+" ["+option.moduleId()+" · v"+option.moduleRevision()+"]");
            if(step.certificate()!=null && (old.isEmpty() || old.get().certificate()==null
                    || !step.certificate().id().equals(old.get().certificate().id()) || !step.certificate().version().equals(old.get().certificate().version())))
                entries.add("Certificate / Chứng chỉ: "+step.certificate().name()+" ["+step.certificate().id()+" · "+step.certificate().version()+"]");
            String location=step.kind()+" · "+step.requirement().skillName()+" · "+step.requirement().knowledgeLevel()
                    +" · Skill v"+step.requirement().skillVersion()+" · step "+step.id();
            for(String entry:entries) {
                String line=entry+" → "+location;added.add(line);
                if(step.sourceBypassId()!=null)parallel.add(line+" · bypass "+step.sourceBypassId());
                else if(old.isPresent() && old.get().state()==State.BYPASSED)
                    parallel.add(line+" · previously bypassed requirement / yêu cầu đã từng được bỏ qua");
            }
        }
        if("ASSESSMENT".equals(origin) && !added.isEmpty()) {
            String title="Pathway recalculated / Đã tính lại lộ trình";
            String body=added.isEmpty()?"No modules or certificates were added. / Không bổ sung module hoặc chứng chỉ.":
                    "Added provision / Nội dung bổ sung:\n"+String.join("\n",added);
            if(!parallel.isEmpty())body+="\nIncludes bypass-related provision / Có nội dung bổ sung liên quan bypass.";
            body+="\nSaved pathway provision remains subject to approval and prerequisites. / Nội dung đã lưu vẫn tuân theo phê duyệt và điều kiện tiên quyết.";
            send(row,"RECALCULATED:"+Objects.toString(event,Long.toString(revision)),"PATHWAY_RECALCULATED",title,body);
        }
    }
    public void bypassProvision(UUID org,UUID learner,BypassedGapService.Gap gap) {
        InitialJpa.requireTransaction();
        var providers=new LinkedHashMap<String,String>();
        for(var option:gap.options())providers.put("MODULE:"+option.moduleId()+":"+option.moduleRevision()+":"+option.contentVersion(),"Module: "+option.title());
        if(gap.certificate()!=null)providers.put("CERTIFICATE:"+gap.certificate().id()+":"+gap.certificate().version(),"Certificate / Chứng chỉ: "+gap.certificate().name());
        for(var provider:providers.entrySet())notifications.pathway(UUID.randomUUID(),org.toString(),learner.toString(),
                "V5:BYPASS:"+gap.bypassId()+":"+RoleBaselineFlow.hash(provider.getKey()+":"+gap.requirement().proofKey()),"BYPASS_PROVISION_ADDED",
                "Supplementary learning available / Đã có nội dung học bổ sung",
                provider.getValue()+"\nRequirement / Yêu cầu: "+gap.requirement().skillName()+" · "+gap.requirement().knowledgeLevel()
                    +"\nOriginal gap / Gap gốc: "+gap.roleName()+" · "+gap.levelName()+" · "+gap.sourceRequestId()+" · bypass "+gap.bypassId()
                    +"\nNonblocking supplementation; original completion is retained. / Học bổ sung không khóa mục tiêu; giữ nguyên hoàn thành cũ.",
                "/employee/pathway?view=role");
    }
}
