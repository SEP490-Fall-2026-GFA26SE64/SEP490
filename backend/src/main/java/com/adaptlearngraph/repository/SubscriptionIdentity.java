package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy.Actor;
import java.util.UUID;

public interface SubscriptionIdentity {
    Context current();

    record Context(Actor actor, UUID registrationId) {}
}
