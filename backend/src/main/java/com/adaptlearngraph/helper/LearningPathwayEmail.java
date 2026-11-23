package com.adaptlearngraph.helper;

import java.util.LinkedHashMap;


/** Presentation of persisted pathway notifications; does not change in-app notification data. */
public final class LearningPathwayEmail {
    private LearningPathwayEmail() {}

    public static TransactionalEmail render(String kind, String body, String url) {
        String title;
        String introduction;
        String action;
        String guidance = "Sign in to view details.";
        switch (kind) {
            case "RULE_PATHWAY_APPROVED" -> {
                title = "Your pathway is approved";
                introduction = "Your learning pathway has been approved. Open it to review your learning activities and next steps.";
                action = "View my pathway";
            }
            case "RULE_PATHWAY_REJECTED" -> {
                title = "Your pathway needs revision";
                introduction = "Your learning pathway was not approved. Review the feedback before requesting approval again.";
                action = "Review my pathway";
            }
            case "RULE_PATHWAY_COMPLETED" -> {
                title = "Your pathway is complete";
                introduction = "All required steps in your learning pathway have been resolved.";
                action = "View completed pathway";
                guidance = "Required steps have been fulfilled or bypassed. Bypassed steps do not count as demonstrated competency.";
            }
            case "CERTIFICATE_APPROVED" -> {
                title = "Your certificate is approved";
                introduction = "Your submitted certificate has been approved for the requirement below.";
                action = "View certificate in pathway";
            }
            case "CERTIFICATE_REJECTED" -> {
                title = "Your certificate was not approved";
                introduction = "Review the feedback on your submitted certificate in your learning pathway.";
                action = "Review certificate feedback";
            }
            case "PATHWAY_RECALCULATED" -> {
                title = "Your pathway has been updated";
                introduction = "Your pathway has been recalculated to reflect the following additions.";
                action = "Review pathway updates";
                guidance = "These additions remain subject to approval and prerequisite requirements.";
            }
            case "BYPASS_PROVISION_ADDED" -> {
                title = "Supplementary learning is available";
                introduction = "Additional learning is available for a previously bypassed requirement.";
                action = "View supplementary learning";
                guidance = "This supplementary learning does not block your goal. Your original completion is retained.";
            }
            default -> throw new IllegalArgumentException("Unsupported pathway email kind");
        }
        var details = new LinkedHashMap<String, String>();
        int module = 0;
        int certificate = 0;
        for (String line : (body == null ? "" : body).split("\\R")) {
            int colon = line.indexOf(':');
            if (colon < 0) continue;
            String label = line.substring(0, colon).split(" / ", 2)[0].trim();
            String value = clean(line.substring(colon + 1));
            if (value.isBlank()) continue;
            switch (label) {
                case "Role" -> details.put("Learning pathway", value);
                case "Requirement" -> details.put("Requirement", value);
                case "Reason" -> details.put("Reviewer feedback", value);
                case "Module" -> details.put("Added module " + ++module, value);
                case "Certificate" -> details.put(kind.equals("PATHWAY_RECALCULATED")
                        ? "Added certificate " + ++certificate : "Certificate", value);
                case "Original gap" -> details.put("Original learning pathway", value);
                default -> { /* Internal IDs and notification bookkeeping are not email content. */ }
            }
        }
        if (body != null && body.contains("Includes bypass-related provision")) {
            guidance += " Some additions relate to previously bypassed requirements.";
        }
        return TransactionalEmail.renderLearning(title, introduction, details, action, url, guidance);
    }

    private static String clean(String value) {
        return value
                .replaceAll("\\s*\\[[^\\]]*]", "")
                .replaceAll("\\s*·\\s*(?:Skill v|step |bypass ).*$", "")
                .replaceAll("(?i)(?:cert-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "")
                .replaceAll("\\s*·\\s*$", "")
                .replace("REQUIRED", "Required").replace("OPTIONAL", "Optional")
                .replace("INTERMEDIATE", "Intermediate").replace("ADVANCED", "Advanced")
                .replace("BEGINNER", "Beginner").replace("FOUNDATIONAL", "Foundational")
                .trim();
    }
}
