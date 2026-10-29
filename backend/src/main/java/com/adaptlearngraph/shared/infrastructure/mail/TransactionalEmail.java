package com.adaptlearngraph.shared.infrastructure.mail;

import java.util.Map;

public record TransactionalEmail(String subject, String text, String html) {
    public static TransactionalEmail render(String subject, String introduction, String code,
            Map<String, String> details, String actionLabel, String actionUrl, String guidance) {
        StringBuilder plain = new StringBuilder(introduction).append("\n\n");
        StringBuilder body = new StringBuilder("<p style=\"margin:0 0 24px;color:rgb(71,85,105);line-height:1.7\">")
                .append(escape(introduction)).append("</p>");
        if (code != null) {
            plain.append("Your verification code is: ").append(code).append("\n\n");
            body.append("<div style=\"padding:24px;text-align:center;border:1px solid rgb(226,232,240);")
                    .append("background:rgb(248,250,252);border-radius:12px;font:700 32px monospace;letter-spacing:8px\">")
                    .append(escape(code)).append("</div>");
        }
        if (!details.isEmpty()) {
            body.append("<table role=\"presentation\" style=\"width:100%;border-collapse:collapse;margin:24px 0\">");
            details.forEach((label, value) -> {
                plain.append(label).append(": ").append(value).append('\n');
                body.append("<tr><td style=\"padding:12px 0;border-bottom:1px solid rgb(226,232,240);color:rgb(71,85,105)\">")
                        .append(escape(label)).append("</td><td style=\"padding:12px 0 12px 16px;text-align:right;")
                        .append("border-bottom:1px solid rgb(226,232,240);font-weight:600\">")
                        .append(escape(value)).append("</td></tr>");
            });
            body.append("</table>");
        }
        if (actionUrl != null) {
            var uri = java.net.URI.create(actionUrl);
            if (!java.util.Set.of("http", "https").contains(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null) {
                throw new IllegalArgumentException("Email action must be an HTTP(S) URL without credentials.");
            }
            plain.append('\n').append(actionLabel).append(": ").append(actionUrl).append('\n');
            body.append("<p style=\"margin:28px 0\"><a style=\"display:inline-block;padding:14px 24px;border-radius:8px;")
                    .append("background:rgb(194,65,12);color:white;text-decoration:none;font-weight:600\" href=\"")
                    .append(escape(actionUrl)).append("\">").append(escape(actionLabel)).append("</a></p>")
                    .append("<p style=\"font-size:12px;line-height:1.6;word-break:break-all;color:rgb(71,85,105)\">")
                    .append("If the button does not work, open: <a href=\"").append(escape(actionUrl)).append("\">")
                    .append(escape(actionUrl)).append("</a></p>");
        }
        plain.append("\n").append(guidance).append("\n\nAdapt-Learn-Graph\nThis is an automated service notification.");
        body.append("<p style=\"margin:24px 0 0;font-size:13px;line-height:1.7;color:rgb(71,85,105)\">")
                .append(escape(guidance)).append("</p>");
        String html = """
                <!doctype html><html lang="en"><head><meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1"></head>
                <body style="margin:0;background:rgb(248,250,252);color:rgb(15,23,42);font:15px Arial,Helvetica,sans-serif">
                <div style="display:none;max-height:0;overflow:hidden">%s</div>
                <table role="presentation" style="width:100%%;border-collapse:collapse"><tr><td style="padding:32px 16px" align="center">
                <table role="presentation" style="width:100%%;max-width:600px;border:1px solid rgb(226,232,240);border-radius:16px;background:white;border-spacing:0">
                <tr><td style="padding:24px 28px;border-bottom:1px solid rgb(226,232,240)">
                <img src="cid:alg-brand-logo" width="198" height="44" alt="Adapt-Learn-Graph"
                  style="display:block;width:198px;max-width:100%%;height:auto;border:0">
                <div style="margin-top:6px;color:rgb(71,85,105);font-size:12px">Your organization's learning workspace</div></td></tr>
                <tr><td style="padding:28px"><h1 style="margin:0 0 20px;font-size:24px;line-height:1.3">%s</h1>%s</td></tr>
                <tr><td style="padding:20px 28px;border-top:1px solid rgb(226,232,240);font-size:12px;line-height:1.6;color:rgb(71,85,105)">
                This is an automated service notification from Adapt-Learn-Graph.<br>
                Keep account codes and activation links private. We will never ask you to share them.</td></tr>
                </table></td></tr></table></body></html>
                """.formatted(escape(introduction), escape(subject), body);
        return new TransactionalEmail(subject, plain.toString(), html);
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
