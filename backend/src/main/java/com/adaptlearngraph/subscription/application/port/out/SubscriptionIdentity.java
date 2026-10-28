package com.adaptlearngraph.subscription.application.port.out;

import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Actor;
import java.util.UUID;

public interface SubscriptionIdentity {
    Context current();

    record Context(Actor actor, UUID registrationId) {}
}
