package com.adaptlearngraph.repository;

import java.util.List;

import com.adaptlearngraph.entities.PaymentOrder;
import com.adaptlearngraph.services.PaymentConfirmationMailWorker;
import static org.junit.jupiter.api.Assertions.*;

import com.adaptlearngraph.repository.PaymentOrderStore.Command;
import com.adaptlearngraph.repository.SubscriptionIdentity.Context;
import com.adaptlearngraph.helper.PaymentGateway.Observation;
import com.adaptlearngraph.entities.SubscriptionAccessPolicy.Actor;
import com.adaptlearngraph.exception.SubscriptionFailure;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

class PaymentOrderPostgresIntegrationTest {
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.6-alpine");
    private static final UUID PLAN = UUID.fromString("10000000-0000-4000-8000-000000000001");
    private static final UUID VERSION = UUID.fromString("20000000-0000-4000-8000-000000000001");
    private static final Instant NOW = Instant.parse("2026-10-22T12:00:00.123456Z");
    private static JdbcTemplate jdbc;
    private static JpaPaymentOrderStore orders;
    private static JpaPaymentProcessingStore processing;
    private static JpaSubscriptionWorkspaceStore workspaces;
    private static TransactionTemplate transactions;
    private static com.adaptlearngraph.support.JpaTestContext persistence;

    @BeforeAll
    static void start() {
        POSTGRES.start();
        var source = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(source).locations("classpath:db/workspace-migration").load().migrate();
        jdbc = new JdbcTemplate(source);
        transactions=new TransactionTemplate(new DataSourceTransactionManager(source));
        persistence = com.adaptlearngraph.support.JpaTestContext.start(source);
        orders = new JpaPaymentOrderStore(IdentityTestFixtures.subscriptionRepositories(persistence), IdentityTestFixtures.jpaTransactions(persistence));
        processing = new JpaPaymentProcessingStore(IdentityTestFixtures.subscriptionRepositories(persistence), IdentityTestFixtures.jpaTransactions(persistence), orders);
        workspaces = new JpaSubscriptionWorkspaceStore(IdentityTestFixtures.subscriptionRepositories(persistence), IdentityTestFixtures.jpaTransactions(persistence));
    }

    @AfterAll static void stop() { persistence.close(); POSTGRES.stop(); }

