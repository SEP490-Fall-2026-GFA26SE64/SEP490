package com.adaptlearngraph.recommendation.domain;

import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import java.math.BigDecimal;
import java.util.List;

/** Confirmed initial heuristic; no gap-size arithmetic or expected mastery gain. */
public final class InitialSuitability {
    public static final String VERSION="mastery-thirds-focus-v1";
    public static Difficulty preferred(Need need) {
        if(need.mastery()==null) {
            RoleGap.text(need.unknownReason());return Difficulty.LOW;
        }
        RoleGap.unit(need.mastery());var scaled=need.mastery().multiply(BigDecimal.valueOf(3));
        return scaled.compareTo(BigDecimal.ONE)<0?Difficulty.LOW:scaled.compareTo(BigDecimal.valueOf(2))<0?Difficulty.MEDIUM:Difficulty.HIGH;
    }
    public static int rank(Difficulty preferred,Difficulty offered) {
        return switch(preferred) {
            case LOW -> List.of(Difficulty.LOW,Difficulty.MEDIUM,Difficulty.HIGH).indexOf(offered);
            case MEDIUM -> List.of(Difficulty.MEDIUM,Difficulty.LOW,Difficulty.HIGH).indexOf(offered);
            case HIGH -> List.of(Difficulty.HIGH,Difficulty.MEDIUM,Difficulty.LOW).indexOf(offered);
        };
    }
    private InitialSuitability(){}
}
