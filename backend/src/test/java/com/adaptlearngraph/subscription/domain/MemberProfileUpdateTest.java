package com.adaptlearngraph.subscription.domain;

import static org.junit.jupiter.api.Assertions.*;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class MemberProfileUpdateTest {
    @Test
    void normalizesNameAndKeepsLegitimateNonEmployeeNulls() {
        var update=new MemberProfileUpdate("  Administrator  ",Set.of("ORGANIZATION_ADMINISTRATOR"),null,null,3);
        assertEquals("Administrator",update.fullName());
        assertNull(update.departmentId());
        assertNull(update.occupationReferenceId());
        assertEquals(3,update.revision());
    }
    @Test
    void refusesBlankOverlengthNameAndNegativeRevision() {
        for(String name:new String[]{"","   ","a".repeat(121)}) {
            assertEquals(SubscriptionFailure.Code.INVALID_INPUT,
                    assertThrows(SubscriptionFailure.class,()->new MemberProfileUpdate(name,Set.of("EMPLOYEE"),null,null,0)).code());
        }
        assertThrows(SubscriptionFailure.class,()->new MemberProfileUpdate("Name",Set.of("EMPLOYEE"),null,null,-1));
    }
    @Test
    void refusesMissingNullOrPlatformRoles() {
        assertThrows(SubscriptionFailure.class,()->new MemberProfileUpdate("Name",null,null,null,0));
        assertThrows(SubscriptionFailure.class,()->new MemberProfileUpdate("Name",Set.of(),null,null,0));
        assertThrows(SubscriptionFailure.class,()->new MemberProfileUpdate("Name",Set.of("PLATFORM_ADMINISTRATOR"),null,null,0));
        var roles=new HashSet<String>();roles.add(null);
        assertThrows(SubscriptionFailure.class,()->new MemberProfileUpdate("Name",roles,null,null,0));
    }
    @Test
    void roleSetIsAnImmutableSnapshot() {
        var roles=new HashSet<>(Set.of("EMPLOYEE"));
        var update=new MemberProfileUpdate("Name",roles,null,null,0);
        roles.clear();
        assertEquals(Set.of("EMPLOYEE"),update.roles());
        assertThrows(UnsupportedOperationException.class,()->update.roles().clear());
    }
}
