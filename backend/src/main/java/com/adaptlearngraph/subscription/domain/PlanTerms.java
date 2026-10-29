package com.adaptlearngraph.subscription.domain;

public record PlanTerms(
        String name,
        String description,
        long priceVnd,
        String currency,
        int durationMonths,
        int employeeSeats) {

    public PlanTerms {
        name = required(name, "name");
        description = required(description, "description");
        if (!"VND".equals(currency)) {
            throw invalid("currency", "Only VND subscription prices are supported.");
        }
        if (priceVnd <= 0 || priceVnd > 9_007_199_254_740_991L) {
            throw invalid("priceVnd", "Enter a positive, exactly representable whole VND amount.");
        }
        if (durationMonths <= 0) {
            throw invalid("durationMonths", "Duration must be a positive number of calendar months.");
        }
        if (employeeSeats <= 0) {
            throw invalid("employeeSeats", "Employee-seat allocation must be a positive whole number.");
        }
    }

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw invalid(field, "This field is required.");
        }
        return value.strip();
    }

    private static SubscriptionFailure invalid(String field, String message) {
        return new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT, message, field);
    }
}
