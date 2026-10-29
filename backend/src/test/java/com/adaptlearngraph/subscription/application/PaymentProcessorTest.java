package com.adaptlearngraph.subscription.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.adaptlearngraph.subscription.application.port.out.PaymentGateway;
import com.adaptlearngraph.subscription.application.port.out.PaymentProcessingStore;
import com.adaptlearngraph.subscription.domain.PaymentOrder;
import com.adaptlearngraph.subscription.domain.PlanTerms;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PaymentProcessorTest {
    private final PaymentGateway gateway=mock(PaymentGateway.class);
    private final PaymentProcessingStore store=mock(PaymentProcessingStore.class);
    private final Instant now=Instant.parse("2026-10-23T04:00:00Z");
    private final PaymentProcessor processor=new PaymentProcessor(store,gateway,Clock.fixed(now,ZoneOffset.UTC),"https://example.test");
    private PaymentOrder order(Instant expiry) {
        return new PaymentOrder(UUID.randomUUID(),UUID.randomUUID(),"PURCHASE",UUID.randomUUID(),null,UUID.randomUUID(),
                UUID.randomUUID(),UUID.randomUUID(),new PlanTerms("Starter","Description",4900000,"VND",1,20),
                123,"UNKNOWN",null,null,null,now.minusSeconds(10),expiry,null,null,1);
    }
    @Test
    void uncertaintyDoesNotCreateAnotherProviderOrder() {
        var order=order(now.plusSeconds(1800));
        var work=new PaymentProcessingStore.Work(UUID.randomUUID(),"lease","PAYMENT_CREATE",1,order);
        when(store.claim(now)).thenReturn(Optional.of(work));
        when(gateway.query(123,null,null)).thenThrow(new SubscriptionFailure(SubscriptionFailure.Code.PROVIDER_UNAVAILABLE,"Unknown"));
        assertTrue(processor.processNext());
        verify(gateway,never()).create(any());
        verify(store).retry(work,"PROVIDER_UNAVAILABLE",now);
        verify(store,never()).finish(any(),any());
    }
    @Test
    void trustedNotFoundRetriesSameCodeOnlyBeforeOriginalExpiry() {
        var order=order(now.plusSeconds(1800));
        var work=new PaymentProcessingStore.Work(UUID.randomUUID(),"lease","PAYMENT_CREATE",2,order);
        when(store.claim(now)).thenReturn(Optional.of(work));
        when(gateway.query(123,null,null)).thenReturn(Optional.empty());
        var result=new PaymentGateway.Observation(123,"link",4900000L,null,"VND","PENDING",null,"https://pay.payos.vn/web/link",null,"CREATE","a".repeat(64));
        when(gateway.create(any())).thenReturn(result);
        processor.processNext();
        verify(gateway).create(argThat(request->request.orderCode()==123 && request.expiresAt().equals(order.expiresAt())
                && request.planName().equals("Starter")
                && request.returnUrl().equals("https://example.test/guest/payment-result?order="+order.orderId())));
        verify(store).record(result,now);
        verify(store).finish(work,now);
    }
    @Test
    void localExpiryDoesNotFabricateTerminalUnpaidState() {
        var order=order(now);
        var work=new PaymentProcessingStore.Work(UUID.randomUUID(),"lease","PAYMENT_CREATE",2,order);
        when(store.claim(now)).thenReturn(Optional.of(work));
        when(gateway.query(123,null,null)).thenReturn(Optional.empty());
        processor.processNext();
        verify(gateway,never()).create(any());
        verify(store,never()).record(any(),any());
        verify(store).retry(work,"PROVIDER_UNAVAILABLE",now);
    }
}
