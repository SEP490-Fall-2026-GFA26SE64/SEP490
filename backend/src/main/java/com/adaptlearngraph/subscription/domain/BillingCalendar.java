package com.adaptlearngraph.subscription.domain;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Objects;

public final class BillingCalendar {
    public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private BillingCalendar() {}

    public static int anniversaryDay(Instant start) {
        return Objects.requireNonNull(start, "start").atZone(ZONE).getDayOfMonth();
    }

    public static Instant endOfPeriod(Instant start, int months, int anniversaryDay) {
        Objects.requireNonNull(start, "start");
        if (months <= 0 || anniversaryDay < 1 || anniversaryDay > 31) {
            throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT,
                    "A positive month duration and valid anniversary day are required.", "durationMonths");
        }
        try {
            var localStart = start.atZone(ZONE);
            var month = YearMonth.from(localStart).plusMonths(months);
            if (month.getYear() > 9999) {
                throw new DateTimeException("Period exceeds supported timestamp representation");
            }
            var date = month.atDay(Math.min(anniversaryDay, month.lengthOfMonth()));
            return LocalDateTime.of(date, localStart.toLocalTime()).atZone(ZONE).toInstant();
        } catch (DateTimeException | ArithmeticException invalidDate) {
            throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT,
                    "Duration exceeds the supported billing-date range.", "durationMonths");
        }
    }

    public static boolean contains(Instant start, Instant end, Instant now) {
        return start != null && end != null && !now.isBefore(start) && now.isBefore(end);
    }
}
