package com.adaptlearngraph.helper;

import com.adaptlearngraph.entities.OrganizationAssessmentPolicy;
import com.adaptlearngraph.entities.OrganizationAssessmentPolicy.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.util.*;

/** Strict internal legacy/new attempt projection; never resolves today's policy. */
public final class AssessmentPolicyProvenance {
    private AssessmentPolicyProvenance(){}
    public static Optional<Pin> read(ResultSet row,ObjectMapper json,UUID organization)throws Exception{
        return read(row.getString("assessment_policy_mode"),row.getObject("assessment_policy_version_id",UUID.class),
                row.getString("assessment_policy_hash"),row.getString("assessment_policy_snapshot"),json,organization);
    }
    public static Optional<Pin> read(String mode,UUID id,String hash,String body,ObjectMapper json,UUID organization)throws Exception{
        if(mode==null){if(id!=null || hash!=null || body!=null)throw new IllegalStateException("Corrupt legacy policy");return Optional.empty();}
        if(!OrganizationAssessmentPolicy.SCHEMA.equals(mode))throw new IllegalStateException("Unsupported policy mode");
        var values=json.readTree(body);
        if(!values.isObject() || values.size()!=4)throw new IllegalStateException("Corrupt policy values");
        for(String field:List.of("stop_se","high_confidence_se","medium_confidence_se","k"))
            if(!values.has(field) || !values.get(field).isNumber())throw new IllegalStateException("Corrupt policy value");
        return Optional.of(new Pin(organization,id,hash,new Values(values.get("stop_se").doubleValue(),values.get("high_confidence_se").doubleValue(),values.get("medium_confidence_se").doubleValue(),values.get("k").doubleValue())));
    }
}
