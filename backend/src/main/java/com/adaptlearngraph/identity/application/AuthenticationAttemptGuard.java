package com.adaptlearngraph.identity.application;

import com.adaptlearngraph.identity.application.port.out.RegistrationSecrets;
import com.adaptlearngraph.identity.application.port.out.RegistrationStore;
import com.adaptlearngraph.identity.application.port.out.RegistrationStore.RateBucket;
import com.adaptlearngraph.identity.domain.RegistrationFailure;
import com.adaptlearngraph.identity.domain.RegistrationFailure.Code;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Supplier;

public final class AuthenticationAttemptGuard {
    private final RegistrationStore store;
    private final RegistrationSecrets secrets;
    private final Clock clock;

    public AuthenticationAttemptGuard(RegistrationStore store, RegistrationSecrets secrets, Clock clock) {
        this.store = store;
        this.secrets = secrets;
        this.clock = clock;
    }

    public <T> T execute(String operation, String identity, String address, Supplier<T> action) {
        secrets.requireConfigured();
        Outcome<T> outcome = store.transaction(() -> {
            Instant now = clock.instant();
            String accountKey = secrets.digest("rate:" + operation + ":" + identity);
            String ipKey = secrets.digest("rate:failed-ip:" + address);
            Map<String, RateBucket> buckets = new TreeMap<>();
            buckets.put(accountKey, null);
            buckets.put(ipKey, null);
            for (String key : buckets.keySet()) {
                RateBucket bucket = store.lockRate(key, now);
                if (bucket.blockedUntil() != null && now.isBefore(bucket.blockedUntil())) {
                    return new Outcome<>(null, limited(bucket.blockedUntil(), now));
                }
                if (!now.isBefore(bucket.windowStartedAt().plus(Duration.ofMinutes(15)))) {
                    bucket = new RateBucket(now, 0, null);
                }
                buckets.put(key, bucket);
            }
            try {
                T result = action.get();
                store.saveRate(accountKey, new RateBucket(now, 0, null));
                return new Outcome<>(result, null);
            } catch (RegistrationFailure failure) {
                if (failure.code() != Code.INVALID_PROOF && failure.code() != Code.EXPIRED_PROOF
                        && failure.code() != Code.UNAUTHENTICATED) throw failure;
                RegistrationFailure returned = failure;
                for (var entry : buckets.entrySet()) {
                    int failures = entry.getValue().attempts() + 1;
                    int limit = entry.getKey().equals(accountKey) ? 5 : 20;
                    Instant blocked = failures >= limit ? now.plusSeconds(900) : null;
                    store.saveRate(entry.getKey(), new RateBucket(entry.getValue().windowStartedAt(), failures, blocked));
                    if (blocked != null) returned = limited(blocked, now);
                }
                // Commit failed-attempt counters before surfacing a policy failure.
                return new Outcome<>(null, returned);
            }
        });
        if (outcome.failure() != null) throw outcome.failure();
        return outcome.value();
    }

    private static RegistrationFailure limited(Instant until, Instant now) {
        return new RegistrationFailure(Code.RATE_LIMITED, "Too many attempts. Wait before trying again.", null,
                Math.max(1, Duration.between(now, until).toSeconds()));
    }

    private record Outcome<T>(T value, RegistrationFailure failure) {}
}