    @Test
    void developmentBypassProvisionsOnceWithoutProviderEvidenceOrPaymentEmail() {
        var context = registrant();
        var order = orders.create(context, command(UUID.randomUUID(), null), NOW);
        var development = new JpaPaymentProcessingStore(IdentityTestFixtures.subscriptionRepositories(persistence), IdentityTestFixtures.jpaTransactions(persistence), orders,
                new com.adaptlearngraph.entities.IntegrationPolicy(false, true, true));
        development.bypassForDevelopment(order.orderId(), NOW);
        development.apply(order.orderId(), NOW);
        development.bypassForDevelopment(order.orderId(), NOW.plusSeconds(1));
        development.apply(order.orderId(), NOW.plusSeconds(1));
        var saved = orders.find(order.orderId()).orElseThrow();
        assertEquals("DEV_BYPASSED", saved.paymentStatus());
        assertNull(saved.observedPaidAmount());
        assertNull(saved.confirmedAt());
        assertNull(saved.paymentLinkId());
        assertNull(saved.checkoutUrl());
        assertEquals("APPLIED", orders.applicationState(order.orderId()));
        assertEquals("READY", workspaces.setup(context.registrationId()).state());
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM platform.subscription_period WHERE order_id=?",
                Integer.class, order.orderId()));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM platform.payment_observation WHERE order_id=?",
                Integer.class, order.orderId()));
        assertEquals(0, jdbc.queryForObject("""
                SELECT count(*) FROM platform.processing_job j JOIN platform.outbox_event e USING(event_id)
                WHERE e.aggregate_id=? AND j.handler='PAYMENT_CONFIRMATION_EMAIL'
                """, Integer.class, order.orderId()));
        assertThrows(SubscriptionFailure.class, () -> processing.bypassForDevelopment(order.orderId(), NOW));
    }

    @Test
    void developmentBypassCannotOverwriteAnExternallyPendingOrPaidOrder() {
        var development = new JpaPaymentProcessingStore(IdentityTestFixtures.subscriptionRepositories(persistence), IdentityTestFixtures.jpaTransactions(persistence), orders,
                new com.adaptlearngraph.entities.IntegrationPolicy(false, true, true));
        var order = orders.create(registrant(), command(UUID.randomUUID(), null), NOW);
        processing.record(observation(order, "PENDING", 0L, "VND", "QUERY"), NOW);
        assertThrows(SubscriptionFailure.class, () -> development.bypassForDevelopment(order.orderId(), NOW));
        processing.record(observation(order, "PAID", 4_900_000L, "VND", "WEBHOOK"), NOW);
        assertThrows(SubscriptionFailure.class, () -> development.bypassForDevelopment(order.orderId(), NOW));
        assertEquals("PAID", orders.find(order.orderId()).orElseThrow().paymentStatus());
    }

    @Test
    void paymentMailRetriesToThePurchaserWithoutDuplicatingTheEvent() throws Exception {
        jdbc.update("UPDATE platform.processing_job SET next_retry_at=? WHERE handler='PAYMENT_CONFIRMATION_EMAIL'",
                java.sql.Timestamp.from(NOW.plusSeconds(86400)));
        var order = orders.create(registrant(), command(UUID.randomUUID(), null), NOW);
        var success = observation(order, "PAID", 4_900_000L, "VND", "WEBHOOK");
        processing.record(success, NOW);
        var sender = org.mockito.Mockito.mock(org.springframework.mail.javamail.JavaMailSender.class);
        var message = new jakarta.mail.internet.MimeMessage(jakarta.mail.Session.getInstance(new java.util.Properties()));
        org.mockito.Mockito.when(sender.createMimeMessage()).thenReturn(message);
        org.mockito.Mockito.doThrow(new org.springframework.mail.MailSendException("Test SMTP unavailable"))
                .doNothing().when(sender).send(message);
        var beans = new org.springframework.beans.factory.support.DefaultListableBeanFactory();
        beans.registerSingleton("mail", sender);
        var mail = new com.adaptlearngraph.helper.TransactionalMailSender(
                beans.getBeanProvider(org.springframework.mail.javamail.JavaMailSender.class), "sender@example.test", "localhost");
        UUID job = jdbc.queryForObject("""
                SELECT j.job_id FROM platform.processing_job j JOIN platform.outbox_event e USING(event_id)
                WHERE e.aggregate_id=? AND j.handler='PAYMENT_CONFIRMATION_EMAIL'
                """, UUID.class, order.orderId());
        new PaymentConfirmationMailWorker(jdbc, transactions, mail,
                java.time.Clock.fixed(NOW, java.time.ZoneOffset.UTC), "https://example.test").deliver();
        assertEquals("RETRY", jdbc.queryForObject("SELECT status FROM platform.processing_job WHERE job_id=?", String.class, job));
        processing.apply(order.orderId(), NOW.plusSeconds(2));
        var retry = new PaymentConfirmationMailWorker(jdbc, transactions, mail,
                java.time.Clock.fixed(NOW.plusSeconds(31), java.time.ZoneOffset.UTC), "https://example.test");
        retry.deliver();
        assertEquals("SUCCEEDED", jdbc.queryForObject("SELECT status FROM platform.processing_job WHERE job_id=?", String.class, job));
        assertEquals(jdbc.queryForObject("SELECT identifier FROM platform.account WHERE account_id=?", String.class, order.ownerAccountId()),
                message.getAllRecipients()[0].toString());
        assertEquals("Payment received - Adapt-Learn-Graph", message.getSubject());
        processing.record(success, NOW.plusSeconds(32));
        retry.deliver();
        org.mockito.Mockito.verify(sender, org.mockito.Mockito.times(2)).send(message);
        assertEquals("APPLIED", orders.applicationState(order.orderId()));
        message.saveChanges();
        var content = new java.io.ByteArrayOutputStream();
        message.writeTo(content);
        String mime = content.toString(java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(mime.contains("multipart/alternative"));
        assertTrue(mime.contains("Starter"));
        assertTrue(mime.contains("/guest/payment-result?order="));
        assertNotNull(message.getHeader("X-Payment-Event", null));
    }

    @Test
    void confirmedPaymentQueuesOneMailAndMailFailureCannotUndoApplication() {
        var order = orders.create(registrant(), command(UUID.randomUUID(), null), NOW);
        var success = observation(order, "PAID", 4_900_000L, "VND", "WEBHOOK");
        processing.record(success, NOW);
        processing.record(success, NOW.plusSeconds(1));
        assertEquals(1, jdbc.queryForObject("""
                SELECT count(*) FROM platform.processing_job j JOIN platform.outbox_event e USING(event_id)
                WHERE e.aggregate_id=? AND j.handler='PAYMENT_CONFIRMATION_EMAIL'
                """, Integer.class, order.orderId()));
        jdbc.update("""
                UPDATE platform.processing_job SET status='FAILED',failure_code='SMTP_UNAVAILABLE'
                WHERE handler='PAYMENT_CONFIRMATION_EMAIL'
                  AND event_id IN (SELECT event_id FROM platform.outbox_event WHERE aggregate_id=?)
                """, order.orderId());
        processing.apply(order.orderId(), NOW.plusSeconds(2));
        assertEquals("PAID", orders.find(order.orderId()).orElseThrow().paymentStatus());
        assertEquals("APPLIED", orders.applicationState(order.orderId()));
    }

    @Test
    void persistsEverySnapshotFieldExactProviderDeadlineAndOneDurableJob() {
        var context = registrant();
        var order = orders.create(context, command(UUID.randomUUID(), null), NOW);
        assertEquals("Starter", order.terms().name());
        assertEquals("Organization workspace subscription for up to 20 Employee seats.", order.terms().description());
        assertEquals(4_900_000L, order.terms().priceVnd());
        assertEquals("VND", order.terms().currency());
        assertEquals(1, order.terms().durationMonths());
        assertEquals(20, order.terms().employeeSeats());
        assertEquals(Instant.parse("2026-10-22T12:00:00Z"), order.createdAt());
        assertEquals(Instant.parse("2026-10-22T12:30:00Z"), order.expiresAt());
        assertEquals(context.registrationId(), order.registrationId());
        assertEquals(context.actor().accountId(), order.ownerAccountId());
        assertNull(order.organizationId());
        assertNull(order.paymentLinkId());
        assertNull(order.checkoutUrl());
        assertNull(order.observedPaidAmount());
        assertNull(order.confirmedAt());
        assertEquals("CREATING", order.paymentStatus());
        assertEquals(order, orders.find(order.orderId()).orElseThrow());
        assertEquals(order, orders.current(context, null).orElseThrow());
        assertEquals(1, jobs(order.orderId()));
    }

    @Test
    void concurrentIdenticalCommandsProduceOneOrderIntentAndJob() throws Exception {
        var context = registrant();
        var command = command(UUID.randomUUID(), null);
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<PaymentOrder> operation = () -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Concurrency start timed out.");
                return orders.create(context, command, NOW);
            };
            var first = executor.submit(operation);
            var second = executor.submit(operation);
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            var winner = first.get(15, TimeUnit.SECONDS);
            assertEquals(winner.orderId(), second.get(15, TimeUnit.SECONDS).orderId());
            assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM platform.payment_order WHERE intent_id = ?",
                    Integer.class, winner.intentId()));
            assertEquals(1, jobs(winner.orderId()));
        }
    }

    @Test
    void differentCommandCannotDuplicatePendingOrderAndOnlyTerminalUnpaidAllowsReplacement() {
        var context = registrant();
        var first = orders.create(context, command(UUID.randomUUID(), null), NOW);
        assertEquals(SubscriptionFailure.Code.CONFLICT, assertThrows(SubscriptionFailure.class,
                () -> orders.create(context, command(UUID.randomUUID(), null), NOW)).code());
        assertEquals(SubscriptionFailure.Code.CONFLICT, assertThrows(SubscriptionFailure.class,
                () -> orders.create(context, command(UUID.randomUUID(), first.orderId()), NOW)).code());
        jdbc.update("""
                UPDATE platform.payment_order SET payment_status = 'UNPAID_TERMINAL', observed_paid_amount = 0,
                    provider_status = 'EXPIRED', last_checked_at = now() WHERE order_id = ?
                """, first.orderId());
        var replacementCommand = command(UUID.randomUUID(), first.orderId());
        var replacement = orders.create(context, replacementCommand, NOW.plusSeconds(1801));
        assertEquals(2, replacement.attempt());
        assertEquals(first.intentId(), replacement.intentId());
        assertNotEquals(first.providerOrderCode(), replacement.providerOrderCode());
        assertEquals(replacement.orderId(), orders.create(context, replacementCommand, NOW.plusSeconds(1802)).orderId());
        assertEquals(1, jobs(replacement.orderId()));
    }

    @Test
    void staleTermsWrongOwnerAndReusedCommandWithDifferentPayloadNeverCreateAnotherOrder() {
        var context = registrant();
        var stale = new Command(null, PLAN, UUID.randomUUID(), UUID.randomUUID(), null);
        assertEquals(SubscriptionFailure.Code.CONFLICT,
                assertThrows(SubscriptionFailure.class, () -> orders.create(context, stale, NOW)).code());
        assertTrue(orders.current(context, null).isEmpty());
        var another = registrant();
        var forged = new Context(another.actor(), context.registrationId());
        assertEquals(SubscriptionFailure.Code.FORBIDDEN,
                assertThrows(SubscriptionFailure.class, () -> orders.create(forged, command(UUID.randomUUID(), null), NOW)).code());
        UUID key = UUID.randomUUID();
        var first = orders.create(context, command(key, null), NOW);
        assertEquals(SubscriptionFailure.Code.CONFLICT, assertThrows(SubscriptionFailure.class,
                () -> orders.create(context, new Command(null, PLAN, UUID.randomUUID(), key, null), NOW)).code());
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM platform.payment_order WHERE intent_id = ?",
                Integer.class, first.intentId()));
        assertTrue(orders.current(another, null).isEmpty());
    }

    private static int jobs(UUID orderId) {
        return jdbc.queryForObject("""
                SELECT count(*) FROM platform.processing_job j JOIN platform.outbox_event e USING (event_id)
                WHERE e.aggregate_id = ? AND j.handler = 'PAYMENT_CREATE'
                """, Integer.class, orderId);
    }

    @Test
    void editingRolesCannotBypassEmployeeCapacityOrOverwriteFailedProfileChanges() {
        var context=provisioned();
        UUID org=context.actor().organizationId();
        for(int index=0;index<20;index++) employee(org,true);
        UUID id=employee(org,false);
        workspaces.changeMember(context.actor(),org,id,true,Set.of("DOMAIN_EXPERT"),0,NOW);
        var member=workspaces.members(org).stream().filter(m->m.membershipId().equals(id)).findFirst().orElseThrow();
        assertEquals(SubscriptionFailure.Code.CAPACITY_EXCEEDED,assertThrows(SubscriptionFailure.class,()->
                workspaces.updateMember(context.actor(),org,id,new com.adaptlearngraph.entities.MemberProfileUpdate(
                    "Must roll back",Set.of("EMPLOYEE"),member.departmentId(),member.occupationReferenceId(),member.revision()),NOW)).code());
        var unchanged=workspaces.members(org).stream().filter(m->m.membershipId().equals(id)).findFirst().orElseThrow();
        assertEquals(member.fullName(),unchanged.fullName());
        assertEquals(member.roles(),unchanged.roles());
        assertEquals(member.revision(),unchanged.revision());
        assertEquals(20,workspaces.summary(org,NOW).usedSeats());
    }

    @Test
    void memberProfileEditsPersistWithoutChangingEmailCredentialsOrRegistrationHistory() {
        var context=provisioned();
        UUID org=context.actor().organizationId();
        var member=workspaces.members(org).getFirst();
        String registeredName=jdbc.queryForObject("SELECT admin_name FROM platform.organization_registration WHERE account_id=?",
                String.class,member.accountId());
        String password=jdbc.queryForObject("SELECT password_hash FROM platform.account WHERE account_id=?",String.class,member.accountId());
        var edited=workspaces.updateMember(context.actor(),org,member.membershipId(),
                new com.adaptlearngraph.entities.MemberProfileUpdate("Updated Administrator",member.roles(),null,null,member.revision()),NOW);
        assertEquals("Updated Administrator",edited.fullName());
        assertEquals(member.email(),edited.email());
        assertEquals(member.revision()+1,edited.revision());
        assertNull(edited.departmentId());
        assertNull(edited.occupationReferenceId());
        assertNull(edited.departmentName());
        assertEquals(registeredName,jdbc.queryForObject("SELECT admin_name FROM platform.organization_registration WHERE account_id=?",String.class,member.accountId()));
        assertEquals(password,jdbc.queryForObject("SELECT password_hash FROM platform.account WHERE account_id=?",String.class,member.accountId()));
        assertEquals(0,jdbc.queryForObject("""
                SELECT count(*) FROM platform.workspace_account_profile p JOIN platform.organization_registration r USING(account_id)
                WHERE p.account_id=? AND p.email_verified_at IS DISTINCT FROM r.email_verified_at
                """,Integer.class,member.accountId()));
        var identityStore=IdentityTestFixtures.identityStore(persistence);
        assertEquals("Updated Administrator",identityStore.findByEmail(member.email()).orElseThrow().fullName());
        assertEquals(SubscriptionFailure.Code.CONFLICT,assertThrows(SubscriptionFailure.class,()->
                workspaces.updateMember(context.actor(),org,member.membershipId(),
                    new com.adaptlearngraph.entities.MemberProfileUpdate("Stale",member.roles(),null,null,member.revision()),NOW)).code());
    }

    @Test
    void userEditPreservesHistoricalAssignmentsButRejectsForeignNewReferencesAndLastAdminRemoval() {
        var context=provisioned();
        UUID org=context.actor().organizationId(),memberId=employee(org,true);
        var member=workspaces.members(org).stream().filter(m->m.membershipId().equals(memberId)).findFirst().orElseThrow();
        jdbc.update("UPDATE platform.department_reference SET active=false WHERE department_id=?",member.departmentId());
        jdbc.update("UPDATE platform.occupation_department_reference SET active=false WHERE occupation_reference_id=?",member.occupationReferenceId());
        var updated=workspaces.updateMember(context.actor(),org,memberId,new com.adaptlearngraph.entities.MemberProfileUpdate(
                "Historical Employee",Set.of("EMPLOYEE"),member.departmentId(),member.occupationReferenceId(),0),NOW);
        assertEquals("Test department",updated.departmentName());
        assertEquals("Test occupation",updated.occupationName());
        var other=provisioned();
        UUID foreignId=employee(other.actor().organizationId(),true);
        var foreign=workspaces.members(other.actor().organizationId()).stream().filter(m->m.membershipId().equals(foreignId)).findFirst().orElseThrow();
        assertEquals(SubscriptionFailure.Code.REFERENCE_DATA_REQUIRED,assertThrows(SubscriptionFailure.class,()->
                workspaces.updateMember(context.actor(),org,memberId,new com.adaptlearngraph.entities.MemberProfileUpdate(
                    "Invalid",Set.of("EMPLOYEE"),foreign.departmentId(),foreign.occupationReferenceId(),1),NOW)).code());
        assertEquals(SubscriptionFailure.Code.FORBIDDEN,assertThrows(SubscriptionFailure.class,()->
                workspaces.updateMember(other.actor(),org,memberId,new com.adaptlearngraph.entities.MemberProfileUpdate(
                    "Forbidden",Set.of("EMPLOYEE"),member.departmentId(),member.occupationReferenceId(),1),NOW)).code());
        var admin=workspaces.members(org).stream().filter(m->m.accountId().equals(context.actor().accountId())).findFirst().orElseThrow();
        assertEquals(SubscriptionFailure.Code.CONFLICT,assertThrows(SubscriptionFailure.class,()->
                workspaces.updateMember(context.actor(),org,admin.membershipId(),new com.adaptlearngraph.entities.MemberProfileUpdate(
                    "Cannot remove last admin",Set.of("LD_MANAGER"),null,null,admin.revision()),NOW)).code());
        assertEquals("Historical Employee",workspaces.members(org).stream().filter(m->m.membershipId().equals(memberId)).findFirst().orElseThrow().fullName());
    }

    @Test
    void editingMemberRequiresActiveSubscriptionAndEmployeeAssignments() {
        var context=provisioned();
        UUID org=context.actor().organizationId(),id=employee(org,true);
        var member=workspaces.members(org).stream().filter(m->m.membershipId().equals(id)).findFirst().orElseThrow();
        assertEquals(SubscriptionFailure.Code.REFERENCE_DATA_REQUIRED,assertThrows(SubscriptionFailure.class,()->
                workspaces.updateMember(context.actor(),org,id,new com.adaptlearngraph.entities.MemberProfileUpdate(
                    "No references",Set.of("EMPLOYEE"),null,null,0),NOW)).code());
        var update=new com.adaptlearngraph.entities.MemberProfileUpdate("Not permitted",Set.of("EMPLOYEE"),
                member.departmentId(),member.occupationReferenceId(),0);
        Instant end=workspaces.summary(org,NOW).current().endsAt();
        assertEquals(SubscriptionFailure.Code.FORBIDDEN,assertThrows(SubscriptionFailure.class,()->
                workspaces.updateMember(context.actor(),org,id,update,end)).code());
        workspaces.changeMember(context.actor(),org,id,false,member.roles(),0,end);
        assertFalse(workspaces.members(org).stream().filter(m->m.membershipId().equals(id)).findFirst().orElseThrow().active());
    }

    @Test
    void lowerSeatReservationAndLateCapacityRemediationRemainDurable() {
        var context=provisioned();
        UUID org=context.actor().organizationId(),plan=UUID.randomUUID(),version=UUID.randomUUID();
        transactions.executeWithoutResult(tx->{
            jdbc.update("INSERT INTO platform.subscription_plan VALUES (?,?,?)",plan,"test-"+plan,version);
            jdbc.update("""
                    INSERT INTO platform.subscription_plan_version(version_id,plan_id,revision,name,description,
                      price_vnd,currency,duration_months,employee_seats,created_at,creation_source)
                    VALUES (?,?,1,'Test lower capacity','Isolated test terms',4900000,'VND',1,1,now(),'SYSTEM')
                    """,version,plan);
        });
        employee(org,true);
        var pending=orders.create(context,new Command(org,plan,version,UUID.randomUUID(),null),NOW.plusSeconds(1));
        assertEquals(1,workspaces.summary(org,NOW.plusSeconds(2)).admissionLimit());
        UUID another=employee(org,false);
        assertEquals(SubscriptionFailure.Code.CAPACITY_EXCEEDED,assertThrows(SubscriptionFailure.class,()->
                workspaces.changeMember(context.actor(),org,another,true,Set.of("EMPLOYEE"),0,NOW.plusSeconds(2))).code());
        processing.record(observation(pending,"EXPIRED",0L,null,"QUERY"),NOW.plusSeconds(1801));
        assertEquals(20,workspaces.summary(org,NOW.plusSeconds(1802)).admissionLimit());
        workspaces.changeMember(context.actor(),org,another,true,Set.of("EMPLOYEE"),0,NOW.plusSeconds(1803));
        processing.record(observation(pending,"PAID",4900000L,"VND","WEBHOOK"),NOW.plusSeconds(1804));
        processing.apply(pending.orderId(),NOW.plusSeconds(1805));
        assertEquals("WAITING_CAPACITY",orders.applicationState(pending.orderId()));
        workspaces.changeMember(context.actor(),org,another,false,Set.of("EMPLOYEE"),1,NOW.plusSeconds(1806));
        processing.apply(pending.orderId(),NOW.plusSeconds(1807));
        assertEquals("APPLIED",orders.applicationState(pending.orderId()));
        assertEquals(1,workspaces.summary(org,NOW.plusSeconds(1808)).scheduled().terms().employeeSeats());
    }

    @Test
    void expiredRenewalStartsAtApplicationAndDoesNotClearAdministrativeSuspension() {
        var context=provisioned();
        UUID org=context.actor().organizationId();
        Instant expired=workspaces.summary(org,NOW.plusSeconds(1)).current().endsAt().plusSeconds(10);
        var renewal=orders.create(context,new Command(org,PLAN,VERSION,UUID.randomUUID(),null),expired);
        jdbc.update("UPDATE platform.organization SET status='SUSPENDED' WHERE organization_id=?",org);
        processing.record(observation(renewal,"PAID",4900000L,"VND","WEBHOOK"),expired.plusSeconds(5));
        processing.apply(renewal.orderId(),expired.plusSeconds(20));
        var summary=workspaces.summary(org,expired.plusSeconds(21));
        assertEquals(expired.plusSeconds(20),summary.current().startsAt());
        assertEquals("SUSPENDED",summary.workspaceStatus());
    }

    @Test
    void oneProviderTransactionReferenceCannotFundTwoOrders() {
        var first=orders.create(registrant(),command(UUID.randomUUID(),null),NOW);
        var second=orders.create(registrant(),command(UUID.randomUUID(),null),NOW);
        var payment=observation(first,"PAID",4_900_000L,"VND","WEBHOOK");
        processing.record(payment,NOW);
        var reused=observation(second,"PAID",4_900_000L,"VND","WEBHOOK");
        processing.record(new Observation(reused.orderCode(),reused.paymentLinkId(),reused.amount(),reused.paidAmount(),
                reused.currency(),reused.status(),payment.reference(),null,reused.providerPaidAt(),reused.source(),reused.payloadDigest()),NOW);
        assertEquals("PAID",orders.find(first.orderId()).orElseThrow().paymentStatus());
        assertEquals("EXCEPTION",orders.find(second.orderId()).orElseThrow().paymentStatus());
    }

    @Test
    void expiredWorkerLeaseIsReclaimedWithAFencingToken() {
        var order=orders.create(registrant(),command(UUID.randomUUID(),null),NOW);
        var jobs=jdbc.query("""
                SELECT j.job_id FROM platform.processing_job j JOIN platform.outbox_event e USING(event_id)
                WHERE e.aggregate_id=?
                """,(rs,i)->rs.getObject(1,UUID.class),order.orderId());
        jdbc.update("""
                UPDATE platform.processing_job SET status='RUNNING',lease_owner='crashed-worker',lease_expires_at=?,
                    next_retry_at=?,created_at=? WHERE job_id=?
                """,java.sql.Timestamp.from(NOW.minusSeconds(100)),java.sql.Timestamp.from(NOW.minusSeconds(100)),
                java.sql.Timestamp.from(NOW.minusSeconds(100)),jobs.getFirst());
        var claimed=processing.claim(NOW).orElseThrow();
        assertEquals(order.orderId(),claimed.order().orderId());
        assertNotEquals("crashed-worker",claimed.lease());
        processing.finish(new com.adaptlearngraph.repository.PaymentProcessingStore.Work(
                claimed.jobId(),"crashed-worker",claimed.handler(),1,order),NOW);
        assertEquals("RUNNING",jdbc.queryForObject("SELECT status FROM platform.processing_job WHERE job_id=?",String.class,claimed.jobId()));
        processing.finish(claimed,NOW);
        assertEquals("SUCCEEDED",jdbc.queryForObject("SELECT status FROM platform.processing_job WHERE job_id=?",String.class,claimed.jobId()));
    }

    @Test
    void activeRenewalAppendsAndSecondFuturePurchaseIsRejected() {
        var context=provisioned();
        var org=context.actor().organizationId();
        var before=workspaces.summary(org,NOW.plusSeconds(1));
        var renewal=orders.create(context,new Command(org,PLAN,VERSION,UUID.randomUUID(),null),NOW.plusSeconds(2));
        processing.record(observation(renewal,"PAID",4_900_000L,"VND","WEBHOOK"),NOW.plusSeconds(3));
        processing.apply(renewal.orderId(),NOW.plusSeconds(4));
        var after=workspaces.summary(org,NOW.plusSeconds(5));
        assertEquals(before.current().endsAt(),after.current().endsAt());
        assertEquals(before.current().endsAt(),after.scheduled().startsAt());
        assertEquals(2,after.paymentHistory().size());
        assertThrows(SubscriptionFailure.class,()->orders.create(context,new Command(org,PLAN,VERSION,UUID.randomUUID(),null),NOW.plusSeconds(6)));
    }

    @Test
    void concurrentFinalSeatActivationHasOneWinnerAndExpiredSuspensionPoliciesHold() throws Exception {
        var context=provisioned();
        UUID org=context.actor().organizationId();
        Set<String> invalidRoles=new java.util.HashSet<>();
        invalidRoles.add(null);
        assertEquals(SubscriptionFailure.Code.INVALID_INPUT,assertThrows(SubscriptionFailure.class,()->
                workspaces.changeMember(context.actor(),org,UUID.randomUUID(),true,invalidRoles,0,NOW)).code());
        for(int i=0;i<19;i++) employee(org,true);
        UUID first=employee(org,false),second=employee(org,false);
        var ready=new CountDownLatch(2);var start=new CountDownLatch(1);
        try(var executor=Executors.newFixedThreadPool(2)) {
            var a=executor.submit(()->activateSeat(context,first,ready,start));
            var b=executor.submit(()->activateSeat(context,second,ready,start));
            assertTrue(ready.await(10,TimeUnit.SECONDS));start.countDown();
            assertNotEquals(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS));
        }
        assertEquals(20,workspaces.summary(org,NOW.plusSeconds(1)).usedSeats());
        var end=workspaces.summary(org,NOW.plusSeconds(1)).current().endsAt();
        assertThrows(SubscriptionFailure.class,()->workspaces.require(context.actor(),org,
                com.adaptlearngraph.entities.SubscriptionAccessPolicy.Action.WORKSPACE,end));
        workspaces.require(context.actor(),org,com.adaptlearngraph.entities.SubscriptionAccessPolicy.Action.RENEW,end);
        jdbc.update("UPDATE platform.organization SET status='SUSPENDED' WHERE organization_id=?",org);
        workspaces.require(context.actor(),org,com.adaptlearngraph.entities.SubscriptionAccessPolicy.Action.BILLING_READ,end);
        assertThrows(SubscriptionFailure.class,()->workspaces.require(context.actor(),org,
                com.adaptlearngraph.entities.SubscriptionAccessPolicy.Action.RENEW,end));
    }

    @Test
    void interruptedApplicationRollsBackAndRetryCreatesOnePeriod() {
        var owner=registrant();
        var order=orders.create(owner,command(UUID.randomUUID(),null),NOW);
        processing.record(observation(order,"PAID",4_900_000L,"VND","WEBHOOK"),NOW);
        jdbc.execute("""
                CREATE FUNCTION platform.test_reject_period() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN RAISE EXCEPTION 'isolated interruption'; END; $$;
                CREATE TRIGGER test_reject_period BEFORE INSERT ON platform.subscription_period
                FOR EACH ROW EXECUTE FUNCTION platform.test_reject_period();
                """);
        try {
            assertEquals(SubscriptionFailure.Code.SERVICE_UNAVAILABLE,
                    assertThrows(SubscriptionFailure.class,()->processing.apply(order.orderId(),NOW)).code());
            assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM platform.organization_workspace WHERE registration_id=?",Integer.class,owner.registrationId()));
            assertEquals("PAID",orders.find(order.orderId()).orElseThrow().paymentStatus());
            UUID job=jdbc.queryForObject("""
                    SELECT j.job_id FROM platform.processing_job j JOIN platform.outbox_event e USING(event_id)
                    WHERE e.aggregate_id=? AND j.handler='PAYMENT_APPLY'
                    """,UUID.class,order.orderId());
            jdbc.update("UPDATE platform.processing_job SET status='RUNNING',lease_owner='failure-test',lease_expires_at=? WHERE job_id=?",
                    java.sql.Timestamp.from(NOW.plusSeconds(120)),job);
            processing.retry(new com.adaptlearngraph.repository.PaymentProcessingStore.Work(
                    job,"failure-test","PAYMENT_APPLY",1,orders.find(order.orderId()).orElseThrow()),"SERVICE_UNAVAILABLE",NOW);
            assertEquals("RETRY",jdbc.queryForObject("SELECT status FROM platform.processing_job WHERE job_id=?",String.class,job));
            assertEquals("PAID",orders.find(order.orderId()).orElseThrow().paymentStatus());
            assertEquals("SERVICE_UNAVAILABLE",orders.find(order.orderId()).orElseThrow().failureCode());
        } finally {
            jdbc.execute("DROP TRIGGER test_reject_period ON platform.subscription_period; DROP FUNCTION platform.test_reject_period()");
        }
        processing.apply(order.orderId(),NOW.plusSeconds(30));
        processing.apply(order.orderId(),NOW.plusSeconds(31));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM platform.subscription_period WHERE order_id=?",Integer.class,order.orderId()));
        assertNull(orders.find(order.orderId()).orElseThrow().failureCode());
    }

    private boolean activateSeat(Context context,UUID member,CountDownLatch ready,CountDownLatch start) throws Exception {
        ready.countDown();
        if(!start.await(10,TimeUnit.SECONDS)) throw new IllegalStateException("Seat race start timed out.");
        try {
            workspaces.changeMember(context.actor(),context.actor().organizationId(),member,true,Set.of("EMPLOYEE"),0,NOW.plusSeconds(1));
            return true;
        } catch(SubscriptionFailure failure) {
            assertEquals(SubscriptionFailure.Code.CAPACITY_EXCEEDED,failure.code());
            return false;
        }
    }

    @Test
    void catalogSelectionKeepsWorkspaceProvisioningUntilTheCopySucceedsOrFails() {
        var registrations = RegistrationPostgresIntegrationTest.registrationStore(persistence);
        var imports = new JpaWorkspaceCatalogImportStore(persistence.bean(WorkspaceCatalogImportJpaRepository.class),
                persistence.bean(OrganizationWorkspaceJpaRepository.class), new TransactionTemplate(persistence.transactionManager()));
        String sha = "b".repeat(64);

        var copied = registrant();
        registrations.saveCatalogSelection(copied.registrationId(), "0.11.0", sha, List.of("ROLE-A", "MS-B"), NOW);
        var order = orders.create(copied, command(UUID.randomUUID(), null), NOW);
        processing.record(observation(order, "PAID", 4_900_000L, "VND", "WEBHOOK"), NOW);
        processing.apply(order.orderId(), NOW);
        var setup = workspaces.setup(copied.registrationId());
        assertEquals("PROVISIONING", setup.state());
        assertEquals("order-" + copied.registrationId(), processing.workspaceSlug(setup.organizationId()).orElseThrow());

        var job = imports.claim(NOW.plusSeconds(1)).orElseThrow();
        assertEquals(setup.organizationId(), job.organizationId());
        assertEquals(List.of("ROLE-A", "MS-B"), job.selectedNodeIds());
        assertEquals(1, job.attempt());
        assertTrue(imports.claim(NOW.plusSeconds(2)).isEmpty(), "A leased job is not claimed twice");
        imports.succeed(job, "0.11.0", sha, 12, 20, NOW.plusSeconds(3));
        assertEquals("READY", workspaces.setup(copied.registrationId()).state());
        var identity = IdentityTestFixtures.identityStore(persistence)
                .findByEmail(copied.actor().accountId() + "@example.test").orElseThrow();
        assertEquals("order-" + copied.registrationId(), identity.workspaceSlug());
        assertEquals(setup.organizationId(), identity.organizationId());
        assertEquals(List.of(java.util.Map.of("state", "SUCCEEDED", "node_count", 12, "relationship_count", 20)),
                jdbc.queryForList("SELECT state,node_count,relationship_count FROM platform.workspace_catalog_import WHERE organization_id=?",
                        setup.organizationId()));

        var failing = registrant();
        registrations.saveCatalogSelection(failing.registrationId(), "0.11.0", sha, List.of("ROLE-A"), NOW);
        var failedOrder = orders.create(failing, command(UUID.randomUUID(), null), NOW);
        processing.record(observation(failedOrder, "PAID", 4_900_000L, "VND", "WEBHOOK"), NOW);
        processing.apply(failedOrder.orderId(), NOW);
        var retried = imports.claim(NOW.plusSeconds(1)).orElseThrow();
        imports.retry(retried, "CATALOG_COPY_FAILED", NOW.plusSeconds(60), NOW.plusSeconds(1));
        assertTrue(imports.claim(NOW.plusSeconds(30)).isEmpty(), "Retry waits for its backoff");
        var last = imports.claim(NOW.plusSeconds(61)).orElseThrow();
        assertEquals(2, last.attempt());
        imports.fail(last, "CATALOG_COPY_FAILED", NOW.plusSeconds(62));
        var failedSetup = workspaces.setup(failing.registrationId());
        assertEquals("FAILED", failedSetup.state());
        assertEquals("CATALOG_IMPORT_FAILED", failedSetup.failureCode());

        var empty = registrant();
        var emptyOrder = orders.create(empty, command(UUID.randomUUID(), null), NOW);
        processing.record(observation(emptyOrder, "PAID", 4_900_000L, "VND", "WEBHOOK"), NOW);
        processing.apply(emptyOrder.orderId(), NOW);
        assertEquals("READY", workspaces.setup(empty.registrationId()).state(), "No selection keeps immediate readiness");
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM platform.workspace_catalog_import WHERE registration_id=?",
                Integer.class, empty.registrationId()));
    }

    @Test
    void memberInvitationAndActivationStayInsideTheInvitingOrganization() {
        var ownerA = provisioned();
        var ownerB = provisioned();
        UUID orgA = ownerA.actor().organizationId();
        UUID orgB = ownerB.actor().organizationId();
        UUID department = UUID.randomUUID();
        UUID occupation = UUID.randomUUID();
        jdbc.update("INSERT INTO platform.department_reference VALUES (?,?,'Activation department',true)", department, orgA);
        jdbc.update("INSERT INTO platform.occupation_department_reference VALUES (?,?,?,?,'Activation occupation',true)",
                occupation, UUID.randomUUID(), orgA, department);
        var crypto = new com.adaptlearngraph.utility.RegistrationCryptography(
                java.util.Base64.getEncoder().encodeToString("e".repeat(32).getBytes(java.nio.charset.StandardCharsets.UTF_8)),
                java.util.Base64.getEncoder().encodeToString("h".repeat(32).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        var current = new java.util.concurrent.atomic.AtomicReference<Context>(ownerA);
        var security = RegistrationPostgresIntegrationTest.registrationStore(persistence);
        var activation = new JpaMemberActivationAdapter(new JpaMemberActivationAdapter.Repositories(
                persistence.bean(OrganizationJpaRepository.class), persistence.bean(WorkspaceActivationJpaRepository.class),
                persistence.bean(DepartmentReferenceJpaRepository.class), persistence.bean(AccountJpaRepository.class),
                persistence.bean(WorkspaceAccountProfileJpaRepository.class), persistence.bean(OrganizationMembershipJpaRepository.class),
                persistence.bean(OrganizationMembershipRoleJpaRepository.class), persistence.bean(LearnerStateJpaRepository.class),
                persistence.bean(OutboxEventJpaRepository.class), persistence.bean(ProcessingJobJpaRepository.class)),
                new TransactionTemplate(persistence.transactionManager()), current::get, workspaces, crypto, security,
                org.mockito.Mockito.mock(com.adaptlearngraph.helper.RegistrationMailDelivery.class),
                java.time.Clock.fixed(NOW.plusSeconds(10), java.time.ZoneOffset.UTC));
        String email = "member-" + UUID.randomUUID() + "@example.test";

        var invitation = activation.invite(orgA, new com.adaptlearngraph.services.MemberActivationUseCase.Input(
                "Invited Member", email, Set.of("EMPLOYEE"), department, occupation));
        assertEquals("PENDING", invitation.deliveryStatus());
        assertEquals(List.of(invitation.activationId()),
                activation.pending(orgA).stream().map(com.adaptlearngraph.services.MemberActivationUseCase.PendingActivation::activationId).toList());

        current.set(ownerB);
        assertTrue(activation.pending(orgB).isEmpty(), "Organization B never sees A's invitations");
        assertThrows(SubscriptionFailure.class, () -> activation.pending(orgA));
        assertEquals(SubscriptionFailure.Code.REFERENCE_DATA_REQUIRED, assertThrows(SubscriptionFailure.class, () ->
                activation.invite(orgB, new com.adaptlearngraph.services.MemberActivationUseCase.Input(
                        "Foreign Reference", "b-" + email, Set.of("EMPLOYEE"), department, occupation))).code());

        String encrypted = jdbc.queryForObject("""
                SELECT payload->>'encryptedToken' FROM platform.outbox_event
                WHERE event_type='MEMBER_ACTIVATION' AND aggregate_id=? AND source_revision=1
                """, String.class, invitation.activationId());
        String token = crypto.decrypt(encrypted, "activation:" + invitation.activationId() + ":1");
        activation.activate(token, "Activated member password!", "127.0.0.1");

        var member = jdbc.queryForMap("""
                SELECT a.organization_id AS account_org, m.organization_id AS member_org, r.role_code,
                    EXISTS(SELECT 1 FROM platform.learner_state l WHERE l.learner_id=a.account_id) AS learner
                FROM platform.account a JOIN platform.organization_membership m USING(account_id)
                JOIN platform.organization_membership_role r USING(membership_id) WHERE a.normalized_identifier=?
                """, email);
        assertEquals(orgA, member.get("account_org"));
        assertEquals(orgA, member.get("member_org"));
        assertEquals("EMPLOYEE", member.get("role_code"));
        assertEquals(Boolean.TRUE, member.get("learner"));
        assertEquals(com.adaptlearngraph.exception.RegistrationFailure.Code.INVALID_PROOF,
                assertThrows(com.adaptlearngraph.exception.RegistrationFailure.class,
                        () -> activation.activate(token, "Activated member password!", "127.0.0.1")).code());
    }

    @Test
    void concurrentPaymentWorkersNeverClaimTheSameJob() throws Exception {
        orders.create(registrant(), command(UUID.randomUUID(), null), NOW);
        orders.create(registrant(), command(UUID.randomUUID(), null), NOW);
        Instant later = NOW.plus(java.time.Duration.ofDays(3650));
        var barrier = new java.util.concurrent.CyclicBarrier(2);
        var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var a = pool.submit(() -> { barrier.await(); return processing.claim(later); });
            var b = pool.submit(() -> { barrier.await(); return processing.claim(later); });
            var first = a.get(30, java.util.concurrent.TimeUnit.SECONDS).orElseThrow();
            var second = b.get(30, java.util.concurrent.TimeUnit.SECONDS).orElseThrow();
            assertNotEquals(first.jobId(), second.jobId());
            assertNotEquals(first.lease(), second.lease());
            processing.finish(new com.adaptlearngraph.repository.PaymentProcessingStore.Work(first.jobId(), "stale-lease",
                    first.handler(), first.attempt(), first.order()), later);
            assertEquals("RUNNING", jdbc.queryForObject("SELECT status FROM platform.processing_job WHERE job_id=?", String.class,
                    first.jobId()), "Only the lease owner can finish a job");
        } finally {
            pool.shutdownNow();
        }
    }

    private static Context provisioned() {
        var owner=registrant();
        var order=orders.create(owner,command(UUID.randomUUID(),null),NOW);
        processing.record(observation(order,"PAID",4_900_000L,"VND","WEBHOOK"),NOW);
        processing.apply(order.orderId(),NOW);
        var org=workspaces.setup(owner.registrationId()).organizationId();
        return new Context(new Actor(owner.actor().accountId(),org,true,true,
                Set.of(com.adaptlearngraph.entities.SubscriptionAccessPolicy.Role.ORGANIZATION_ADMINISTRATOR),true),null);
    }
    private static UUID employee(UUID org,boolean active) {
        UUID account=UUID.randomUUID(),member=UUID.randomUUID(),department=UUID.randomUUID(),occupation=UUID.randomUUID();
        jdbc.update("INSERT INTO platform.department_reference VALUES (?,?,'Test department',true)",department,org);
        jdbc.update("INSERT INTO platform.occupation_department_reference VALUES (?,?,?,?,'Test occupation',true)",occupation,UUID.randomUUID(),org,department);
        jdbc.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,?,?,?)",
                account,org,account+"@example.test",account+"@example.test","isolated-unusable");
        jdbc.update("INSERT INTO platform.workspace_account_profile(account_id,full_name,email_verified_at) VALUES (?,'Test Employee',now())",account);
        transactions.executeWithoutResult(tx -> {
            jdbc.update("""
                    INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,department_id,occupation_reference_id,created_at,updated_at)
                    VALUES (?,?,?,?,?,?,now(),now())
                    """,member,account,org,active,department,occupation);
            jdbc.update("INSERT INTO platform.organization_membership_role VALUES (?,'EMPLOYEE')",member);
        });
        return member;
    }

    @Test
    void checkoutCreationRetainsUnknownPaidAmountWithoutUnboxingNull() {
        var order=orders.create(registrant(),command(UUID.randomUUID(),null),NOW);
        processing.record(new Observation(order.providerOrderCode(),"link-"+order.providerOrderCode(),order.terms().priceVnd(),
                null,"VND","PENDING",null,"https://pay.payos.vn/web/link-"+order.providerOrderCode(),
                null,"CREATE","a".repeat(64)),NOW);
        var saved=orders.find(order.orderId()).orElseThrow();
        assertEquals("PENDING",saved.paymentStatus());
        assertNull(saved.observedPaidAmount());
        assertNotNull(saved.checkoutUrl());
    }

    @Test
    void platformSeedIsIdempotentWithoutVerificationOrTotpAndCannotPromoteAnOrganizationAccount() {
        String email="seed-"+UUID.randomUUID()+"@example.test";
        String secret="isolated-platform-password";
        var seed=new com.adaptlearngraph.config.PlatformAdministratorBootstrap(IdentityTestFixtures.platformSeeds(persistence),
                persistence.transactionManager(),email,secret);
        seed.run(null);
        seed.run(null);
        var identity=IdentityTestFixtures.identityStore(persistence)
                .findByEmail(email).orElseThrow();
        assertEquals(Set.of("PLATFORM_ADMINISTRATOR"),identity.roles());
        assertNull(identity.emailVerifiedAt());
        assertNull(identity.organizationId());
        assertFalse(identity.hasTotp());
        assertFalse(identity.requiresMfa());
        assertTrue(new com.adaptlearngraph.utility.RegistrationCryptography("","")
                .passwordMatches(secret,identity.passwordHash()));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM platform.account WHERE normalized_identifier=?",Integer.class,email));
        var org=provisioned();
        String orgEmail=jdbc.queryForObject("SELECT identifier FROM platform.account WHERE account_id=?",String.class,org.actor().accountId());
        assertThrows(IllegalStateException.class,()->new com.adaptlearngraph.config.PlatformAdministratorBootstrap(
                IdentityTestFixtures.platformSeeds(persistence),persistence.transactionManager(),orgEmail,secret).run(null));
    }

    @Test
    void databaseAndProfileValidationRejectMultipleRolesAndPlatformMixing() {
        var owner=provisioned();
        UUID member=employee(owner.actor().organizationId(),true);
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->
                jdbc.update("INSERT INTO platform.organization_membership_role VALUES (?,'DOMAIN_EXPERT')",member));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->
                jdbc.update("DELETE FROM platform.organization_membership_role WHERE membership_id=?",member));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->
                jdbc.update("INSERT INTO platform.platform_administrator(account_id,granted_at,grant_source) VALUES (?,now(),'OPERATOR')",
                        owner.actor().accountId()));
        assertThrows(SubscriptionFailure.class,()->new com.adaptlearngraph.entities.MemberProfileUpdate(
                "Invalid roles",Set.of("EMPLOYEE","DOMAIN_EXPERT"),null,null,0));
    }

    @Test
    void replacingASingleRoleUpdatesSeatsAndInitializesLearnerStateWithoutErasingHistory() {
        var owner=provisioned();
        UUID organization=owner.actor().organizationId();
        UUID member=employee(organization,true);
        UUID account=workspaces.members(organization).stream().filter(value->value.membershipId().equals(member))
                .findFirst().orElseThrow().accountId();
        workspaces.changeMember(owner.actor(),organization,member,true,Set.of("DOMAIN_EXPERT"),0,NOW);
        assertEquals(0,workspaces.summary(organization,NOW).usedSeats());
        workspaces.changeMember(owner.actor(),organization,member,true,Set.of("EMPLOYEE"),1,NOW);
        assertEquals(1,workspaces.summary(organization,NOW).usedSeats());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM platform.learner_state WHERE learner_id=?",Integer.class,account));
        workspaces.changeMember(owner.actor(),organization,member,true,Set.of("LD_MANAGER"),2,NOW);
        assertEquals(0,workspaces.summary(organization,NOW).usedSeats());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM platform.learner_state WHERE learner_id=?",Integer.class,account));
    }

    @Test
    void duplicateVerifiedPaymentProvisionsExactlyOnceAndStartsAtReadiness() {
        var context = registrant();
        var order = orders.create(context, command(UUID.randomUUID(), null), NOW);
        var success = observation(order, "PAID", 4_900_000L, "VND", "WEBHOOK");
        processing.record(success, NOW.plusSeconds(2000));
        processing.record(success, NOW.plusSeconds(2001));
        assertEquals("PAID", orders.find(order.orderId()).orElseThrow().paymentStatus());
        processing.apply(order.orderId(), NOW.plusSeconds(2100));
        processing.apply(order.orderId(), NOW.plusSeconds(2200));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM platform.payment_application WHERE order_id=?", Integer.class, order.orderId()));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM platform.organization_workspace WHERE registration_id=?", Integer.class, context.registrationId()));
        var start = jdbc.queryForObject("SELECT starts_at FROM platform.subscription_period WHERE order_id=?", java.sql.Timestamp.class, order.orderId());
        assertEquals(NOW.plusSeconds(2100), start.toInstant());
        assertEquals("READY", jdbc.queryForObject("SELECT setup_state FROM platform.organization_workspace WHERE registration_id=?", String.class, context.registrationId()));
        assertEquals("APPLIED", jdbc.queryForObject("SELECT state FROM platform.subscription_intent WHERE intent_id=?", String.class, order.intentId()));
    }

    @Test
    void mismatchedCurrencyCannotActivateAndLateReplacedPaymentIsAnException() {
        var context = registrant();
        var order = orders.create(context, command(UUID.randomUUID(), null), NOW);
        processing.record(observation(order, "PAID", 4_900_000L, "USD", "WEBHOOK"), NOW);
        processing.apply(order.orderId(), NOW);
        assertEquals("EXCEPTION", orders.find(order.orderId()).orElseThrow().paymentStatus());
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM platform.outbox_event WHERE aggregate_id=? AND event_type='SUBSCRIPTION_PAYMENT_CONFIRMED'",
                Integer.class, order.orderId()));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM platform.organization_workspace WHERE registration_id=?", Integer.class, context.registrationId()));
        var other = registrant();
        var old = orders.create(other, command(UUID.randomUUID(), null), NOW);
        processing.record(observation(old, "EXPIRED", 0L, null, "QUERY"), NOW.plusSeconds(1801));
        orders.create(other, command(UUID.randomUUID(), old.orderId()), NOW.plusSeconds(1802));
        processing.record(observation(old, "PAID", 4_900_000L, "VND", "WEBHOOK"), NOW.plusSeconds(1803));
        assertEquals("EXCEPTION", orders.find(old.orderId()).orElseThrow().paymentStatus());
        assertEquals("CONFLICTING_LATE_PAYMENT", orders.find(old.orderId()).orElseThrow().failureCode());
    }

    @Test
    void paidObservationSurvivesOlderUnpaidEventsAndPartialMoneyCannotBeForgotten() {
        var context = registrant();
        var order = orders.create(context, command(UUID.randomUUID(), null), NOW);
        processing.record(observation(order, "PAID", 4_900_000L, "VND", "WEBHOOK"), NOW);
        processing.record(observation(order, "EXPIRED", 0L, "VND", "QUERY"), NOW.plusSeconds(1));
        assertEquals("PAID", orders.find(order.orderId()).orElseThrow().paymentStatus());
        var partial = orders.create(registrant(), command(UUID.randomUUID(), null), NOW);
        processing.record(observation(partial, "UNDERPAID", 100L, "VND", "QUERY"), NOW);
        processing.record(observation(partial, "EXPIRED", 0L, "VND", "QUERY"), NOW.plusSeconds(1));
        assertEquals("PARTIAL", orders.find(partial.orderId()).orElseThrow().paymentStatus());
        assertEquals(100L, orders.find(partial.orderId()).orElseThrow().observedPaidAmount());
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM platform.outbox_event WHERE aggregate_id=? AND event_type='SUBSCRIPTION_PAYMENT_CONFIRMED'",
                Integer.class, partial.orderId()));
    }

    private static Observation observation(PaymentOrder order, String status, Long paid, String currency, String source) {
        String hash = java.util.HexFormat.of().formatHex(java.nio.ByteBuffer.allocate(32)
                .putLong(order.providerOrderCode()).putLong(status.hashCode()).putLong(paid).putLong(source.hashCode()).array());
        return new Observation(order.providerOrderCode(), "link-" + order.providerOrderCode(),
                "WEBHOOK".equals(source) ? paid : order.terms().priceVnd(), "QUERY".equals(source) ? paid : null,
                currency, status, "WEBHOOK".equals(source) ? "ref-" + order.providerOrderCode() : null,
                null, NOW, source, hash);
    }

    private static Command command(UUID key, UUID replacement) { return new Command(null, PLAN, VERSION, key, replacement); }

    private static Context registrant() {
        UUID account = UUID.randomUUID();
        UUID registration = UUID.randomUUID();
        String email = account + "@example.test";
        jdbc.update("INSERT INTO platform.account(account_id, identifier, normalized_identifier, password_hash) VALUES (?, ?, ?, ?)",
                account, email, email, "isolated-fixture-unusable-hash");
        jdbc.update("""
                INSERT INTO platform.organization_registration(registration_id, account_id, organization_name, workspace_slug,
                    admin_name, state, email_verified_at, completed_at, created_at, updated_at)
                VALUES (?, ?, 'Order Test Organization', ?, 'Order Test Administrator', 'REGISTERED', now(), now(), now(), now())
                """, registration, account, "order-" + registration);
        return new Context(new Actor(account, null, true, false, Set.of(), true), registration);
    }
}
