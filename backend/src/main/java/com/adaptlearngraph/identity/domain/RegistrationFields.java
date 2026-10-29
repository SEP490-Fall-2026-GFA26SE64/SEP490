package com.adaptlearngraph.identity.domain;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

public record RegistrationFields(
        String organizationName, String subdomain, String industry, String headcount,
        String adminName, String adminEmail) {
    public static final Set<String> INDUSTRIES = Set.of(
            "Software Engineering & AI", "Cloud Infrastructure & DevOps",
            "Data Engineering & Analytics", "Cybersecurity & Network Systems",
            "Enterprise Financial Technology");
    public static final Set<String> HEADCOUNTS = Set.of(
            "1 - 20 employees", "21 - 50 employees", "51 - 200 employees", "200+ employees");
    private static final Set<String> RESERVED = Set.of(
            "admin", "api", "app", "auth", "guest", "login", "mail", "platform", "register", "system", "www");
    private static final Pattern SLUG = Pattern.compile("[a-z0-9][a-z0-9-]{1,61}[a-z0-9]");
    private static final Pattern EMAIL = Pattern.compile(
            "[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@"
                    + "[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
                    + "(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+");

    public RegistrationFields {
        organizationName = required(organizationName, "organizationName", 200);
        adminName = required(adminName, "adminName", 120);
        adminEmail = normalizeEmail(adminEmail);
        if (adminEmail.length() > 254 || !EMAIL.matcher(adminEmail).matches()
                || adminEmail.indexOf('@') > 64) {
            throw RegistrationFailure.invalid("adminEmail", "Enter a valid email address (maximum 254 characters).");
        }
        industry = choice(industry, INDUSTRIES, "industry");
        headcount = choice(headcount, HEADCOUNTS, "headcount");
        subdomain = subdomain == null || subdomain.isBlank() ? null : subdomain.strip().toLowerCase(Locale.ROOT);
        if (subdomain != null && (!SLUG.matcher(subdomain).matches() || RESERVED.contains(subdomain))) {
            throw RegistrationFailure.invalid("subdomain",
                    "Use 3-63 lowercase letters, digits and internal hyphens, excluding reserved names.");
        }
    }

    public static String normalizeEmail(String email) {
        return email == null ? "" : email.strip().toLowerCase(Locale.ROOT);
    }

    public static void validatePassword(String password) {
        if (password == null || password.codePointCount(0, password.length()) < 12
                || password.codePointCount(0, password.length()) > 128) {
            throw RegistrationFailure.invalid("password", "Use a password with 12-128 characters.");
        }
    }

    public String generatedSlug(String suffix) {
        if (suffix == null || !suffix.matches("[a-z0-9]{6}")) {
            throw new IllegalArgumentException("A six-character random slug suffix is required");
        }
        String stem = Normalizer.normalize(organizationName, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        if (stem.isEmpty()) stem = "workspace";
        if (stem.length() > 56) stem = stem.substring(0, 56).replaceAll("-+$", "");
        return stem + "-" + suffix;
    }

    private static String required(String value, String field, int maximum) {
        if (value == null || value.isBlank() || value.strip().length() > maximum) {
            throw RegistrationFailure.invalid(field, "This field is required (maximum " + maximum + " characters).");
        }
        return value.strip();
    }

    private static String choice(String value, Set<String> choices, String field) {
        if (value == null || value.isBlank()) return null;
        if (!choices.contains(value)) throw RegistrationFailure.invalid(field, "Choose one of the available options.");
        return value;
    }
}
