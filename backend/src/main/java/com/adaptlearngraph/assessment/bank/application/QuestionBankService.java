package com.adaptlearngraph.assessment.bank.application;

import com.adaptlearngraph.assessment.bank.application.port.in.QuestionBankUseCase;
import com.adaptlearngraph.assessment.bank.application.port.out.QuestionBankPorts.*;
import com.adaptlearngraph.assessment.bank.domain.QuestionBank;
import com.adaptlearngraph.assessment.bank.domain.QuestionBank.*;
import java.time.*;
import java.util.*;
import java.util.function.Function;

public final class QuestionBankService implements QuestionBankUseCase {
    private final Actors actors;
    private final Catalog catalog;
    private final Store store;
    private final Clock clock;
    private final int maxRows;
    private final long maxBytes;
    public QuestionBankService(Actors actors, Catalog catalog, Store store, Clock clock) {
        this(actors,catalog,store,clock,500,10485760);
    }
    public QuestionBankService(Actors actors,Catalog catalog,Store store,Clock clock,int maxRows,long maxBytes) {
        if(maxRows<1||maxRows>5000||maxBytes<1024||maxBytes>52428800)throw new IllegalArgumentException("Invalid Question Bank import limits");
        this.maxRows=maxRows;this.maxBytes=maxBytes;
        this.actors=actors; this.catalog=catalog; this.store=store; this.clock=clock;
    }
    private Actor actor() {
        var a=actors.require();
        require(a!=null && a.organization()!=null && (a.expert()||a.manager()),403,"Question Bank staff access required");
        return a;
    }
    private <T> T run(Function<QuestionBank,T> action) { return store.atomic(actor(),action); }
    @Override public Session session() { var a=actor(); var people=new ArrayList<>(catalog.experts(a));people.addAll(catalog.managers(a));return new Session(a,catalog.skills(a),catalog.experts(a),people,maxRows,maxBytes); }
    @Override public View read() { return run(this::view); }
    private View view(QuestionBank b) { return new View(b.id,b.name,b.questions,b.history); }
    private Question find(QuestionBank b,UUID id) { return b.questions.stream().filter(q->q.id.equals(id)).findFirst().orElseThrow(()->new Failure(404,"Question not found")); }
    private Version latest(Question q) { require(!q.versions.isEmpty(),409,"Question has no content version"); return q.versions.getLast(); }
    private void expected(Question q,long revision) { require(q.revision==revision,409,"Question changed. Reload and review the current version."); }
    private void owner(Question q,Actor a) { require(a.expert()&&a.id().equals(q.owner),403,"Only the responsible Expert can change this question"); catalog.requireExpert(a,a.id()); }
    private void manager(Actor a) { require(a.manager(),403,"L&D Manager required"); }
    private String text(String s,String field,int max) { require(s!=null&&!s.isBlank()&&s.length()<=max,400,field+" is required or too long"); return s.strip(); }
    private String code(String s) { String v=text(s,"Question code",100).toUpperCase(Locale.ROOT); require(v.matches("[A-Z0-9][A-Z0-9_.-]*"),400,"Use letters, digits, dot, dash or underscore in question code"); return v; }
    private Content content(Actor a,Content c,boolean complete) {
        require(c!=null,400,"Question content required");
        String prompt=text(c.prompt(),"Prompt",20000), skill=text(c.skillId(),"MicroSkill",160);
        String name=catalog.requireSkill(a,skill);
        require(c.options().size()<=4,400,"Exactly four choices are supported");
        var options=new ArrayList<String>(); for(String o:c.options()) { require(o!=null&&o.length()<=5000,400,"Invalid option"); options.add(o.strip()); }
        while(options.size()<4) options.add("");
        require(c.correctAnswer()==null||(c.correctAnswer()>=0&&c.correctAnswer()<4),400,"Choose one correct answer");
        String difficulty=c.difficulty()==null||c.difficulty().isBlank()?null:c.difficulty();
        require(difficulty==null||Set.of("EASY","MEDIUM","HARD").contains(difficulty),400,"Invalid difficulty");
        String explanation=c.explanation()==null?"":c.explanation().strip(); require(explanation.length()<=20000,400,"Explanation too long");
        if(complete) {
            require(options.stream().noneMatch(String::isBlank)&&options.stream().map(this::normalized).distinct().count()==4,400,"Four nonempty distinct choices required");
            require(c.correctAnswer()!=null&&difficulty!=null&&!explanation.isBlank(),400,"Answer, difficulty and explanation required before submission");
        }
        return new Content(prompt,options,c.correctAnswer(),skill,name,difficulty,explanation);
    }
    private void publishedEligibility(Actor a,Content original) {
        Content c=content(a,original,false);
        require(c.options().stream().noneMatch(String::isBlank)&&c.options().stream().map(this::normalized).distinct().count()==4&&c.correctAnswer()!=null&&c.difficulty()!=null,409,"Published content is no longer eligible for reactivation");
        // Historical explanations may legitimately be absent; never manufacture them or mutate a published definition.
    }
    private String normalized(String s) { return s.strip().replaceAll("\\s+"," ").toLowerCase(Locale.ROOT); }
    private String signature(Content c) { return normalized(c.prompt())+"\u0000"+c.options().stream().map(this::normalized).toList(); }
    private List<String> duplicates(QuestionBank b,Content c,UUID except) {
        return b.questions.stream().filter(q->!q.id.equals(except)).filter(q->q.versions.stream().anyMatch(v->signature(v.content).equals(signature(c)))).map(q->q.code).toList();
    }
    private void audit(QuestionBank b,Question q,Version v,Actor a,String action,String reason) {
        b.history.add(new Audit(UUID.randomUUID(),q.id,v==null?null:v.id,action,a.id(),clock.instant(),reason,v==null?null:v.content));
    }
    private void notice(QuestionBank b,UUID target,String title,String body) {
        if(target==null)return;
        var n=new Notice();n.id=UUID.randomUUID();n.recipient=target;n.title=title;n.body=body;n.createdAt=clock.instant();b.notices.add(n);
    }
    private void notifyManagers(QuestionBank b,Actor a,String title,String body) { for(var recipient:catalog.managers(a)) notice(b,UUID.fromString(recipient.id()),title,body); }
    private Question create(QuestionBank b,Actor a,String code,Content content) {
        require(b.questions.stream().noneMatch(q->q.code.equals(code)),409,"Question code already exists");
        var q=new Question();q.id=UUID.randomUUID();q.code=code;q.createdBy=a.id();q.createdAt=clock.instant();q.owner=a.id();q.revision=1;
        q.versions.add(draft(1,content,a));b.questions.add(q);audit(b,q,latest(q),a,"CREATED",null);return q;
    }
    private Version draft(int number,Content content,Actor a) {
        var v=new Version();v.id=UUID.randomUUID();v.number=number;v.state="DRAFT";v.content=content;v.editedBy=a.id();v.editedAt=clock.instant();return v;
    }
    @Override public View save(Save input) {
        var a=actor();require(a.expert(),403,"Expert authoring required");
        return store.atomic(a,b->{
            String c=code(input.code());Content body=content(a,input.content(),false);
            if(input.id()==null) {
                require(input.acknowledgeDuplicates()||duplicates(b,body,null).isEmpty(),409,"Matching question content exists: "+String.join(", ",duplicates(b,body,input.id()))+"; acknowledge the duplicate warning");
                create(b,a,c,body);
            } else {
                var q=find(b,input.id());owner(q,a);require(input.expectedRevision()!=null,400,"Expected revision required");expected(q,input.expectedRevision());
                require(q.code.equals(c),409,"Question code cannot be changed");var v=latest(q);require("DRAFT".equals(v.state),409,"Edit an existing draft or create a successor first");
                require(input.acknowledgeDuplicates()||duplicates(b,body,q.id).isEmpty(),409,"Matching question content exists: "+String.join(", ",duplicates(b,body,input.id()))+"; acknowledge the duplicate warning");
                v.content=body;v.editedBy=a.id();v.editedAt=clock.instant();v.viewed.clear();q.revision++;audit(b,q,v,a,"EDITED",null);
            }return view(b);
        });
    }
    private void approveOne(QuestionBank b,Actor a,Question q,Version v) {
        manager(a);require(!q.retired&&q.owner!=null&&"SUBMITTED".equals(v.state),409,"Question is not eligible for approval");catalog.requireExpert(a,q.owner);
        require(v.id.toString().equals(v.viewed.get(a.id())),409,"Open this exact submitted version before approval");
        Content validated=content(a,v.content,true);require(validated.equals(v.content),409,"MicroSkill snapshot changed. Return the question for another review.");v.state="PUBLISHED";v.reviewedBy=a.id();v.reviewedAt=clock.instant();v.reason=null;
        audit(b,q,v,a,"APPROVED",null);notice(b,q.owner,"Question approved",q.code+" · v"+v.number);
    }
    private void apply(QuestionBank b,Actor a,Command in) {
        var q=find(b,in.id());expected(q,in.expectedRevision());var v=latest(q);
        switch(in.action()) {
            case "VIEW" -> { manager(a);require("SUBMITTED".equals(v.state),409,"Only submitted versions can be acknowledged");v.viewed.put(a.id(),v.id.toString());return; }
            case "ASSIGN" -> { manager(a);require(in.owner()!=null,400,"Select an Expert");catalog.requireExpert(a,in.owner());String reason=text(in.reason(),"Assignment reason",2000);UUID old=q.owner;q.owner=in.owner();audit(b,q,v,a,"ASSIGNED",reason);notice(b,old,"Question responsibility transferred",q.code);notice(b,q.owner,"Question assigned",q.code); }
            case "SUCCESSOR" -> { owner(q,a);require("PUBLISHED".equals(v.state),409,"Resolve the current draft/review first");q.versions.add(draft(v.number+1,v.content,a));audit(b,q,latest(q),a,"SUCCESSOR_CREATED",null); }
            case "SUBMIT" -> { owner(q,a);require(!q.retired&&"DRAFT".equals(v.state),409,"Only an active draft can be submitted");v.content=content(a,v.content,true);v.state="SUBMITTED";v.submittedBy=a.id();v.submittedAt=clock.instant();v.viewed.clear();audit(b,q,v,a,"SUBMITTED",null);notifyManagers(b,a,"Question awaiting review",q.code); }
            case "WITHDRAW", "RETURN" -> { boolean withdraw="WITHDRAW".equals(in.action());if(withdraw)owner(q,a);else manager(a);require("SUBMITTED".equals(v.state),409,"Submission already changed");String reason=text(in.reason(),"Reason",2000);v.state="DRAFT";v.reason=reason;v.viewed.clear();audit(b,q,v,a,in.action(),reason);if(!withdraw)notice(b,q.owner,"Question returned",q.code+": "+reason); }
            case "APPROVE" -> approveOne(b,a,q,v);
            case "REQUEST_RETIRE", "REQUEST_REACTIVATE" -> { owner(q,a);boolean retire="REQUEST_RETIRE".equals(in.action());require(retire?!q.retired:q.retired,409,"Question availability already changed");require(q.request==null,409,"An availability request is already pending");require(q.versions.stream().anyMatch(x->"PUBLISHED".equals(x.state)),409,"Publish a question before requesting availability changes");q.request=retire?"RETIRE":"REACTIVATE";String reason=text(in.reason(),"Reason",2000);audit(b,q,v,a,in.action(),reason);notifyManagers(b,a,"Question availability request",q.code+": "+reason); }
            case "CONFIRM_AVAILABILITY" -> { manager(a);require(q.request!=null,409,"No availability request pending");if("REACTIVATE".equals(q.request)) {var published=q.versions.stream().filter(x->"PUBLISHED".equals(x.state)).reduce((x,y)->y).orElseThrow();publishedEligibility(a,published.content);}q.retired="RETIRE".equals(q.request);audit(b,q,v,a,q.request+"_CONFIRMED",text(in.reason(),"Decision reason",2000));q.request=null;notice(b,q.owner,"Question availability updated",q.code); }
            case "REJECT_AVAILABILITY" -> {manager(a);require(q.request!=null,409,"No request pending");audit(b,q,v,a,"AVAILABILITY_RETURNED",text(in.reason(),"Reason",2000));q.request=null;notice(b,q.owner,"Question availability request returned",q.code);}
            default -> throw new Failure(400,"Unknown question action");
        }q.revision++;
    }
    @Override public View command(Command input) {var a=actor();return store.atomic(a,b->{apply(b,a,input);return view(b);});}
    @Override public View approve(Bulk input) {
        var a=actor();manager(a);require(input.questions()!=null&&!input.questions().isEmpty()&&input.questions().size()<=500,400,"Select 1–500 questions");
        require(input.questions().stream().map(Command::id).distinct().count()==input.questions().size(),400,"Duplicate selection");
        return store.atomic(a,b->{var errors=new ArrayList<String>();for(var in:input.questions()) {try {var q=find(b,in.id());expected(q,in.expectedRevision());var v=latest(q);require(!q.retired&&q.owner!=null&&"SUBMITTED".equals(v.state)&&v.id.toString().equals(v.viewed.get(a.id())),409,"Open the current eligible submitted version");content(a,v.content,true);catalog.requireExpert(a,q.owner);}catch(Failure e){errors.add(in.id()+": "+e.getMessage());}}require(errors.isEmpty(),409,String.join("; ",errors));for(var in:input.questions()){var q=find(b,in.id());approveOne(b,a,q,latest(q));q.revision++;}return view(b);});
    }
    @Override public ImportBatch preview(Preview input) {
        var a=actor();require(a.expert(),403,"Expert import required");require(input.rows()!=null&&!input.rows().isEmpty()&&input.rows().size()<=maxRows,400,"Import 1–"+maxRows+" rows");
        return store.atomic(a,b->{var batch=new ImportBatch();batch.id=UUID.randomUUID();batch.actor=a.id();batch.expiresAt=clock.instant().plusSeconds(1800);var codes=new HashSet<String>();var signatures=new HashSet<String>();int row=0;
            for(var in:input.rows()){row++;try {String c=code(in.code());require(codes.add(c),400,"Duplicate code in file");Content body=content(a,in.content(),false);var q=b.questions.stream().filter(x->x.code.equals(c)).findFirst().orElse(null);if(q!=null){owner(q,a);require("PUBLISHED".equals(latest(q).state),409,"Existing draft or submitted successor");batch.expected.put(c,q.revision);batch.warnings.add(c+": creates successor to v"+latest(q).number);}else batch.expected.put(c,-1L);var matches=duplicates(b,body,q==null?null:q.id);batch.matching.put(c,matches);if(!matches.isEmpty())batch.warnings.add(c+": matching content exists: "+String.join(", ",matches));if(!signatures.add(signature(body)))batch.warnings.add(c+": matching content in this file");batch.rows.add(new Row(c,body));}catch(Failure e){batch.errors.add("Row "+row+": "+e.getMessage());}}
            b.imports.removeIf(x->x.expiresAt.isBefore(clock.instant()));require(b.imports.size()<100,429,"Too many pending imports; retry later");b.imports.add(batch);return batch;});
    }
    @Override public View confirm(Confirmation input) {
        var a=actor();require(a.expert(),403,"Expert import required");return store.atomic(a,b->{var batch=b.imports.stream().filter(x->x.id.equals(input.batch())&&x.actor.equals(a.id())).findFirst().orElseThrow(()->new Failure(404,"Import preview not found"));
            require(batch.expiresAt.isAfter(clock.instant()),409,"Import preview expired");if(batch.committed)return view(b);require(batch.errors.isEmpty(),400,String.join("; ",batch.errors));require(batch.warnings.isEmpty()||input.acknowledgeWarnings(),409,"Acknowledge import warnings");require(batch.expected.values().stream().noneMatch(v->v>=0)||input.confirmSuccessors(),409,"Confirm successor creation");
            var batchCodes=batch.rows.stream().map(Row::code).collect(java.util.stream.Collectors.toSet());
            for(var row:batch.rows){var existing=b.questions.stream().filter(x->x.code.equals(row.code())).findFirst().orElse(null);var nowMatches=duplicates(b,row.content(),existing==null?null:existing.id).stream().filter(c->!batchCodes.contains(c)).collect(java.util.stream.Collectors.toSet());var seenMatches=batch.matching.getOrDefault(row.code(),List.of()).stream().filter(c->!batchCodes.contains(c)).collect(java.util.stream.Collectors.toSet());require(nowMatches.equals(seenMatches),409,row.code()+": matching content changed since preview; upload again");}
            for(var row:batch.rows){var q=b.questions.stream().filter(x->x.code.equals(row.code())).findFirst().orElse(null);long expected=batch.expected.get(row.code());Content body=content(a,row.content(),false);if(expected<0){require(q==null,409,row.code()+": code was created since preview");create(b,a,row.code(),body);}else{require(q!=null,409,"Question changed");owner(q,a);expected(q,expected);require("PUBLISHED".equals(latest(q).state),409,"Existing draft/review blocks import");q.versions.add(draft(latest(q).number+1,body,a));q.revision++;audit(b,q,latest(q),a,"IMPORTED_SUCCESSOR",null);}}batch.committed=true;return view(b);});
    }
    @Override public List<Notice> notices() {var a=actor();return store.atomic(a,b->b.notices.stream().filter(n->a.id().equals(n.recipient)).toList());}
    @Override public void markRead(UUID id) {var a=actor();store.atomic(a,b->{var n=b.notices.stream().filter(x->x.id.equals(id)&&x.recipient.equals(a.id())).findFirst().orElseThrow(()->new Failure(404,"Notification not found"));n.readAt=clock.instant();return null;});}
    private static void require(boolean ok,int status,String message) {if(!ok)throw new Failure(status,message);}
}
