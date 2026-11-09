package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AccountEntity;
import com.adaptlearngraph.entities.LearnerStateEntity;
import com.adaptlearngraph.entities.OrganizationMembershipEntity;
import com.adaptlearngraph.entities.OrganizationMembershipRoleEntity;
import com.adaptlearngraph.entities.OutboxEventEntity;
import com.adaptlearngraph.entities.ProcessingJobEntity;
import com.adaptlearngraph.entities.domain.RegistrationFields;
import com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy.Action;
import com.adaptlearngraph.entities.WorkspaceAccountProfileEntity;
import com.adaptlearngraph.entities.WorkspaceActivationEntity;
import com.adaptlearngraph.exception.RegistrationFailure;
import com.adaptlearngraph.exception.SubscriptionFailure;
import com.adaptlearngraph.helper.RegistrationMailDelivery;
import com.adaptlearngraph.services.AuthenticationAttemptGuard;
import com.adaptlearngraph.services.MemberActivationUseCase;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.transaction.support.TransactionTemplate;

/** JPA adapter for member invitation and activation; organization scoped and serialized by the organization lock. */
public final class JpaMemberActivationAdapter implements MemberActivationUseCase {
    private static final String EVENT = "MEMBER_ACTIVATION";
    private static final String HANDLER = "MEMBER_ACTIVATION_EMAIL";

    public record Repositories(OrganizationJpaRepository organizations, WorkspaceActivationJpaRepository activations,
                               DepartmentReferenceJpaRepository references, AccountJpaRepository accounts,
                               WorkspaceAccountProfileJpaRepository profiles, OrganizationMembershipJpaRepository memberships,
                               OrganizationMembershipRoleJpaRepository roles, LearnerStateJpaRepository learners,
                               OutboxEventJpaRepository outbox, ProcessingJobJpaRepository jobs) {}

    private final Repositories data;
    private final JpaMemberReferenceValidator validator;
    private final TransactionTemplate transactions;
    private final SubscriptionIdentity identity;
    private final SubscriptionWorkspaceStore workspaces;
    private final RegistrationSecrets secrets;
    private final RegistrationStore security;
    private final RegistrationMailDelivery mail;
    private final Clock clock;

    public JpaMemberActivationAdapter(Repositories data, TransactionTemplate transactions, SubscriptionIdentity identity,
            SubscriptionWorkspaceStore workspaces, RegistrationSecrets secrets, RegistrationStore security,
            RegistrationMailDelivery mail, Clock clock) {
        this.data = data;
        this.validator = new JpaMemberReferenceValidator(data.references());
        this.transactions = transactions;
        this.identity = identity;
        this.workspaces = workspaces;
        this.secrets = secrets;
        this.security = security;
        this.mail = mail;
        this.clock = clock;
    }

