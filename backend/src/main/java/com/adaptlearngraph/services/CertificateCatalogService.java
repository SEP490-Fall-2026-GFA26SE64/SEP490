package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.CertificateCatalog.*;
import com.adaptlearngraph.repository.CertificateCatalogRepository;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import java.util.*;

/** Expert's actual Add action authors and assigns the exact certificate provision in the owned catalog. */
public final class CertificateCatalogService {
    private final Actors actors;private final CertificateCatalogRepository catalog;
    public CertificateCatalogService(Actors actors,CertificateCatalogRepository catalog){this.actors=actors;this.catalog=catalog;}
    private Actor expert(){var actor=actors.require();actor.require(Role.DOMAIN_EXPERT);return actor;}
    public List<Definition> list(int offset,int limit){var actor=expert();var result=catalog.list(actor.organizationId(),offset,limit);if(!actor.equals(expert()))throw new Failure(403,"FORBIDDEN");return result;}
    public Definition create(UUID key,Create command){var actor=expert();if(key==null || command==null)throw new Failure(400,"INVALID_REQUEST");return catalog.create(actor.organizationId(),actor.accountId(),key,command);}
}
