package com.adaptlearngraph.subscription.domain;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class SubscriptionPlanTest {
    @Test
    void retainsEveryApprovedCommercialField() {
        var terms = new PlanTerms(" Starter ", " Organization workspace subscription for up to 20 Employee seats. ",
                4_900_000, "VND", 1, 20);
        assertEquals("Starter", terms.name());
        assertEquals("Organization workspace subscription for up to 20 Employee seats.", terms.description());
        assertEquals(4_900_000L, terms.priceVnd());
        assertEquals("VND", terms.currency());
        assertEquals(1, terms.durationMonths());
        assertEquals(20, terms.employeeSeats());
    }

    @Test
    void rejectsUnsupportedCurrencyMissingTextAndInvalidNumbers() {
        assertThrows(SubscriptionFailure.class, () -> new PlanTerms("Starter", "Description", 1, "USD", 1, 1));
        assertThrows(SubscriptionFailure.class, () -> new PlanTerms(null, "Description", 1, "VND", 1, 1));
        assertThrows(SubscriptionFailure.class, () -> new PlanTerms("Starter", " ", 1, "VND", 1, 1));
        assertThrows(SubscriptionFailure.class, () -> new PlanTerms("Starter", "Description", 0, "VND", 1, 1));
        assertThrows(SubscriptionFailure.class, () -> new PlanTerms("Starter", "Description", Long.MAX_VALUE, "VND", 1, 1));
        assertThrows(SubscriptionFailure.class, () -> new PlanTerms("Starter", "Description", 1, "VND", 0, 1));
        assertThrows(SubscriptionFailure.class, () -> new PlanTerms("Starter", "Description", 1, "VND", 1, 0));
    }

    @Test
    void preservesJanuaryAnniversaryAcrossLeapAndNonLeapFebruary() {
        for (int year : new int[] {2024, 2025}) {
            var january = Instant.parse(year + "-01-31T02:00:00Z");
            var february = BillingCalendar.endOfPeriod(january, 1, 31);
            assertEquals(Instant.parse(year + (year == 2024 ? "-02-29" : "-02-28") + "T02:00:00Z"), february);
            assertEquals(Instant.parse(year + "-03-31T02:00:00Z"), BillingCalendar.endOfPeriod(february, 1, 31));
        }
    }

    @Test
    void usesVietnamCalendarAndExclusiveEnd() {
        var start = Instant.parse("2026-01-30T18:00:00Z");
        assertEquals(31, BillingCalendar.anniversaryDay(start));
        var end = BillingCalendar.endOfPeriod(start, 1, 31);
        assertEquals(Instant.parse("2026-02-27T18:00:00Z"), end);
        assertTrue(BillingCalendar.contains(start, end, start));
        assertTrue(BillingCalendar.contains(start, end, end.minusNanos(1)));
        assertFalse(BillingCalendar.contains(start, end, end));
        assertFalse(BillingCalendar.contains(start, end, start.minusNanos(1)));
        assertFalse(BillingCalendar.contains(null, null, start));
    }

    @Test
    void rejectsUnrepresentableBillingDates() {
        assertThrows(SubscriptionFailure.class, () ->
                BillingCalendar.endOfPeriod(Instant.parse("2026-01-01T00:00:00Z"), Integer.MAX_VALUE, 1));
        assertThrows(SubscriptionFailure.class, () ->
                BillingCalendar.endOfPeriod(Instant.parse("2026-01-01T00:00:00Z"), 1, 0));
    }
}
