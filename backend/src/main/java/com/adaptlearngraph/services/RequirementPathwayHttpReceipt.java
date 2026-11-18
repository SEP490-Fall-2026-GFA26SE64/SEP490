package com.adaptlearngraph.services;

/** HTTP command result without exposing the persistence receipt to controllers. */
public record RequirementPathwayHttpReceipt(int status, String responseJson) {
    static RequirementPathwayHttpReceipt from(com.adaptlearngraph.repository.InitialPathwayPorts.Receipt receipt) {
        return new RequirementPathwayHttpReceipt(receipt.status(), receipt.responseJson());
    }
}
