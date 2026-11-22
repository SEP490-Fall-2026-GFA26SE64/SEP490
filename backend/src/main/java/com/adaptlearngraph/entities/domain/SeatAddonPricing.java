package com.adaptlearngraph.entities.domain;

import java.math.BigInteger;
import java.time.Duration;
import java.time.Instant;

/**
 * Prices additional Employee seats from the period's plan terms: the per-seat price is the plan price divided by
 * its included seats, prorated by the remaining period time for the current period and rounded up to whole VND.
 */
public final class SeatAddonPricing {
    public static final int MIN_SEATS = 1;
    public static final int MAX_SEATS = 50;

    private SeatAddonPricing() {}

    public static boolean validQuantity(int seats) {
        return seats >= MIN_SEATS && seats <= MAX_SEATS;
    }

    /** Per-seat price for one full period, rounded up to whole VND. */
    public static long perSeat(long planPriceVnd, int planSeats) {
        return fullPeriod(planPriceVnd, planSeats, 1);
    }

    public static long fullPeriod(long planPriceVnd, int planSeats, int seats) {
        requireTerms(planPriceVnd, planSeats, seats);
        return ceil(BigInteger.valueOf(planPriceVnd).multiply(BigInteger.valueOf(seats)), BigInteger.valueOf(planSeats));
    }

    /** Price for the rest of [startsAt, endsAt) as of {@code now}; at least 1 VND while the period is open. */
    public static long prorated(long planPriceVnd, int planSeats, int seats, Instant startsAt, Instant endsAt, Instant now) {
        requireTerms(planPriceVnd, planSeats, seats);
        if (!endsAt.isAfter(startsAt)) throw new IllegalArgumentException("Invalid period.");
        if (!endsAt.isAfter(now)) throw new IllegalArgumentException("The period has ended.");
        Instant from = now.isBefore(startsAt) ? startsAt : now;
        long remaining = Duration.between(from, endsAt).getSeconds();
        long total = Duration.between(startsAt, endsAt).getSeconds();
        long amount = ceil(BigInteger.valueOf(planPriceVnd).multiply(BigInteger.valueOf(seats)).multiply(BigInteger.valueOf(remaining)),
                BigInteger.valueOf(planSeats).multiply(BigInteger.valueOf(total)));
        return Math.max(1L, amount);
    }

    private static void requireTerms(long planPriceVnd, int planSeats, int seats) {
        if (planPriceVnd <= 0 || planSeats <= 0 || seats < 0) throw new IllegalArgumentException("Invalid seat price terms.");
    }

    private static long ceil(BigInteger numerator, BigInteger denominator) {
        var division = numerator.divideAndRemainder(denominator);
        return (division[1].signum() == 0 ? division[0] : division[0].add(BigInteger.ONE)).longValueExact();
    }
}
