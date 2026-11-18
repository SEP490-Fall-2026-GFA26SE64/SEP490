package com.adaptlearngraph.services;

/** Delivery result of a certificate command; the web layer never sees the storage receipt. */
public record CertificateHttpReceipt(int status,String responseJson) {
    static CertificateHttpReceipt from(com.adaptlearngraph.repository.InitialPathwayPorts.Receipt receipt) {
        return new CertificateHttpReceipt(receipt.status(),receipt.responseJson());
    }
}
