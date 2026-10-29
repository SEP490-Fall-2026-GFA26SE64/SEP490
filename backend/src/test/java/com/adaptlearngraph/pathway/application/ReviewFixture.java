package com.adaptlearngraph.pathway.application;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPathwayStore.*;
import com.adaptlearngraph.pathway.application.InitialPlanningPorts.Limits;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.*;
import com.adaptlearngraph.recommendation.domain.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;
import java.util.function.Supplier;

/** Unit-only ports. Does not claim transaction, database, graph or production-assignment evidence. */
public class ReviewFixture {
    public static final UUID ORG=new UUID(0,101), LEARNER=new UUID(0,102), EXPERT=new UUID(0,103), ID=new UUID(0,104);
    public final Actor actor=new Actor(ORG,EXPERT,Role.DOMAIN_EXPERT);
    public final Scope scope=new Scope(ORG,LEARNER);
    public final Selection selection=new Selection(new UUID(0,105),1,"role-test","level-test");
    public final Assignment assignment=new Assignment("assignment-test","v1",EXPERT);
    public final Limits limits=new Limits("test-limits",20,20,20,10,10000);
    public final Actors actors=mock(Actors.class);public final ReviewAssignments assignments=mock(ReviewAssignments.class);
    public final InitialPathwayStore store=mock(InitialPathwayStore.class);public final Coordination coordination=mock(Coordination.class);
    public final Bindings bindings=mock(Bindings.class);public final InitialProblemBuilder builder=mock(InitialProblemBuilder.class);
    public final Receipts receipts=mock(Receipts.class);
    public final ObjectMapper json=new ObjectMapper().findAndRegisterModules();
    public final Codec codec=new Codec(){public String encode(Object value){try{return json.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException(e);}}
        public <T>T decode(String value,Class<T> type){try{return json.readValue(value,type);}catch(Exception e){throw new IllegalStateException(e);}}};
    public final Binding binding;
    public final RoleGap.Result gaps;
    public final Frozen frozen;
    public Problem problem;
    public Request current;
    public Revision revision;
    public final List<Revision> history=new ArrayList<>();
    public final Map<String,Receipt> savedReceipts=new HashMap<>();
    public final InitialPathwayReview review;
    public ReviewFixture() {
        binding=new Binding("choice-test","role-test","level-test","occupation-test","Test Role","Test Level","catalog-test","release-test",
                Map.of("catalog","v1","binding","v1","publication","v1","requirements","v1","compatibility","v1","suitability","v1","readiness","v1"),
                List.of(new RoleGap.Requirement("S","Skill S",new BigDecimal("0.8"),true)));
        gaps=RoleGap.calculate(binding.requirements(),Map.of("S",new RoleGap.Evidence(new BigDecimal("0.2"),"known")),Map.of());
        var preview=new RoleGapPreview.Preview("choice-test","role-test","level-test","Test Role","Test Level",selection.id(),1L,"g".repeat(64),binding.versions(),gaps);
        frozen=new Frozen(new RoleGapPreview.Prepared(binding,null,preview),selection,"planning-test",InitialPathwayAdmission.configurationHash(limits));
        problem=new Problem(List.of(new Need("S",false,new BigDecimal("0.2"),null)),List.of(),List.of(offer("M-A"),offer("M-B")),List.of(),Set.of(),binding.versions());
        var plan=new InitialPathwayPlanner().review(problem,Set.of("M-A"),10000);
        revision=new Revision(ID,4,new UUID(0,106),plan,Set.of("M-A"),List.of(),Revision.identity(plan,Set.of("M-A"),List.of()),Validation.VALID);
        current=request(Review.AWAITING_EXPERT_REVIEW,revision);history.add(revision);
        when(actors.require()).thenReturn(actor);when(assignments.require(actor,ID)).thenReturn(assignment);
        when(assignments.assignedPathways(actor)).thenReturn(Set.of(ID));when(store.assignedScope(ORG,ID)).thenReturn(Optional.of(scope));
        when(store.request(scope,ID)).thenAnswer(i->Optional.of(current));when(store.current(scope)).thenAnswer(i->Optional.of(current));
        when(store.revision(eq(scope),eq(ID),anyLong())).thenAnswer(i->history.stream().filter(r->r.revision()==i.<Long>getArgument(2)).findFirst().orElseThrow());
        when(coordination.current(scope)).thenReturn(Optional.of(selection));
        when(coordination.transaction(eq(scope),any())).thenAnswer(i->i.<Supplier<?>>getArgument(1).get());
        when(builder.build(eq(scope),eq(binding),eq(gaps),anyString())).thenAnswer(i->problem);
        when(receipts.find(eq(actor),anyString(),eq(ID.toString()),anyString())).thenAnswer(i->Optional.ofNullable(savedReceipts.get(i.getArgument(1)+":"+i.getArgument(3))));
        doAnswer(i->{savedReceipts.put(i.getArgument(1)+":"+i.getArgument(3),i.getArgument(4));return null;}).when(receipts).save(eq(actor),anyString(),eq(ID.toString()),anyString(),any());
        doAnswer(i->{revision=i.getArgument(2);history.add(revision);current=request(Review.AWAITING_EXPERT_REVIEW,revision);return null;})
                .when(store).saveRevision(eq(scope),any(),any(),eq(actor),eq(assignment),anyString(),anyString(),nullable(String.class));
        doAnswer(i->{current=request(Review.APPROVED,revision);return null;}).when(store).approve(eq(scope),any(),eq(actor),eq(assignment));
        review=new InitialPathwayReview(actors,assignments,store,coordination,bindings,builder,receipts,codec,()->limits);
    }
    public static Offer offer(String id){return new Offer(id,"Module "+id,"content-1",BigDecimal.TEN,BigDecimal.ONE,"S",null,0,true,"v1","fixture",TeachingFocus.PRIMARY,Difficulty.LOW,Difficulty.LOW,CoverageRole.ANCILLARY,false,null);}
    public Request request(Review state,Revision r){return new Request(ID,scope,selection,frozen,Generation.SUCCEEDED,null,state,r.revision(),r.validation(),r.contentHash());}
    public InitialPathwayReview.Edit edit(String module){return new InitialPathwayReview.Edit(module,revision.revision(),revision.contentHash(),"test reason");}
    public InitialPathwayReview.Expected expected(){return new InitialPathwayReview.Expected(revision.revision(),revision.contentHash());}
}
