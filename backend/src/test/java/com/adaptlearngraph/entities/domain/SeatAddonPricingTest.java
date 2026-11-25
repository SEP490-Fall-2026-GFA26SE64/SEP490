package com.adaptlearngraph.entities.domain;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class SeatAddonPricingTest {
    private static final Instant START = Instant.parse("2026-01-01T00:00:00Z");
    private static final Instant END = Instant.parse("2026-01-31T00:00:00Z");

    @Test
    void fullPeriodPriceDividesThePlanPriceBySeatsAndRoundsUp() {
        assertEquals(245, SeatAddonPricing.perSeat(4_900, 20));
        assertEquals(735, SeatAddonPricing.fullPeriod(4_900, 20, 3));
        assertEquals(334, SeatAddonPricing.perSeat(1_000, 3));
        assertEquals(1_000, SeatAddonPricing.fullPeriod(1_000, 3, 3));
    }

    @Test
    void currentPeriodPriceIsProratedByRemainingTimeRoundedUpAndNeverZero() {
        assertEquals(735, SeatAddonPricing.prorated(4_900, 20, 3, START, END, START));
        assertEquals(368, SeatAddonPricing.prorated(4_900, 20, 3, START, END, Instant.parse("2026-01-16T00:00:00Z")));
        assertEquals(1, SeatAddonPricing.prorated(4_900, 20, 1, START, END, END.minusSeconds(1)));
        assertThrows(IllegalArgumentException.class, () -> SeatAddonPricing.prorated(4_900, 20, 1, START, END, END));
    }

    @Test
    void quantityIsLimitedToOneThroughFiftySeats() {
        assertFalse(SeatAddonPricing.validQuantity(0));
        assertTrue(SeatAddonPricing.validQuantity(1));
        assertTrue(SeatAddonPricing.validQuantity(50));
        assertFalse(SeatAddonPricing.validQuantity(51));
    }
}
