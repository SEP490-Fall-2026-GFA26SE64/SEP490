package com.adaptlearngraph.assessment.adaptive;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.*;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.*;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintEligibilityPort.*;
import com.adaptlearngraph.assessment.adaptive.psychometrics.*;
import java.time.Instant;
import java.util.*;
/** Hand-authored F3-v1, 3 union skills, shared s2, 9 items. Not a development seed/oracle. */
public final class AdaptiveFixture {
 public static UUID id(long n){return new UUID(0,n);}
 public static final UUID ORG=id(1),EMP=id(3),OTHER=id(4),MANAGER=id(5);
 public static final String OCC="occupation-f3";
 public static final Instant NOW=Instant.parse("2026-10-23T00:00:00Z");
 public static final Scope SCOPE=new Scope(ORG,OCC);
 public static final VersionPins PINS=new VersionPins(id(10),id(11),id(12));
 public static Map<String,RoleSnapshot> roles(){
  var s1=new SkillSnapshot("Skill 1","fixture-v1");var s2=new SkillSnapshot("Skill 2","fixture-v1");var s3=new SkillSnapshot("Skill 3","fixture-v1");
  return Map.of("role-a",new RoleSnapshot("Role A","fixture-v1",Map.of("s1",s1,"s2",s2)),
    "role-b",new RoleSnapshot("Role B","fixture-v1",Map.of("s2",s2,"s3",s3)));
 }
 public static Map<UUID,String> pool(){var m=new TreeMap<UUID,String>();for(int i=0;i<9;i++)m.put(id(100+i),"s"+(i/3+1));return m;}
 public static Configuration config(){return Configuration.occupation("Fixture baseline",new Bounds(9,540));}
 public static Version version(){return new Version(SCOPE,new VersionId(id(20),1),config(),"Fixture Occupation","fixture-f3-v1",PINS,roles(),MANAGER,NOW);}
 public static AdaptiveAttemptSnapshot snapshot(Version v){return new AdaptiveAttemptSnapshot(v,AdaptiveAttemptSnapshot.Purpose.ROLE_REQUIREMENT,Optional.of("role-a"),Optional.of(1L),pool());}
 public static AdaptiveAttempt attempt(){return AdaptiveAttempt.start(id(30),new AdaptiveAttempt.Scope(ORG,EMP,OCC),snapshot(version()),NOW,false,Optional.empty());}
 public static Snapshot eligible(){
  return new Snapshot(SCOPE,"Fixture Occupation","fixture-f3-v1",PINS,Map.of(
   "role-a",new RolePool(roles().get("role-a"),items(Set.of("s1","s2")),Set.of()),
   "role-b",new RolePool(roles().get("role-b"),items(Set.of("s2","s3")),Set.of())),new Coverage(3,4096,pool()));
 }
 static Set<UUID> items(Set<String> skills){var s=new HashSet<UUID>();pool().forEach((id,skill)->{if(skills.contains(skill))s.add(id);});return s;}
 public static List<Irt3pl.Item> items(){return pool().entrySet().stream().map(e->new Irt3pl.Item(e.getKey(),e.getValue(),PINS.parameterSetId(),1,0,.25)).toList();}
 public static AdaptiveIrtPolicy.Versions policy(){return new AdaptiveIrtPolicy.Versions(PINS.modelVersionId(),PINS.masteryMappingVersionId(),PINS.parameterSetId(),AdaptiveIrtPolicy.referenceModelV1(),AdaptiveIrtPolicy.referenceMappingV1());}
}