    @Override
    public Invitation invite(UUID organization, Input input) {
        var actor = identity.current().actor();
        String email = RegistrationFields.normalizeEmail(input.email());
        if (input.fullName() == null || input.fullName().isBlank() || input.fullName().length() > 120
                || email.length() > 254 || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+") || input.roles() == null
                || input.roles().size() != 1 || input.roles().stream().anyMatch(java.util.Objects::isNull)
                || !Set.of("EMPLOYEE", "LD_MANAGER", "DOMAIN_EXPERT", "ORGANIZATION_ADMINISTRATOR").containsAll(input.roles())) {
            throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT, "Supply a name, valid email and exactly one organization role.");
        }
        mail.requireConfigured();
        secrets.requireConfigured();
        return transactions.execute(tx -> {
            lock(organization);
            workspaces.require(actor, organization, Action.BILLING_READ, clock.instant());
            workspaces.require(actor, organization, Action.WORKSPACE, clock.instant());
            validator.validate(organization, input.roles(), input.departmentId(), input.jobPositionReferenceId(), input.departmentName(), input.jobPositionName(), false);
            security.lockEmail(email);
            if (security.accountExists(email)) throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT, "An account already exists for this email.");
            var existing = data.activations().lockPendingByEmail(email).stream().findFirst()
                    .flatMap(data.activations()::pending);
            Instant now = clock.instant();
            if (existing.isPresent() && (!organization.equals(existing.get().organizationId())
                    || now.isBefore(existing.get().lastSentAt().plusSeconds(60)))) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT, "An activation is pending. Wait before resending.");
            }
            String bucketKey = secrets.digest("activation-send:" + organization + ":" + email);
            var bucket = security.lockRate(bucketKey, now);
            boolean same = now.isBefore(bucket.windowStartedAt().plusSeconds(3600));
            if (same && bucket.attempts() >= 5) throw new RegistrationFailure(RegistrationFailure.Code.RATE_LIMITED, "Wait before sending another activation.", null, 3600);
            security.saveRate(bucketKey, new RegistrationStore.RateBucket(same ? bucket.windowStartedAt() : now, same ? bucket.attempts() + 1 : 1, null));
            UUID id = existing.map(WorkspaceActivationJpaRepository.Pending::activationId).orElseGet(UUID::randomUUID);
            String token = secrets.recoveryCode() + secrets.recoveryCode();
            String proof = secrets.digest("activation:" + token);
            long generation;
            if (existing.isEmpty()) {
                data.activations().insert(new WorkspaceActivationEntity(id, organization, actor.accountId(), input.fullName().strip(),
                        email, input.roles().stream().sorted().toList(), input.departmentId(), input.jobPositionReferenceId(),
                        proof, now.plusSeconds(600), now));
                generation = 1;
            } else {
                // A resend replaces the proof, not the previously authorized membership terms.
                data.activations().resend(organization, id, proof, now.plusSeconds(600), now);
                generation = data.activations().generation(organization, id).orElseThrow();
            }
            UUID event = UUID.randomUUID();
            data.outbox().insert(new OutboxEventEntity(event, EVENT, id, generation,
                    Map.of("encryptedToken", secrets.encrypt(token, "activation:" + id + ":" + generation)), UUID.randomUUID(), now));
            data.jobs().insert(new ProcessingJobEntity(UUID.randomUUID(), event, HANDLER, now, now));
            security.audit(actor.accountId(), "MEMBER_ACTIVATION_REQUESTED", "SUCCEEDED", now);
            return new Invitation(id, email, now.plusSeconds(600), "PENDING");
        });
    }

    @Override
    public List<PendingActivation> pending(UUID organization) {
        workspaces.require(identity.current().actor(), organization, Action.MEMBER_READ, clock.instant());
        return data.activations().pendingOf(organization).stream().map(row -> {
            String job = row.jobStatus();
            String delivery = job == null ? "NOT_REQUESTED" : "SUCCEEDED".equals(job) ? "SENT"
                    : ("FAILED".equals(job) || "BLOCKED".equals(job)) ? "FAILED" : "PENDING";
            return new PendingActivation(row.activationId(), row.fullName(), row.email(), Set.copyOf(row.roles()),
                    row.departmentId(), row.departmentName(), row.jobPositionReferenceId(), row.jobPositionName(), row.createdAt(),
                    row.expiresAt(), clock.instant().isBefore(row.expiresAt()) ? "PENDING" : "EXPIRED", delivery);
        }).toList();
    }

    @Override
    public List<Reference> references(UUID organization) {
        workspaces.require(identity.current().actor(), organization, Action.MEMBER_READ, clock.instant());
        return data.references().activeChoices(organization).stream().map(choice -> new Reference(choice.departmentId(),
                choice.departmentName(), choice.jobPositionReferenceId(), choice.jobPositionName())).toList();
    }

    @Override
    public void activate(String token, String password, String address) {
        if (token == null || !token.matches("[a-f0-9]{64}")) throw invalidProof();
        RegistrationFields.validatePassword(password);
        String hash = secrets.hashPassword(password);
        new AuthenticationAttemptGuard(security, secrets, clock).execute("activation", secrets.digest(token), address, () -> {
            var owner = data.activations().findByProof(secrets.digest("activation:" + token)).orElseThrow(JpaMemberActivationAdapter::invalidProof);
            UUID organization = owner.organizationId();
            lock(organization);
            data.activations().lock(owner.activationId());
            var activation = data.activations().terms(organization, owner.activationId()).orElseThrow(JpaMemberActivationAdapter::invalidProof);
            Instant now = clock.instant();
            if (activation.consumedAt() != null || !now.isBefore(activation.expiresAt())) throw invalidProof();
            Set<String> roles = Set.copyOf(activation.roles());
            if (roles.size() != 1) throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT,
                    "This invitation must specify exactly one role. Contact your administrator.");
            String status = data.organizations().status(organization).orElseThrow();
            var summary = workspaces.summary(organization, now);
            if (!"ACTIVE".equals(status) || !"ACTIVE".equals(summary.subscriptionStatus())) throw new SubscriptionFailure(SubscriptionFailure.Code.FORBIDDEN, "Workspace activation is unavailable while expired or suspended.");
            validator.validate(organization, roles, activation.departmentId(), activation.jobPositionReferenceId(), false);
            if (!roles.contains("ORGANIZATION_ADMINISTRATOR") && summary.usedSeats() >= summary.admissionLimit()) throw new SubscriptionFailure(SubscriptionFailure.Code.CAPACITY_EXCEEDED, "No seat is available. Contact your administrator.");
            security.lockEmail(activation.email());
            if (security.accountExists(activation.email())) throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT, "The account already exists.");
            UUID account = UUID.randomUUID();
            UUID member = UUID.randomUUID();
            data.accounts().insert(new AccountEntity(account, organization, activation.email(), activation.email(), hash, now));
            data.profiles().insert(new WorkspaceAccountProfileEntity(account, activation.fullName(), now));
            data.memberships().insert(new OrganizationMembershipEntity(member, account, organization, true,
                    activation.departmentId(), activation.jobPositionReferenceId(), now));
            data.roles().insertAll(roles.stream().map(role -> new OrganizationMembershipRoleEntity(member, role)).toList());
            if (roles.contains("EMPLOYEE")) data.learners().insert(new LearnerStateEntity(account));
            data.activations().consume(organization, owner.activationId(), account, now);
            security.audit(account, "MEMBER_ACTIVATED", "SUCCEEDED", now);
            return null;
        });
    }

    private void lock(UUID organization) {
        if (data.organizations().lock(organization).isEmpty()) throw invalidProof();
    }

    private static RegistrationFailure invalidProof() {
        return new RegistrationFailure(RegistrationFailure.Code.INVALID_PROOF, "The activation link is invalid, expired or already used.");
    }
}
