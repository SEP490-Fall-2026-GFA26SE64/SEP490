package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.OrganizationAssessmentPolicy.*;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

/** Trusted organization supplied by an authorized caller. No implicit write-on-read. */
public interface AssessmentPolicyStore {
    <T>T locked(UUID organization,Supplier<T> work);
    State read(UUID organization);
    Page list(UUID organization,int page,int size);
    Optional<String> receipt(UUID organization,UUID actor,UUID key,String hash);
    void receipt(UUID organization,UUID actor,UUID key,String operation,String hash,Object response);
    Saved save(UUID organization,UUID actor,Values values);
    State activate(UUID organization,UUID actor,UUID key,UUID version,long expectedRevision);
    /** Within new-start transaction; coordinates first-write and holds exact activation stable. */
    Pin requireEffective(UUID organization);
}
