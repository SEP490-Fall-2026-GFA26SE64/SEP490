package com.adaptlearngraph.entities.domain;

import com.adaptlearngraph.utility.AdaptiveIrtPolicy;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

/** Additional tenant policy identity; technical artifacts are never mutated. */
public final class OrganizationAssessmentPolicy {
    private OrganizationAssessmentPolicy() {}
    public static final String SCHEMA="ORG_POLICY_V1";
    public record Values(double stopSe,double highConfidenceSe,double mediumConfidenceSe,double k) {
        public Values {
            if(!Double.isFinite(stopSe) || !Double.isFinite(highConfidenceSe) || !Double.isFinite(mediumConfidenceSe)
                    || !Double.isFinite(k) || stopSe<=0 || highConfidenceSe<=0 || mediumConfidenceSe<=highConfidenceSe
                    || k<=0 || k>10)throw new IllegalArgumentException("Invalid assessment policy");
        }
        public String hash() { return digest(SCHEMA+"\n"+Double.toString(stopSe)+"\n"+Double.toString(highConfidenceSe)
                +"\n"+Double.toString(mediumConfidenceSe)+"\n"+Double.toString(k)); }
        public AdaptiveIrtPolicy.Model apply(AdaptiveIrtPolicy.Model m) {
            return new AdaptiveIrtPolicy.Model(m.algorithm(),m.priorMean(),m.priorSd(),m.thetaLower(),m.thetaUpper(),
                    m.gridIntervals(),m.maxIterations(),m.thetaTolerance(),m.gradientTolerance(),m.minimumPerSkill(),
                    m.maxResponses(),stopSe,highConfidenceSe,mediumConfidenceSe,m.minA(),m.maxA(),m.maxAbsB(),m.maxC());
        }
    }
    public record Pin(UUID organizationId,UUID versionId,String hash,Values values) {
        public Pin { id(organizationId);id(versionId);if(values==null || !values.hash().equals(hash))throw new IllegalArgumentException("Invalid policy pin"); }
    }
    public record Version(Pin pin,long version,UUID createdBy,Instant createdAt) {
        public Version { if(pin==null || version<1 || createdAt==null)throw new IllegalArgumentException("Invalid policy version");id(createdBy); }
    }
    public record State(Version active,long activationRevision) {
        public State { if(activationRevision<0 || (active==null)!=(activationRevision==0))throw new IllegalArgumentException("Invalid activation"); }
    }
    public record Page(List<Version> items,long total,int page,int size) { public Page { items=List.copyOf(items); } }
    public record Saved(Version version,boolean noOp) {}
    public static String digest(String value) {
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException impossible){throw new IllegalStateException(impossible);}
    }
    public static void id(UUID value) { if(value==null || value.equals(new UUID(0,0)))throw new IllegalArgumentException("Nonzero identity required"); }
}
