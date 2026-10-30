package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import org.neo4j.driver.Value;

/** Schema publication by default; explicit local-only review exception never changes source metadata. */
final class InitialCatalogMetadata {
    private InitialCatalogMetadata() {}
    static String text(Value record,String field) {
        var value=record.get(field);
        if(value.isNull() || !(value.asObject() instanceof String s) || s.isBlank() || !s.equals(s.strip()))
            throw new Failure(503,"CATALOG_METADATA_INVALID",false);
        return value.asString();
    }
    static void scope(Value record,Scope scope) {
        if(record.isNull())throw new Failure(503,"CATALOG_RECORD_MISSING",false);
        var organization=record.get("organizationId");
        if(!organization.isNull() && !organization.asString().equals(scope.organizationId().toString()))throw new Failure(503,"CATALOG_SCOPE_INVALID",false);
    }
    static boolean published(Value record,Scope scope,String version) {
        return published(record,scope,version,false);
    }
    static boolean published(Value record,Scope scope,String version,boolean localReview) {
        scope(record,scope);
        text(record,"id");
        if(!version.equals(text(record,"version")))throw new Failure(503,"INCOHERENT_CATALOG_VERSION",false);
        if(localReview && "ACTIVE".equals(record.get("status").asString(""))
                && "NEEDS_EXPERT_REVIEW".equals(record.get("reviewStatus").asString("")))return true;
        if(!"ACTIVE".equals(record.get("status").asString("")) || !"APPROVED".equals(record.get("reviewStatus").asString("")))return false;
        text(record,"reviewedBy");
        try { OffsetDateTime.parse(text(record,"reviewedAt")); }
        catch(java.time.DateTimeException invalid){throw new Failure(503,"CATALOG_REVIEW_METADATA_INVALID",false);}
        return true;
    }
    static void requirePublished(Value record,Scope scope,String version) {
        if(!published(record,scope,version))throw new Failure(422,"CATALOG_NOT_PUBLISHED",false);
    }
    static void requirePublished(Value record,Scope scope,String version,boolean localReview) {
        if(!published(record,scope,version,localReview))throw new Failure(422,"CATALOG_NOT_PUBLISHED",false);
    }
    static BigDecimal decimal(Value record,String field) {
        try {
            var value=record.get(field);
            if(value.isNull() || !(value.asObject() instanceof Number number))throw new IllegalArgumentException();
            return new BigDecimal(number.toString());
        }catch(RuntimeException invalid){throw new Failure(503,"CATALOG_NUMERIC_METADATA_INVALID",false);}
    }
    static void unique(Map<List<String>,String> identities,String kind,Value record,String elementId) {
        String previous=identities.putIfAbsent(List.of(kind,text(record,"id")),elementId);
        if(previous!=null && !previous.equals(elementId))throw new Failure(503,"CATALOG_IDENTITY_AMBIGUOUS",false);
    }
}
