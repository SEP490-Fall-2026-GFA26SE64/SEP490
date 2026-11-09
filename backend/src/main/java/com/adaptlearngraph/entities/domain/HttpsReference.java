package com.adaptlearngraph.entities.domain;

import java.net.URI;

/** Syntax validation only. References are never fetched by the server. */
public final class HttpsReference {
    private HttpsReference() {}
    public static String require(String value) {
        if(value==null || value.isBlank() || value.length()>2048 || value.chars().anyMatch(Character::isWhitespace))throw new IllegalArgumentException("A valid HTTPS URL is required");
        try {
            var uri=new URI(value);
            if(!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost()==null || uri.getHost().isBlank() || uri.getRawUserInfo()!=null)
                throw new IllegalArgumentException("A valid HTTPS URL without credentials is required");
            return "https"+value.substring(5);
        }catch(java.net.URISyntaxException invalid){throw new IllegalArgumentException("A valid HTTPS URL is required");}
    }
}
